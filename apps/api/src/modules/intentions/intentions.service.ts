import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { IntentionStreakService, StreakView } from './intention-streak.service';
import { MascotDelta, MascotService } from '../mascot/mascot.service';
import { AffirmationPreviewDto, CreateIntentionDto } from './dto/create-intention.dto';
import { DeviceSkyService } from '../plan/device-sky.service';
import { nextLunarPeak } from '../mascot/mascot-rules';
import { LIFE_AREA_HOUSES, intentionStats, starState, visiblePowerDays } from './intention-rules';
import type { NatalChartData } from '../astrology/astrology-adapter.service';
import { CheckInDto } from './dto/checkin.dto';
import { safeError } from '../../common/logging/safe-error';
import { localToday } from '../../common/context/request-context';

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
    private readonly mascot: MascotService,
    private readonly sky: DeviceSkyService,
  ) {}

  private area(category: string, provided?: LifeArea): LifeArea {
    return provided ?? CATEGORY_AREA[category?.toLowerCase()] ?? 'energy';
  }

  /** The user's local day — check-ins and daily progress follow their calendar, not UTC. */
  private today(): string {
    return localToday();
  }

  async create(deviceId: string, dto: CreateIntentionDto, locale: Locale) {
    const lifeArea = this.area(dto.category, dto.lifeArea);
    const affirmation =
      dto.affirmation?.trim() || (await this.affirmationFor(dto, dto.goalText, lifeArea, locale));

    const intention = await this.prisma.intention.create({
      data: {
        deviceId,
        goalText: dto.goalText,
        category: dto.category,
        lifeArea,
        affirmation,
        dailyTarget: dto.dailyTarget,
        natalHouse: LIFE_AREA_HOUSES[lifeArea].main,
        plantedMoon: dto.plant === 'newMoon' ? nextLunarPeak(new Date(), 'new') : null,
      },
    });
    await this.memory.remember(deviceId, 'goal', dto.goalText);
    // Setting an intention feeds Aster — and the very first one hatches the egg.
    const mascot = await this.mascot.awardSafely(deviceId, 'INTENTION_CREATE', '', { hatch: true });
    return { ...(await this.withProgress(intention, deviceId)), mascot };
  }

  async list(deviceId: string, status: 'active' | 'manifested' = 'active') {
    const rows = await this.prisma.intention.findMany({
      where: { deviceId, status },
      orderBy: status === 'manifested' ? { manifestedAt: 'desc' } : { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.withProgress(r, deviceId)));
  }

  /** The chart-framed affirmation for a wish, before it is planted (wizard step). */
  async previewAffirmation(dto: AffirmationPreviewDto, locale: Locale) {
    return { affirmation: await this.affirmationFor(dto, dto.goalText, dto.lifeArea, locale) };
  }

  /**
   * Where each life area lives in the user's natal chart: its house, the cusp
   * sign, the ruler and the planets inside. Read from the stored chart; when
   * the birth time is unknown the houses are only approximate.
   */
  async areas(deviceId: string) {
    const natal = await this.sky.natal(deviceId);
    if (!natal) throw new NotFoundException('No chart for this device yet');
    const areas = (Object.keys(LIFE_AREA_HOUSES) as LifeArea[]).map((area) =>
      areaContext(natal.chart, area, natal.unknownTime),
    );
    return { areas };
  }

  /** A wish came true: it moves to the "manifested" shelf and Aster celebrates. */
  async manifest(deviceId: string, id: string) {
    const res = await this.prisma.intention.updateMany({
      where: { id, deviceId, status: 'active' },
      data: { status: 'manifested', manifestedAt: new Date() },
    });
    if (res.count === 0) throw new ConflictException('Only an active wish can be manifested');
    const mascot = await this.mascot.awardSafely(deviceId, 'MANIFESTED', id);
    return { ...(await this.get(deviceId, id)), mascot };
  }

  /**
   * The wish's power days: the next `days` days scored for its life area from
   * the user's transits, each with the transit that drives it. Before Glimmer
   * only the first few are visible — Aster's growth unlocks the rest.
   */
  async powerDays(deviceId: string, id: string, days = 14) {
    const intention = await this.prisma.intention.findFirst({ where: { id, deviceId } });
    if (!intention) throw new NotFoundException('Intention not found');
    const area = intention.lifeArea as LifeArea;
    const birth = await this.sky.requireBirth(deviceId);
    const n = Math.max(1, Math.min(31, days));
    const best = this.sky.bestDays(birth, n, this.today());
    const stage = (await this.mascot.getState(deviceId)).stage;
    const visible = visiblePowerDays(stage, best.scores.length);
    const reasons = new Map(best.daily[area].map((d) => [d.date, d]));
    return {
      area,
      stage,
      visible,
      days: best.scores.map((s, i) => {
        const locked = i >= visible;
        const r = reasons.get(s.date);
        return {
          date: s.date,
          locked,
          score: locked ? null : s[area],
          reason:
            locked || !r
              ? null
              : { transitPlanet: r.transitPlanet, natalPlanet: r.natalPlanet, aspect: r.aspect, nature: r.nature },
        };
      }),
    };
  }

  async get(deviceId: string, id: string) {
    const intention = await this.prisma.intention.findFirst({ where: { id, deviceId } });
    if (!intention) throw new NotFoundException('Intention not found');
    const [withProgress, rows] = await Promise.all([
      this.withProgress(intention, deviceId),
      this.prisma.intentionCheckIn.findMany({
        where: { intentionId: id },
        orderBy: { createdAt: 'desc' },
        select: { date: true, conviction: true },
      }),
    ]);
    const today = this.today();
    const createdDay = localDayOf(intention.createdAt, today);
    return {
      ...withProgress,
      stats: intentionStats(rows, createdDay, today, withProgress.streak.longestStreak),
    };
  }

  /** The manifest's sign log, newest first. */
  async signs(deviceId: string, id: string) {
    await this.owned(deviceId, id);
    const rows = await this.prisma.intentionSign.findMany({
      where: { deviceId, intentionId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({ id: r.id, text: r.text, date: r.localDate, createdAt: r.createdAt.toISOString() }));
  }

  /** Log a sign → SIGN_LOG (+5 Işık, once a day). */
  async addSign(deviceId: string, id: string, text: string) {
    await this.owned(deviceId, id);
    const clean = text.trim().slice(0, 280);
    if (!clean) throw new ConflictException('A sign needs a few words');
    const row = await this.prisma.intentionSign.create({
      data: { deviceId, intentionId: id, text: clean, localDate: this.today() },
    });
    const mascot = await this.mascot.awardSafely(deviceId, 'SIGN_LOG');
    return {
      sign: { id: row.id, text: row.text, date: row.localDate, createdAt: row.createdAt.toISOString() },
      mascot,
    };
  }

  async removeSign(deviceId: string, id: string, signId: string) {
    await this.prisma.intentionSign.deleteMany({ where: { id: signId, intentionId: id, deviceId } });
    return { deleted: true };
  }

  private async owned(deviceId: string, id: string): Promise<void> {
    const found = await this.prisma.intention.findFirst({ where: { id, deviceId }, select: { id: true } });
    if (!found) throw new NotFoundException('Intention not found');
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
      this.logger.warn(`intention suggestions AI failed: ${safeError(err)}`);
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
        this.logger.warn(`check-in AI failed: ${safeError(err)}`);
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
    let streak: StreakView = await this.streaks.read(deviceId, id, today);
    let milestoneName: string | null = null;
    let dayCompleted = false;
    // Target first met exactly now → advance streak.
    if (count === intention.dailyTarget) {
      const res = await this.streaks.recordDayCompleted(deviceId, id, today);
      streak = {
        currentStreak: res.currentStreak,
        longestStreak: res.longestStreak,
        shieldsUsed: streak.shieldsUsed + res.shieldsUsed,
        lastActiveDate: res.lastActiveDate,
      };
      milestoneName = res.milestoneName;
      dayCompleted = true;
    }

    // Feed Aster: the rep itself, the completed day, and any milestone.
    const deltas: (MascotDelta | null)[] = [await this.mascot.awardSafely(deviceId, 'CHECKIN')];
    if (dayCompleted) deltas.push(await this.mascot.awardSafely(deviceId, 'DAY_COMPLETE', id));
    if (milestoneName) {
      deltas.push(await this.mascot.awardSafely(deviceId, 'MILESTONE', `${id}:${milestoneName}`));
    }

    return {
      ...ai,
      progress: { count, target: intention.dailyTarget },
      dayCompleted,
      streak,
      milestoneName,
      mascot: mergeDeltas(deltas),
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

  /** Generate the chart-framed affirmation from the birth data in the request. */
  private async affirmationFor(
    birth: { birthDate: string; birthTime: string; latitude: number; longitude: number; unknownTime?: boolean },
    goalText: string,
    lifeArea: LifeArea,
    locale: Locale,
  ): Promise<string> {
    const time = birth.unknownTime ? '12:00' : birth.birthTime;
    const chart = this.adapter.getNatalChart(birth.birthDate, time, birth.latitude, birth.longitude);
    return this.interpretation.getAffirmation(
      { goalText, lifeArea, moonSign: chart.summary.moonSign, sunSign: chart.summary.sunSign },
      locale,
    );
  }

  private async withProgress(
    intention: { id: string; dailyTarget: number; plantedMoon?: string | null } & Record<string, unknown>,
    deviceId: string,
  ) {
    const today = this.today();
    const [count, streak, conviction] = await Promise.all([
      this.prisma.intentionCheckIn.count({ where: { intentionId: intention.id, date: today } }),
      this.streaks.read(deviceId, intention.id, today),
      this.prisma.intentionCheckIn.aggregate({
        where: { intentionId: intention.id },
        _avg: { conviction: true },
        _count: { _all: true },
      }),
    ]);
    const star = starState(
      {
        totalCheckIns: conviction._count._all,
        avgConviction: conviction._avg.conviction,
        lastActiveDate: streak.lastActiveDate,
        plantedMoon: intention.plantedMoon ?? null,
      },
      today,
    );
    return {
      ...intention,
      progress: { count, target: intention.dailyTarget },
      streak,
      star,
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

/**
 * The local day an instant fell on. The request's zone is not at hand for a
 * stored timestamp, so the UTC day is used, capped at today so a planted-today
 * manifest never shows "0 days".
 */
function localDayOf(at: Date, today: string): string {
  const day = at.toISOString().slice(0, 10);
  return day > today ? today : day;
}

/** Several awards from one action → one delta (summed gains, final state). */
function mergeDeltas(deltas: (MascotDelta | null)[]): MascotDelta | null {
  const real = deltas.filter((d): d is MascotDelta => d !== null);
  if (real.length === 0) return null;
  const last = real[real.length - 1];
  return {
    ...last,
    xpGained: real.reduce((n, d) => n + d.xpGained, 0),
    stardustGained: real.reduce((n, d) => n + d.stardustGained, 0),
    previousStage: real[0].previousStage,
    leveledUp: last.stage > real[0].previousStage,
    hatched: real.some((d) => d.hatched),
  };
}

function clampConviction(n?: number): number | null {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

/** One life area's place in the natal chart (house, cusp, ruler, planets inside). */
function areaContext(chart: NatalChartData, area: LifeArea, unknownTime: boolean) {
  const { main } = LIFE_AREA_HOUSES[area];
  const h = chart.houses.find((x) => x.house === main);
  return {
    area,
    house: main,
    sign: h?.sign ?? null,
    ruler: h?.ruler ?? null,
    rulerSign: h?.rulerSign ?? null,
    rulerHouse: h?.rulerHouse ?? null,
    planets: h?.planetsInHouse ?? [],
    /** Houses need the birth time; without it this is only a sketch. */
    approximate: unknownTime,
  };
}
