import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AI_TEXT_PROVIDER, AiTextProvider } from '../ai/ai-text-provider';
import { AstrologyAdapterService } from '../astrology/astrology-adapter.service';
import { InterpretationService } from '../astrology/interpretation.service';
import { Locale } from '../astrology/interpretation.types';
import {
  checkInPrompt,
  intentionSuggestionsPrompt,
} from '../astrology/prompts/interpretation.prompts';
import {
  checkInStub,
  intentionSuggestionsStub,
} from '../astrology/prompts/interpretation.stubs';
import { MemoryService } from '../companion/memory.service';
import { IntentionStreakService } from './intention-streak.service';
import { CreateIntentionDto } from './dto/create-intention.dto';
import { CheckInDto } from './dto/checkin.dto';

type LifeArea = 'love' | 'career' | 'money' | 'energy';

const CATEGORY_AREA: Record<string, LifeArea> = {
  love: 'love', relationship: 'love', dating: 'love',
  career: 'career', work: 'career', study: 'career', reading: 'career', learning: 'career',
  money: 'money', finance: 'money', savings: 'money',
  health: 'energy', fitness: 'energy', strength: 'energy', calm: 'energy', patience: 'energy',
  confidence: 'energy', habit: 'energy', mood: 'energy',
};

@Injectable()
export class IntentionsService {
  private readonly logger = new Logger(IntentionsService.name);

  constructor(
    @Inject(AI_TEXT_PROVIDER) private readonly ai: AiTextProvider,
    private readonly prisma: PrismaService,
    private readonly adapter: AstrologyAdapterService,
    private readonly interpretation: InterpretationService,
    private readonly memory: MemoryService,
    private readonly streaks: IntentionStreakService,
  ) {}

  private area(category: string, provided?: LifeArea): LifeArea {
    return provided ?? CATEGORY_AREA[category?.toLowerCase()] ?? 'energy';
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async create(deviceId: string, dto: CreateIntentionDto, locale: Locale) {
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    const chart = this.adapter.getNatalChart(dto.birthDate, time, dto.latitude, dto.longitude);
    const lifeArea = this.area(dto.category, dto.lifeArea);
    const affirmation = await this.interpretation.getAffirmation(
      {
        goalText: dto.goalText,
        lifeArea,
        moonSign: chart.summary.moonSign,
        sunSign: chart.summary.sunSign,
      },
      locale,
    );

    const intention = await this.prisma.intention.create({
      data: {
        deviceId,
        goalText: dto.goalText,
        category: dto.category,
        lifeArea,
        affirmation,
        dailyTarget: dto.dailyTarget,
      },
    });
    await this.memory.remember(deviceId, 'goal', dto.goalText);
    return this.withProgress(intention, deviceId);
  }

  async list(deviceId: string) {
    const rows = await this.prisma.intention.findMany({
      where: { deviceId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.withProgress(r, deviceId)));
  }

  async get(deviceId: string, id: string) {
    const intention = await this.prisma.intention.findFirst({ where: { id, deviceId } });
    if (!intention) throw new NotFoundException('Intention not found');
    return this.withProgress(intention, deviceId);
  }

  async archive(deviceId: string, id: string) {
    await this.prisma.intention.updateMany({
      where: { id, deviceId },
      data: { status: 'archived' },
    });
    return { archived: true };
  }

  async remove(deviceId: string, id: string) {
    await this.prisma.intention.deleteMany({ where: { id, deviceId } });
    return { deleted: true };
  }

  async suggestions(deviceId: string, birth: CreateSuggestionsInput, locale: Locale) {
    const time = birth.unknownTime ? '12:00' : birth.birthTime;
    const chart = this.adapter.getNatalChart(birth.birthDate, time, birth.latitude, birth.longitude);
    const report = this.adapter.getTransitReport(birth.birthDate, time, birth.latitude, birth.longitude);
    const transits = report.movements
      .flatMap((m) => m.aspects.slice(0, 1).map((a) => `${m.planet} ${a.aspect} natal ${a.natalPlanet}`))
      .slice(0, 6);
    const memory = await this.memory.getDigest(deviceId);

    if (!this.ai.available) return intentionSuggestionsStub(locale);
    try {
      const { user, schemaHint } = intentionSuggestionsPrompt(locale, {
        sun: chart.summary.sunSign,
        moon: chart.summary.moonSign,
        transits,
        memory,
      });
      const parsed = await this.ai.generateJson<{
        suggestions?: { goal?: string; why?: string; lifeArea?: string }[];
      }>({ system: '', user, schemaHint, temperature: 0.9, maxTokens: 700 });
      const valid: LifeArea[] = ['love', 'career', 'money', 'energy'];
      const suggestions = (parsed.suggestions ?? [])
        .filter((s) => s && s.goal && s.why)
        .slice(0, 3)
        .map((s) => ({
          goal: String(s.goal).slice(0, 120),
          why: String(s.why).slice(0, 200),
          lifeArea: (valid.includes(s.lifeArea as LifeArea) ? s.lifeArea : 'energy') as LifeArea,
        }));
      return { suggestions: suggestions.length ? suggestions : intentionSuggestionsStub(locale).suggestions };
    } catch (err) {
      this.logger.warn(`intention suggestions AI failed: ${(err as Error).message}`);
      return intentionSuggestionsStub(locale);
    }
  }

  async checkIn(deviceId: string, id: string, dto: CheckInDto, locale: Locale) {
    const intention = await this.prisma.intention.findFirst({ where: { id, deviceId } });
    if (!intention) throw new NotFoundException('Intention not found');
    const today = this.today();

    // Recent check-in notes for continuity.
    const recentRows = await this.prisma.intentionCheckIn.findMany({
      where: { intentionId: id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { userText: true, date: true },
    });
    const recent = recentRows
      .filter((r) => r.userText)
      .map((r) => `- ${r.date}: ${r.userText}`)
      .join('\n');

    // AI reply — NOT cached (unique per turn).
    let ai: { response: string; conviction: number; followUp: string; strongerPhrasing?: string };
    if (!this.ai.available) {
      ai = checkInStub(locale, dto.conviction);
    } else {
      try {
        const { user, schemaHint } = checkInPrompt(locale, {
          goalText: intention.goalText,
          affirmation: intention.affirmation,
          conviction: dto.conviction,
          userText: dto.userText,
          recent,
        });
        const parsed = await this.ai.generateJson<{
          response?: string;
          conviction?: number;
          followUp?: string;
          strongerPhrasing?: string;
        }>({ system: '', user, schemaHint, temperature: 0.8, maxTokens: 700 });
        const stub = checkInStub(locale, dto.conviction);
        ai = {
          response: (parsed.response ?? stub.response).slice(0, 900),
          conviction: clampConviction(parsed.conviction) ?? dto.conviction,
          followUp: (parsed.followUp ?? stub.followUp).slice(0, 300),
          strongerPhrasing: parsed.strongerPhrasing?.slice(0, 300) || undefined,
        };
      } catch (err) {
        this.logger.warn(`check-in AI failed: ${(err as Error).message}`);
        ai = checkInStub(locale, dto.conviction);
      }
    }

    await this.prisma.intentionCheckIn.create({
      data: {
        deviceId,
        intentionId: id,
        date: today,
        conviction: dto.conviction,
        userText: dto.userText ?? null,
        inputMode: dto.inputMode ?? 'text',
        transcript: dto.transcript ?? null,
        aiResponse: ai.response,
        aiConviction: ai.conviction,
      },
    });
    await this.streaks.recordCheckIn(deviceId, id);
    if (dto.userText) await this.memory.remember(deviceId, 'checkin', dto.userText);

    // Progress toward today's target.
    const count = await this.prisma.intentionCheckIn.count({
      where: { intentionId: id, date: today },
    });
    let streak = await this.currentStreak(id);
    let milestoneName: string | null = null;
    let dayCompleted = false;
    // Target first met exactly now → advance streak.
    if (count === intention.dailyTarget) {
      const res = await this.streaks.recordDayCompleted(deviceId, id, today);
      streak = { currentStreak: res.currentStreak, longestStreak: res.longestStreak };
      milestoneName = res.milestoneName;
      dayCompleted = true;
    }

    return {
      ...ai,
      progress: { count, target: intention.dailyTarget },
      dayCompleted,
      streak,
      milestoneName,
    };
  }

  async history(deviceId: string, id: string) {
    const intention = await this.prisma.intention.findFirst({ where: { id, deviceId } });
    if (!intention) throw new NotFoundException('Intention not found');
    const rows = await this.prisma.intentionCheckIn.findMany({
      where: { intentionId: id },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      conviction: r.conviction,
      userText: r.userText,
      aiResponse: r.aiResponse,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async currentStreak(intentionId: string): Promise<{ currentStreak: number; longestStreak: number }> {
    const s = await this.prisma.intentionStreak.findUnique({ where: { intentionId } });
    return { currentStreak: s?.currentStreak ?? 0, longestStreak: s?.longestStreak ?? 0 };
  }

  private async withProgress(
    intention: { id: string; dailyTarget: number } & Record<string, unknown>,
    deviceId: string,
  ) {
    const today = this.today();
    const [count, streak] = await Promise.all([
      this.prisma.intentionCheckIn.count({ where: { intentionId: intention.id, date: today } }),
      this.currentStreak(intention.id),
    ]);
    return {
      ...intention,
      progress: { count, target: intention.dailyTarget },
      streak,
    };
  }
}

interface CreateSuggestionsInput {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  unknownTime?: boolean;
}

function clampConviction(n?: number): number | null {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}
