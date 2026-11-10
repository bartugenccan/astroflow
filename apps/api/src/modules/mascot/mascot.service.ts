import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { localToday } from '../../common/context/request-context';
import { safeError } from '../../common/logging/safe-error';
import {
  ABILITIES,
  ECLIPSE_MAX_DAYS,
  LessonStatus,
  MAX_STAGE,
  PASS_DAILY_MAX,
  PASSES,
  PassFeature,
  SKY_PATH,
  SkyLessonKey,
  StageUnlocks,
  TarotSpreadKey,
  canUnlockEarly,
  lessonStatus,
  passesToday,
  skyPathView,
  spreadUnlocked,
  unlocksAt,
  EVENT_RULES,
  JOURNEY_MIN_ENERGY,
  JourneyStatus,
  MAX_SHIELDS,
  MascotEventKind,
  SHIELD_EVERY_JOURNEYS,
  SHIELD_MIN_STAGE,
  STAGES,
  advanceOrbit,
  eclipseActive,
  eclipseDays,
  energyFor,
  isoWeek,
  journeyStatus,
  moodFor,
  shiftDays,
  stageBounds,
  stageFor,
  stardustFor,
  viewOrbit,
} from './mascot-rules';
import { ALL_CONSTELLATIONS } from './constellations';
import { CATALOG, CatalogItem, catalogItem } from './mascot-catalog';

/** What one award did — the app turns this into a celebration. */
export interface MascotDelta {
  kind: MascotEventKind;
  xpGained: number;
  stardustGained: number;
  xp: number;
  stardust: number;
  stage: number;
  previousStage: number;
  leveledUp: boolean;
  /** The egg cracked open on this award. */
  hatched: boolean;
  energy: number;
}

export interface MascotView {
  xp: number;
  stardust: number;
  stage: number;
  stageKey: string;
  hatched: boolean;
  stageFloorXp: number;
  nextStageXp: number | null;
  energy: number;
  mood: 'sleepy' | 'happy' | 'glowing';
  shields: number;
  maxShields: number;
  equipped: string[];
  owned: string[];
  /** Awards earned today, by kind — drives the "Today's quests" ticks. */
  today: Partial<Record<MascotEventKind, number>>;
  /** The device-wide "I showed up" streak. */
  orbit: { streak: number; best: number; countedToday: boolean; atRisk: boolean };
  /** A chosen rest: streaks pause, quests and nudges go quiet. */
  eclipse: { active: boolean; start: string | null; end: string | null; maxDays: number };
  journey: {
    status: JourneyStatus;
    minEnergy: number;
    returnsAt: string | null;
    /** Only once Aster is back — no peeking while it's away. */
    discovery: JourneyDiscovery | null;
    constellationKey: string | null;
    completed: number;
    shieldEvery: number;
  };
  /** Today's sky check-in, if done. */
  skyCheckIn: { sky: string; energy: number } | null;
  constellations: { found: number; total: number };
  abilities: { key: string; minStage: number; unlocked: boolean; available: boolean }[];
  catalog: (CatalogItem & { owned: boolean; locked: boolean })[];
  /** Harita Yolu: every chapter and where it stands. */
  skyPath: { key: SkyLessonKey; status: LessonStatus; minStage: number; earlyPrice: number; early: boolean }[];
  /** Premium tastes bought today (extra uses on top of the free allowance). */
  passesToday: Partial<Record<PassFeature, number>>;
  /** What the next stage opens; null at Nova. */
  nextUnlocks: (StageUnlocks & { items: string[]; xpNeeded: number }) | null;
  /** Nova look switched on (stage 5 only). */
  novaLook: boolean;
}

/** A finished lesson: the growth it earned and the fresh state. */
export interface LessonResult {
  delta: MascotDelta;
  state: MascotView;
}

export interface JourneyDiscovery {
  transitPlanet: string;
  aspect: string;
  natalPoint: string;
  nature: string;
  orb: number;
  sign: string;
  title: string;
  body: string;
  /** Deep link inside the app ("Haritanda gör"). */
  link: string;
}

type StateRow = {
  deviceId: string;
  xp: number;
  stardust: number;
  stage: number;
  equipped: unknown;
  owned: unknown;
  shields: number;
  lastFreeShieldWeek: string | null;
  hatchedAt: Date | null;
  orbitStreak: number;
  orbitBest: number;
  orbitLastDate: string | null;
  journeysCompleted: number;
  eclipseStart: string | null;
  eclipseEnd: string | null;
  lessonsDone: unknown;
  lessonsEarly: unknown;
  passes: unknown;
  novaLook: boolean;
};

function ids(json: unknown): string[] {
  return Array.isArray(json) ? json.filter((v): v is string => typeof v === 'string') : [];
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === 'P2002';
}

/**
 * Aster's growth ledger. Every positive action calls `award`; the event row's
 * unique key makes each award idempotent and enforces the daily caps, then the
 * state row is incremented atomically. Days follow the user's zone (x-tz), so
 * the energy bar and quests reset at their midnight without any cron.
 */
@Injectable()
export class MascotService {
  private readonly logger = new Logger(MascotService.name);

  constructor(private readonly prisma: PrismaService) {}

  private ensure(deviceId: string): Promise<StateRow> {
    return this.prisma.mascotState.upsert({
      where: { deviceId },
      create: { deviceId },
      update: {},
    });
  }

  /**
   * Feed Aster for one positive action. Never throws for "already counted
   * today" — that simply yields a zero delta. `hatch` cracks the egg (first
   * intention) whether or not the action still earned Işık today.
   */
  async award(
    deviceId: string,
    kind: MascotEventKind,
    refKey = '',
    opts: { hatch?: boolean } = {},
  ): Promise<MascotDelta> {
    const rule = EVENT_RULES[kind];
    const today = localToday();
    const before = await this.ensure(deviceId);
    const previousStage = before.stage;

    let slotKey: string | null = null;
    const todayCount = await this.prisma.mascotEvent.count({
      where: { deviceId, kind, localDate: today },
    });
    if (todayCount < rule.dailyCap) {
      if (rule.mode === 'slot') {
        slotKey = String(todayCount + 1);
      } else if (rule.mode === 'ref') {
        slotKey = refKey;
      } else {
        const ever = await this.prisma.mascotEvent.findFirst({
          where: { deviceId, kind, refKey },
          select: { id: true },
        });
        slotKey = ever ? null : refKey;
      }
    }

    let awarded = false;
    if (slotKey !== null) {
      try {
        await this.prisma.mascotEvent.create({
          data: { deviceId, kind, localDate: today, refKey: slotKey, xp: rule.xp },
        });
        awarded = true;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
      }
    }
    const xpGained = awarded ? rule.xp : 0;
    const stardustGained = awarded ? stardustFor(kind) : 0;

    const hatchNow = !!opts.hatch && !before.hatchedAt;
    let after: StateRow = before;
    if (awarded) after = await this.advanceOrbitFor(before, kind, today);
    if (awarded || hatchNow) {
      after = await this.prisma.mascotState.update({
        where: { deviceId },
        data: {
          xp: { increment: xpGained },
          stardust: { increment: stardustGained },
          ...(hatchNow ? { hatchedAt: new Date() } : {}),
        },
      });
      const stage = stageFor(after.xp, !!after.hatchedAt);
      if (stage !== after.stage) {
        after = await this.prisma.mascotState.update({ where: { deviceId }, data: { stage } });
      }
    }

    const energy = await this.todayEnergy(deviceId, today);
    return {
      kind,
      xpGained,
      stardustGained,
      xp: after.xp,
      stardust: after.stardust,
      stage: after.stage,
      previousStage,
      leveledUp: after.stage > previousStage,
      hatched: hatchNow,
      energy,
    };
  }

  /** Same as `award`, but a failure never breaks the action that triggered it. */
  async awardSafely(
    deviceId: string,
    kind: MascotEventKind,
    refKey = '',
    opts: { hatch?: boolean } = {},
  ): Promise<MascotDelta | null> {
    try {
      return await this.award(deviceId, kind, refKey, opts);
    } catch (err) {
      this.logger.warn(`mascot award ${kind} failed: ${safeError(err)}`);
      return null;
    }
  }

  /**
   * The first award of a local day moves the orbit on (bridging missed days
   * with shields, skipping eclipse days). Linking an account is not "showing
   * up", so it never counts.
   */
  private async advanceOrbitFor(state: StateRow, kind: MascotEventKind, today: string): Promise<StateRow> {
    if (kind === 'ACCOUNT_LINKED' || state.orbitLastDate === today) return state;
    const next = advanceOrbit(
      { streak: state.orbitStreak, best: state.orbitBest, lastDate: state.orbitLastDate },
      today,
      state.shields,
      eclipseDays({ start: state.eclipseStart, end: state.eclipseEnd }),
    );
    if (!next.changed) return state;
    // Guarded on the day we read, so two awards racing can't both advance it.
    await this.prisma.mascotState.updateMany({
      where: { deviceId: state.deviceId, orbitLastDate: state.orbitLastDate },
      data: {
        orbitStreak: next.streak,
        orbitBest: next.best,
        orbitLastDate: next.lastDate,
        ...(next.shieldsUsed > 0 ? { shields: { decrement: Math.min(next.shieldsUsed, state.shields) } } : {}),
      },
    });
    return this.ensure(state.deviceId);
  }

  async getState(deviceId: string): Promise<MascotView> {
    const today = localToday();
    let state = await this.ensure(deviceId);
    state = await this.grantWeeklyShield(state, today);
    const eclipse = { start: state.eclipseStart, end: state.eclipseEnd };
    const resting = eclipseActive(eclipse, today);
    const [journey, checkIn, found] = await Promise.all([
      this.prisma.mascotJourney.findUnique({ where: { deviceId_localDate: { deviceId, localDate: today } } }),
      this.prisma.moodCheckIn.findUnique({ where: { deviceId_localDate: { deviceId, localDate: today } } }),
      this.prisma.mascotConstellation.count({ where: { deviceId } }),
    ]);

    const events = await this.prisma.mascotEvent.findMany({
      where: { deviceId, localDate: today },
      select: { kind: true },
    });
    const kinds = events.map((e) => e.kind as MascotEventKind);
    const counts: Partial<Record<MascotEventKind, number>> = {};
    for (const k of kinds) counts[k] = (counts[k] ?? 0) + 1;
    const energy = energyFor(kinds);
    const owned = ids(state.owned);
    const { floor, next } = stageBounds(state.stage);
    const status = journeyStatus(journey, energy, resting, new Date());
    const back = status === 'returned' || status === 'claimed';

    return {
      xp: state.xp,
      stardust: state.stardust,
      stage: state.stage,
      stageKey: STAGES[state.stage].key,
      hatched: !!state.hatchedAt,
      stageFloorXp: floor,
      nextStageXp: next,
      energy,
      mood: moodFor(energy),
      shields: state.shields,
      maxShields: MAX_SHIELDS,
      equipped: ids(state.equipped),
      owned,
      today: counts,
      orbit: viewOrbit(
        { streak: state.orbitStreak, best: state.orbitBest, lastDate: state.orbitLastDate },
        today,
        state.shields,
        eclipseDays(eclipse),
      ),
      eclipse: { active: resting, start: state.eclipseStart, end: state.eclipseEnd, maxDays: ECLIPSE_MAX_DAYS },
      journey: {
        status,
        minEnergy: JOURNEY_MIN_ENERGY,
        returnsAt: journey?.returnsAt.toISOString() ?? null,
        discovery: back ? (journey?.discovery as unknown as JourneyDiscovery) : null,
        constellationKey: back ? (journey?.constellationKey ?? null) : null,
        completed: state.journeysCompleted,
        shieldEvery: SHIELD_EVERY_JOURNEYS,
      },
      skyCheckIn: checkIn ? { sky: checkIn.sky, energy: checkIn.energy } : null,
      constellations: { found, total: ALL_CONSTELLATIONS.length },
      abilities: ABILITIES.map((a) => ({
        key: a.key,
        minStage: a.minStage,
        unlocked: state.stage >= a.minStage,
        available: a.available,
      })),
      catalog: CATALOG.map((item) => ({
        ...item,
        owned: owned.includes(item.id),
        locked: state.stage < item.minStage,
      })),
      skyPath: skyPathView(this.progress(state)),
      passesToday: passesToday(state.passes, today),
      nextUnlocks: this.nextUnlocks(state),
      novaLook: state.novaLook && state.stage >= MAX_STAGE,
    };
  }

  private progress(state: StateRow) {
    return { stage: state.stage, done: ids(state.lessonsDone), early: ids(state.lessonsEarly) };
  }

  /** The next stage's unlocks, catalog included, and the Işık still to earn for it. */
  private nextUnlocks(state: StateRow): MascotView['nextUnlocks'] {
    if (!state.hatchedAt || state.stage >= MAX_STAGE) return null;
    const next = state.stage + 1;
    const { next: nextXp } = stageBounds(state.stage);
    return {
      ...unlocksAt(next),
      items: CATALOG.filter((i) => i.minStage === next).map((i) => i.id),
      xpNeeded: Math.max(0, (nextXp ?? 0) - state.xp),
    };
  }

  /**
   * Finish a Harita Yolu chapter. It must be open (the one before it done, and
   * Aster grown enough or the chapter bought early). The chapter counts as done
   * even when today's lesson Işık is already used up — the award just yields 0.
   */
  async completeLesson(deviceId: string, key: SkyLessonKey): Promise<LessonResult> {
    const state = await this.ensure(deviceId);
    const status = lessonStatus(key, this.progress(state));
    if (status === 'lockedPrev' || status === 'lockedStage') {
      throw new ConflictException(`Lesson ${key} is not open yet (${status})`);
    }
    if (status === 'open') {
      await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.mascotState.findUniqueOrThrow({ where: { deviceId } });
        const done = ids(fresh.lessonsDone);
        if (!done.includes(key)) {
          await tx.mascotState.update({ where: { deviceId }, data: { lessonsDone: [...done, key] } });
        }
      });
    }
    const delta = await this.award(deviceId, 'SKY_LESSON', key);
    return { delta, state: await this.getState(deviceId) };
  }

  /** Open a stage-locked chapter now, for its Yıldız Tozu price. */
  async unlockLessonEarly(deviceId: string, key: SkyLessonKey): Promise<MascotView> {
    const state = await this.ensure(deviceId);
    if (!canUnlockEarly(key, this.progress(state))) {
      throw new ConflictException('This chapter cannot be bought early');
    }
    const price = SKY_PATH.find((c) => c.key === key)?.earlyPrice ?? 0;
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.mascotState.updateMany({
        where: { deviceId, stardust: { gte: price } },
        data: { stardust: { decrement: price } },
      });
      if (res.count === 0) throw new BadRequestException('Not enough stardust');
      const fresh = await tx.mascotState.findUniqueOrThrow({ where: { deviceId } });
      const early = ids(fresh.lessonsEarly);
      if (early.includes(key)) throw new ConflictException('Already unlocked');
      await tx.mascotState.update({ where: { deviceId }, data: { lessonsEarly: [...early, key] } });
    });
    return this.getState(deviceId);
  }

  /** Is this tarot spread open for the subject's Aster? */
  async spreadAllowed(deviceId: string, spread: TarotSpreadKey): Promise<boolean> {
    const state = await this.ensure(deviceId);
    return spreadUnlocked(spread, state.stage);
  }

  /** Extra uses of a metered feature bought today. */
  async passCount(deviceId: string, feature: PassFeature): Promise<number> {
    const state = await this.ensure(deviceId);
    return passesToday(state.passes, localToday())[feature] ?? 0;
  }

  async setNovaLook(deviceId: string, on: boolean): Promise<MascotView> {
    const state = await this.ensure(deviceId);
    if (on && state.stage < MAX_STAGE) throw new ConflictException('The Nova look opens at Nova');
    await this.prisma.mascotState.update({ where: { deviceId }, data: { novaLook: on } });
    return this.getState(deviceId);
  }

  /** One free shield per ISO week once Aster can hold them (stage ≥ 2). */
  private async grantWeeklyShield(state: StateRow, today: string): Promise<StateRow> {
    if (state.stage < SHIELD_MIN_STAGE) return state;
    const week = isoWeek(today);
    if (state.lastFreeShieldWeek === week) return state;
    const res = await this.prisma.mascotState.updateMany({
      where: {
        deviceId: state.deviceId,
        OR: [{ lastFreeShieldWeek: null }, { lastFreeShieldWeek: { not: week } }],
      },
      data: {
        lastFreeShieldWeek: week,
        ...(state.shields < MAX_SHIELDS ? { shields: { increment: 1 } } : {}),
      },
    });
    if (res.count === 0) return state;
    return this.ensure(state.deviceId);
  }

  async purchase(deviceId: string, itemId: string): Promise<MascotView> {
    const item = catalogItem(itemId);
    if (!item) throw new BadRequestException('Unknown item');
    const state = await this.ensure(deviceId);
    if (state.stage < item.minStage) throw new BadRequestException('Aster has not grown enough for this yet');

    if (item.kind === 'pass' && item.pass) {
      const feature = item.pass;
      const today = localToday();
      await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.mascotState.findUniqueOrThrow({ where: { deviceId } });
        const bought = passesToday(fresh.passes, today)[feature] ?? 0;
        if (bought >= PASS_DAILY_MAX * PASSES[feature].amount) {
          throw new ConflictException('Already bought today');
        }
        const res = await tx.mascotState.updateMany({
          where: { deviceId, stardust: { gte: item.price } },
          data: { stardust: { decrement: item.price } },
        });
        if (res.count === 0) throw new BadRequestException('Not enough stardust');
        // Only today is kept: yesterday's passes simply fall away.
        const todayPasses = passesToday(fresh.passes, today);
        await tx.mascotState.update({
          where: { deviceId },
          data: { passes: { [today]: { ...todayPasses, [feature]: bought + PASSES[feature].amount } } },
        });
      });
      return this.getState(deviceId);
    }

    if (item.kind === 'shield') {
      const res = await this.prisma.mascotState.updateMany({
        where: { deviceId, stardust: { gte: item.price }, shields: { lt: MAX_SHIELDS } },
        data: { stardust: { decrement: item.price }, shields: { increment: 1 } },
      });
      if (res.count === 0) {
        throw new BadRequestException(
          state.shields >= MAX_SHIELDS ? 'Shield stock is full' : 'Not enough stardust',
        );
      }
      return this.getState(deviceId);
    }

    if (ids(state.owned).includes(item.id)) throw new ConflictException('Already owned');
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.mascotState.updateMany({
        where: { deviceId, stardust: { gte: item.price } },
        data: { stardust: { decrement: item.price } },
      });
      if (res.count === 0) throw new BadRequestException('Not enough stardust');
      const fresh = await tx.mascotState.findUniqueOrThrow({ where: { deviceId } });
      const owned = ids(fresh.owned);
      if (owned.includes(item.id)) throw new ConflictException('Already owned');
      await tx.mascotState.update({
        where: { deviceId },
        data: { owned: [...owned, item.id] },
      });
    });
    return this.getState(deviceId);
  }

  async equip(deviceId: string, itemIds: string[]): Promise<MascotView> {
    const state = await this.ensure(deviceId);
    const owned = ids(state.owned);
    const bySlot = new Map<string, string>();
    for (const id of itemIds) {
      const item = catalogItem(id);
      if (!item || item.kind !== 'accessory' || !item.slot) throw new BadRequestException(`Not an accessory: ${id}`);
      // Free stage rewards (price 0) are owned as soon as they unlock.
      const free = item.price === 0 && state.stage >= item.minStage;
      if (!owned.includes(id) && !free) throw new BadRequestException(`Not owned: ${id}`);
      bySlot.set(item.slot, id);
    }
    await this.prisma.mascotState.update({
      where: { deviceId },
      data: { equipped: [...bySlot.values()] },
    });
    return this.getState(deviceId);
  }

  /** Rest for `days` local days starting today; replaces any earlier eclipse. */
  async startEclipse(deviceId: string, days: number): Promise<MascotView> {
    const n = Math.max(1, Math.min(ECLIPSE_MAX_DAYS, Math.round(days)));
    const today = localToday();
    await this.ensure(deviceId);
    await this.prisma.mascotState.update({
      where: { deviceId },
      data: { eclipseStart: today, eclipseEnd: shiftDays(today, n - 1) },
    });
    return this.getState(deviceId);
  }

  /** Wake from an eclipse early. Days already rested stay rested (end = yesterday). */
  async endEclipse(deviceId: string): Promise<MascotView> {
    const today = localToday();
    const state = await this.ensure(deviceId);
    if (state.eclipseStart && state.eclipseEnd) {
      const end = shiftDays(today, -1);
      await this.prisma.mascotState.update({
        where: { deviceId },
        data: end < state.eclipseStart ? { eclipseStart: null, eclipseEnd: null } : { eclipseEnd: end },
      });
    }
    return this.getState(deviceId);
  }

  /** Every constellation key, with the ones found (count, first find). */
  async constellations(deviceId: string) {
    const rows = await this.prisma.mascotConstellation.findMany({ where: { deviceId } });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return ALL_CONSTELLATIONS.map((key) => {
      const r = byKey.get(key);
      return { key, found: !!r, count: r?.count ?? 0, firstFoundAt: r?.firstFoundAt.toISOString() ?? null };
    });
  }

  /** One more shield, if there's room in stock. */
  async grantShield(deviceId: string): Promise<boolean> {
    const res = await this.prisma.mascotState.updateMany({
      where: { deviceId, shields: { lt: MAX_SHIELDS } },
      data: { shields: { increment: 1 } },
    });
    return res.count > 0;
  }

  /** The subject's eclipse days — streaks skip them instead of breaking. */
  async restDays(deviceId: string): Promise<Set<string>> {
    const s = await this.prisma.mascotState.findUnique({
      where: { deviceId },
      select: { eclipseStart: true, eclipseEnd: true },
    });
    return s ? eclipseDays({ start: s.eclipseStart, end: s.eclipseEnd }) : new Set();
  }

  async shieldCount(deviceId: string): Promise<number> {
    const s = await this.prisma.mascotState.findUnique({ where: { deviceId }, select: { shields: true } });
    return s?.shields ?? 0;
  }

  /** Spend `n` shields atomically; false when there aren't enough. */
  async consumeShields(deviceId: string, n: number): Promise<boolean> {
    if (n <= 0) return true;
    const res = await this.prisma.mascotState.updateMany({
      where: { deviceId, shields: { gte: n } },
      data: { shields: { decrement: n } },
    });
    return res.count > 0;
  }

  private async todayEnergy(deviceId: string, today: string): Promise<number> {
    const events = await this.prisma.mascotEvent.findMany({
      where: { deviceId, localDate: today },
      select: { kind: true },
    });
    return energyFor(events.map((e) => e.kind as MascotEventKind));
  }
}
