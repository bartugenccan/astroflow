import { createHash } from 'crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { InterpretationKind } from '../../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AI_TEXT_PROVIDER, AiTextProvider } from '../ai/ai-text-provider';
import { AstrologyAdapterService } from '../astrology/astrology-adapter.service';
import { Locale } from '../astrology/interpretation.types';
import { MemoryService } from '../companion/memory.service';
import { tarotCard } from './tarot.deck';
import { TarotCardDto, TarotSpreadDto } from './dto/tarot-spread.dto';
import {
  TarotPromptInput,
  tarotCardPrompt,
  tarotSynthesisPrompt,
  tarotSystemPrompt,
} from './prompts/tarot.prompts';
import { tarotCardStub, tarotSynthesisStub } from './prompts/tarot.stubs';
import { TarotCardReading, TarotContext, TarotSynthesis } from './tarot.types';

/** Bump when tarot prompts change so cached readings regenerate. */
const TAROT_CACHE_VERSION = 't1';

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

@Injectable()
export class TarotService {
  private readonly logger = new Logger(TarotService.name);

  constructor(
    @Inject(AI_TEXT_PROVIDER) private readonly ai: AiTextProvider,
    private readonly prisma: PrismaService,
    private readonly adapter: AstrologyAdapterService,
    private readonly memory: MemoryService,
  ) {}

  /** Detailed reading of one card of the spread. */
  async card(deviceId: string, dto: TarotCardDto, locale: Locale): Promise<TarotCardReading> {
    const input = await this.input(deviceId, dto);
    const { card, drawn } = input.cards[dto.index];
    const rawKey = `tarot-card|${this.spreadKey(deviceId, dto)}|${dto.index}`;

    const text = await this.cached('TAROT_CARD', locale, rawKey, async () => {
      const stub = tarotCardStub(locale, dto.category, card, drawn, dto.index);
      if (!this.ai.available) return stub;
      try {
        const { user, schemaHint } = tarotCardPrompt(locale, input, dto.index);
        const p = await this.ai.generateJson<Record<string, unknown>>({
          system: tarotSystemPrompt(locale),
          user,
          schemaHint,
          temperature: 0.85,
          maxTokens: 3000,
        });
        const keywords = Array.isArray(p.keywords)
          ? p.keywords.map((k) => str(k, 40)).filter(Boolean).slice(0, 5)
          : [];
        return {
          positionName: stub.positionName,
          headline: str(p.headline, 120) || stub.headline,
          keywords: keywords.length ? keywords : stub.keywords,
          essence: str(p.essence, 1800) || stub.essence,
          inPosition: str(p.inPosition, 1500) || stub.inPosition,
          forYou: str(p.forYou, 1800) || stub.forYou,
          shadow: str(p.shadow, 900) || stub.shadow,
          advice: str(p.advice, 900) || stub.advice,
        };
      } catch (err) {
        this.logger.warn(`tarot card AI failed: ${(err as Error).message}`);
        return stub;
      }
    });

    return {
      cardId: card.id,
      position: dto.index,
      reversed: drawn.reversed,
      astro: card.astro[locale],
      ...text,
    };
  }

  /** The spread read as a whole. */
  async synthesis(deviceId: string, dto: TarotSpreadDto, locale: Locale): Promise<TarotSynthesis> {
    const input = await this.input(deviceId, dto);
    const rawKey = `tarot-synth|${this.spreadKey(deviceId, dto)}`;

    return this.cached('TAROT_SYNTHESIS', locale, rawKey, async () => {
      const stub = tarotSynthesisStub(locale, dto.category, input.cards);
      if (!this.ai.available) return stub;
      try {
        const { user, schemaHint } = tarotSynthesisPrompt(locale, input);
        const p = await this.ai.generateJson<Record<string, unknown>>({
          system: tarotSystemPrompt(locale),
          user,
          schemaHint,
          temperature: 0.8,
          maxTokens: 2200,
        });
        const guidance = Array.isArray(p.guidance)
          ? p.guidance.map((g) => str(g, 220)).filter(Boolean).slice(0, 3)
          : [];
        return {
          title: str(p.title, 80) || stub.title,
          story: str(p.story, 2400) || stub.story,
          guidance: guidance.length === 3 ? guidance : stub.guidance,
          affirmation: str(p.affirmation, 220) || stub.affirmation,
        };
      } catch (err) {
        this.logger.warn(`tarot synthesis AI failed: ${(err as Error).message}`);
        return stub;
      }
    });
  }

  private async input(deviceId: string, dto: TarotSpreadDto): Promise<TarotPromptInput> {
    const ids = dto.cards.map((c) => c.cardId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('A card cannot appear twice in one spread.');
    }
    return {
      category: dto.category,
      question: dto.question?.trim() || undefined,
      cards: dto.cards.map((drawn) => ({ card: tarotCard(drawn.cardId), drawn })),
      ctx: await this.context(deviceId, dto),
    };
  }

  private async context(deviceId: string, dto: TarotSpreadDto): Promise<TarotContext> {
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    const chart = this.adapter.getNatalChart(dto.birthDate, time, dto.latitude, dto.longitude);
    let transits: string[] = [];
    try {
      const report = this.adapter.getTransitReport(dto.birthDate, time, dto.latitude, dto.longitude);
      transits = report.movements
        .flatMap((m) => m.aspects.slice(0, 1).map((a) => `${m.planet} ${a.aspect} natal ${a.natalPlanet}`))
        .slice(0, 2);
    } catch (err) {
      this.logger.warn(`tarot transit context failed: ${(err as Error).message}`);
    }
    return {
      sun: chart.summary.sunSign,
      moon: chart.summary.moonSign,
      rising: dto.unknownTime ? null : chart.summary.risingSign,
      transits,
      memory: await this.memory.getDigest(deviceId),
    };
  }

  /** Same draw on the same day → same reading (and no second AI bill). */
  private spreadKey(deviceId: string, dto: TarotSpreadDto): string {
    const date = new Date().toISOString().slice(0, 10);
    const cards = dto.cards.map((c) => `${c.cardId}${c.reversed ? 'R' : ''}`).join(',');
    const question = this.hash(dto.question?.trim().toLowerCase() ?? '').slice(0, 12);
    return `${deviceId}|${date}|${dto.category}|${question}|${cards}`;
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
    const cacheKey = this.hash(`${TAROT_CACHE_VERSION}|${locale}|${rawKey}`);
    try {
      const hit = await this.prisma.interpretation.findUnique({ where: { cacheKey } });
      if (hit) return hit.content as T;
    } catch (err) {
      this.logger.warn(`tarot cache read failed: ${(err as Error).message}`);
    }

    const content = await build();

    try {
      await this.prisma.interpretation.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          kind,
          locale,
          content: content as object,
          model: this.ai.available ? this.ai.model : 'stub',
        },
        update: {},
      });
    } catch (err) {
      this.logger.warn(`tarot cache write failed: ${(err as Error).message}`);
    }
    return content;
  }
}
