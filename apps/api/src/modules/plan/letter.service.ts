import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { localToday } from '../../common/context/request-context';
import { safeError } from '../../common/logging/safe-error';
import { AI_TEXT_PROVIDER, AiTextProvider } from '../ai/ai-text-provider';
import type { Locale } from '../astrology/interpretation.types';
import { ABILITIES, isoWeek, shiftDays } from '../mascot/mascot-rules';
import { DeviceSkyService } from './device-sky.service';
import { AsterLetterBody, LetterFacts, letterPrompt, letterStub, letterSystem } from './letter.prompts';

const LETTER_STAGE = ABILITIES.find((a) => a.key === 'weeklyLetter')?.minStage ?? 4;

export interface AsterLetterView extends AsterLetterBody {
  week: string;
  createdAt: string;
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Aster's weekly letter (stage 4 ability). Written the first time it is read
 * in an ISO week and stored, so every later read that week returns the same
 * letter and the AI is paid once. No cron: the week resolves on read.
 */
@Injectable()
export class LetterService {
  private readonly logger = new Logger(LetterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sky: DeviceSkyService,
    @Inject(AI_TEXT_PROVIDER) private readonly ai: AiTextProvider,
  ) {}

  async thisWeek(deviceId: string, locale: Locale): Promise<AsterLetterView> {
    const state = await this.prisma.mascotState.findUnique({ where: { deviceId }, select: { stage: true } });
    if ((state?.stage ?? 0) < LETTER_STAGE) {
      throw new ForbiddenException('The weekly letter opens when Aster becomes a Constellation');
    }
    const today = localToday();
    const week = isoWeek(today);
    const existing = await this.prisma.asterLetter.findUnique({ where: { deviceId_week: { deviceId, week } } });
    if (existing) return this.view(existing);

    const facts = await this.facts(deviceId, today, week);
    const body = await this.write(locale, facts);
    // Two first reads racing: the unique key keeps one, the other reads it back.
    const row = await this.prisma.asterLetter
      .create({ data: { deviceId, week, body: body as object } })
      .catch(() => this.prisma.asterLetter.findUniqueOrThrow({ where: { deviceId_week: { deviceId, week } } }));
    return this.view(row);
  }

  private view(row: { week: string; body: unknown; createdAt: Date }): AsterLetterView {
    const b = (row.body ?? {}) as Partial<AsterLetterBody>;
    return {
      week: row.week,
      greeting: b.greeting ?? '',
      body: b.body ?? '',
      highlight: b.highlight ?? '',
      ahead: b.ahead ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** The last seven local days, ending today. */
  private async facts(deviceId: string, today: string, week: string): Promise<LetterFacts> {
    const days = Array.from({ length: 7 }, (_, i) => shiftDays(today, -i));
    const [events, manifests, signs] = await Promise.all([
      this.prisma.mascotEvent.findMany({
        where: { deviceId, localDate: { in: days } },
        select: { kind: true, localDate: true },
      }),
      this.prisma.intention.findMany({
        where: { deviceId, status: 'active' },
        select: { goalText: true },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.intentionSign.findMany({
        where: { deviceId, localDate: { in: days } },
        select: { text: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;

    let transits: string[] = [];
    try {
      const birth = await this.sky.birth(deviceId);
      if (birth) {
        transits = DeviceSkyService.transits(this.sky.report(birth))
          .slice(0, 2)
          .map((t) => `${t.transitPlanet} ${t.aspect.toLowerCase()} natal ${t.natalPlanet}`);
      }
    } catch (err) {
      this.logger.warn(`letter transits failed: ${safeError(err)}`);
    }

    return {
      week,
      activeDays: new Set(events.map((e) => e.localDate)).size,
      counts,
      manifests: manifests.map((m) => m.goalText.slice(0, 120)),
      signs: signs.map((s) => s.text.slice(0, 140)),
      transits,
    };
  }

  private async write(locale: Locale, facts: LetterFacts): Promise<AsterLetterBody> {
    const stub = letterStub(locale, facts);
    if (!this.ai.available) return stub;
    try {
      const { user, schemaHint } = letterPrompt(locale, facts);
      const p = await this.ai.generateJson<Record<string, unknown>>({
        system: letterSystem(locale),
        user,
        schemaHint,
        temperature: 0.8,
        maxTokens: 700,
      });
      return {
        greeting: str(p.greeting, 80) || stub.greeting,
        body: str(p.body, 700) || stub.body,
        highlight: str(p.highlight, 200) || stub.highlight,
        ahead: str(p.ahead, 240) || stub.ahead,
      };
    } catch (err) {
      this.logger.warn(`weekly letter AI failed: ${safeError(err)}`);
      return stub;
    }
  }
}
