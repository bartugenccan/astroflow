import { createHash } from 'crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { InterpretationKind } from '../../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AI_TEXT_PROVIDER, AiTextProvider } from '../ai/ai-text-provider';
import { Locale } from '../astrology/interpretation.types';
import { ElectionCheckDto, ElectionSearchDto, ElectionBaseDto } from './dto/election.dto';
import { ELECTION_PROFILES, matchEventByKeywords } from './election.events';
import { ElectionScoringService, addDays } from './election-scoring.service';
import {
  ELECTION_EVENT_IDS,
  ElectionCheck,
  ElectionCheckReading,
  ElectionEventId,
  ElectionEventRef,
  ElectionSearch,
  ElectionSearchReading,
} from './election.types';
import {
  electionCheckPrompt,
  electionClassifyPrompt,
  electionSearchPrompt,
  electionSystemPrompt,
} from './prompts/election.prompts';
import { electionCheckStub, electionSearchStub } from './prompts/election.stubs';
import { safeError } from '../../common/logging/safe-error';
import { trackAiCalls } from '../../common/ai/ai-call-tracker';

/** Bump when election prompts change so cached readings regenerate. */
const ELECTION_CACHE_VERSION = 'e2';
/** How far ahead a single date may be checked. */
const MAX_YEARS_AHEAD = 3;
/** Longest search window, in months. */
const MAX_SEARCH_MONTHS = 12;
/** Computed results kept in memory, so the reading call reuses the compute call's work. */
const MEMO_LIMIT = 100;
/** Free-text → event classifications kept in memory (oldest evicted first). */
const CLASSIFIED_LIMIT = 500;

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

@Injectable()
export class ElectionService {
  private readonly logger = new Logger(ElectionService.name);
  private readonly memo = new Map<string, Promise<unknown>>();
  private readonly classified = new Map<string, ElectionEventId>();

  constructor(
    @Inject(AI_TEXT_PROVIDER) private readonly ai: AiTextProvider,
    private readonly prisma: PrismaService,
    private readonly scoring: ElectionScoringService,
  ) {}

  // ── Compute ─────────────────────────────────────────────────────────────────

  /** Is this date good for this event — and when that day, and what nearby is better. */
  check(dto: ElectionCheckDto, locale: Locale): Promise<ElectionCheck> {
    const today = this.today();
    if (dto.date < addDays(today, -1)) throw new BadRequestException('date must be today or later');
    if (dto.date > addDays(today, MAX_YEARS_AHEAD * 366)) {
      throw new BadRequestException(`date must be within ${MAX_YEARS_AHEAD} years`);
    }
    return this.memoize(`check|${locale}|${this.requestKey(dto)}|${dto.date}`, async () => {
      const event = await this.resolveEvent(dto, locale);
      const ctx = this.scoring.context(dto, dto.place, ELECTION_PROFILES[event.id], locale);
      const { day, hours, alternatives } = this.scoring.check(ctx, dto.date, today);
      return { ...day, event, place: dto.place, hours, alternatives };
    });
  }

  /** The best dates for this event between two months (inclusive), up to a year. */
  search(dto: ElectionSearchDto, locale: Locale): Promise<ElectionSearch> {
    const today = this.today();
    const first = `${dto.from}-01`;
    const last = this.lastDayOfMonth(dto.to);
    if (last < first) throw new BadRequestException('to must not be before from');
    if (this.monthsBetween(dto.from, dto.to) >= MAX_SEARCH_MONTHS) {
      throw new BadRequestException(`search window is at most ${MAX_SEARCH_MONTHS} months`);
    }
    if (last < today) throw new BadRequestException('search window is in the past');
    const from = first < today ? today : first;

    return this.memoize(`search|${locale}|${this.requestKey(dto)}|${from}|${last}`, async () => {
      const event = await this.resolveEvent(dto, locale);
      const ctx = this.scoring.context(dto, dto.place, ELECTION_PROFILES[event.id], locale);
      const result = this.scoring.search(ctx, from, last);
      return { event, place: dto.place, from, to: last, ...result };
    });
  }

  // ── Readings (AI) ───────────────────────────────────────────────────────────

  async checkReading(dto: ElectionCheckDto, locale: Locale): Promise<ElectionCheckReading> {
    const result = await this.check(dto, locale);
    const rawKey = `election-check|${result.event.id}|${this.requestKey(dto)}|${dto.date}`;
    return this.cached('ELECTION_CHECK', locale, rawKey, async () => {
      const stub = electionCheckStub(locale, result);
      if (!this.ai.available) return stub;
      try {
        const { user, schemaHint } = electionCheckPrompt(locale, result);
        const p = await this.ai.generateJson<Record<string, unknown>>({
          system: electionSystemPrompt(locale),
          user,
          schemaHint,
          temperature: 0.7,
          maxTokens: 2400,
        });
        return {
          summary: str(p.summary, 600) || stub.summary,
          why: str(p.why, 1800) || stub.why,
          advice: str(p.advice, 1200) || stub.advice,
          caution: str(p.caution, 800) || stub.caution,
        };
      } catch (err) {
        this.logger.warn(`election check AI failed: ${safeError(err)}`);
        return stub;
      }
    });
  }

  async searchReading(dto: ElectionSearchDto, locale: Locale): Promise<ElectionSearchReading> {
    const result = await this.search(dto, locale);
    const rawKey = `election-search|${result.event.id}|${this.requestKey(dto)}|${result.from}|${result.to}`;
    return this.cached('ELECTION_SEARCH', locale, rawKey, async () => {
      const stub = electionSearchStub(locale, result);
      if (!this.ai.available) return stub;
      try {
        const { user, schemaHint } = electionSearchPrompt(locale, result);
        const p = await this.ai.generateJson<Record<string, unknown>>({
          system: electionSystemPrompt(locale),
          user,
          schemaHint,
          temperature: 0.7,
          maxTokens: 1800,
        });
        const tips = Array.isArray(p.tips) ? p.tips.map((t) => str(t, 220)).filter(Boolean).slice(0, 3) : [];
        return {
          summary: str(p.summary, 1600) || stub.summary,
          tips: tips.length === 3 ? tips : stub.tips,
        };
      } catch (err) {
        this.logger.warn(`election search AI failed: ${safeError(err)}`);
        return stub;
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** A picked event is used as is; typed text goes to the AI classifier, then keywords, then "new beginning". */
  private async resolveEvent(dto: ElectionBaseDto, locale: Locale): Promise<ElectionEventRef> {
    const text = dto.eventText?.trim();
    if (dto.eventId) {
      return { id: dto.eventId, label: ELECTION_PROFILES[dto.eventId].name[locale], fromText: text || undefined };
    }
    if (!text) throw new BadRequestException('eventId or eventText is required');

    const key = text.toLocaleLowerCase('tr-TR');
    let id = this.classified.get(key);
    if (!id && this.ai.available) {
      try {
        const { user, schemaHint } = electionClassifyPrompt(text);
        const p = await this.ai.generateJson<{ eventId?: string }>({ system: '', user, schemaHint, temperature: 0, maxTokens: 300 });
        if (p.eventId && (ELECTION_EVENT_IDS as readonly string[]).includes(p.eventId)) id = p.eventId as ElectionEventId;
      } catch (err) {
        this.logger.warn(`election classify failed: ${safeError(err)}`);
      }
    }
    id = id ?? matchEventByKeywords(text) ?? 'new_beginning';
    this.classified.set(key, id);
    if (this.classified.size > CLASSIFIED_LIMIT) {
      this.classified.delete(this.classified.keys().next().value as string);
    }
    return { id, label: ELECTION_PROFILES[id].name[locale], fromText: text };
  }

  /** Everything the computed result depends on, except the dates. */
  private requestKey(dto: ElectionBaseDto): string {
    const birth = `${dto.birthDate}|${dto.unknownTime ? '12:00' : dto.birthTime}|${dto.latitude}|${dto.longitude}`;
    const event = dto.eventId ?? `text:${dto.eventText?.trim().toLocaleLowerCase('tr-TR') ?? ''}`;
    const place = `${dto.place.latitude.toFixed(3)},${dto.place.longitude.toFixed(3)}`;
    return this.hash(`${birth}|${event}|${place}`).slice(0, 24);
  }

  private memoize<T>(key: string, build: () => Promise<T>): Promise<T> {
    const hit = this.memo.get(key) as Promise<T> | undefined;
    if (hit) return hit;
    const promise = build().catch((err) => {
      this.memo.delete(key);
      throw err;
    });
    this.memo.set(key, promise);
    if (this.memo.size > MEMO_LIMIT) this.memo.delete(this.memo.keys().next().value as string);
    return promise;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private lastDayOfMonth(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  }

  private monthsBetween(a: string, b: string): number {
    const [ya, ma] = a.split('-').map(Number);
    const [yb, mb] = b.split('-').map(Number);
    return (yb - ya) * 12 + (mb - ma);
  }

  private hash(s: string): string {
    return createHash('sha256').update(s).digest('hex');
  }

  private async cached<T>(
    kind: InterpretationKind,
    locale: Locale,
    rawKey: string,
    build: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = this.hash(`${ELECTION_CACHE_VERSION}|${locale}|${rawKey}`);
    try {
      const hit = await this.prisma.interpretation.findUnique({ where: { cacheKey } });
      if (hit) return hit.content as T;
    } catch (err) {
      this.logger.warn(`election cache read failed: ${safeError(err)}`);
    }

    // No key: the result is templated text — serve it, never store it.
    if (!this.ai.available) return build();
    const { value: content, failed } = await trackAiCalls(build);
    // An AI call failed while building, so (part of) this is stub text: serve, don't cache.
    if (failed) return content;

    try {
      await this.prisma.interpretation.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          kind,
          locale,
          content: content as object,
          model: this.ai.model,
        },
        update: {},
      });
    } catch (err) {
      this.logger.warn(`election cache write failed: ${safeError(err)}`);
    }
    return content;
  }
}
