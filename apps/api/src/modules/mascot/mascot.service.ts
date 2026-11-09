import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { localToday } from '../../common/context/request-context';
import { safeError } from '../../common/logging/safe-error';
import {
  ABILITIES,
  EVENT_RULES,
  MAX_SHIELDS,
  MascotEventKind,
  SHIELD_MIN_STAGE,
  STAGES,
  energyFor,
  isoWeek,
  moodFor,
  stageBounds,
  stageFor,
} from './mascot-rules';
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
  abilities: { key: string; minStage: number; unlocked: boolean; available: boolean }[];
  catalog: (CatalogItem & { owned: boolean; locked: boolean })[];
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

    let xpGained = 0;
    if (slotKey !== null) {
      try {
        await this.prisma.mascotEvent.create({
          data: { deviceId, kind, localDate: today, refKey: slotKey, xp: rule.xp },
        });
        xpGained = rule.xp;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
      }
    }

    const hatchNow = !!opts.hatch && !before.hatchedAt;
    let after: StateRow = before;
    if (xpGained > 0 || hatchNow) {
      after = await this.prisma.mascotState.update({
        where: { deviceId },
        data: {
          xp: { increment: xpGained },
          stardust: { increment: xpGained },
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
      stardustGained: xpGained,
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

  async getState(deviceId: string): Promise<MascotView> {
    const today = localToday();
    let state = await this.ensure(deviceId);
    state = await this.grantWeeklyShield(state, today);

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
    };
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
