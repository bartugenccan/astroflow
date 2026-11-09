import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MascotService } from '../mascot/mascot.service';
import { planStreak, shiftDays } from '../mascot/mascot-rules';

export interface StreakView {
  currentStreak: number;
  longestStreak: number;
  /** Shields Aster spent just now to keep this streak alive (0 when none). */
  shieldsUsed: number;
  /** Last day the target was met (YYYY-MM-DD), or null. */
  lastActiveDate: string | null;
}

export interface StreakResult extends StreakView {
  totalCheckIns: number;
  milestoneName: string | null;
}

const MILESTONES: [number, string][] = [
  [3, '3-Day Spark'],
  [7, '7-Day Flow'],
  [14, '14-Day Wave'],
  [30, '30-Day Vortex'],
  [60, '60-Day Surge'],
  [90, '90-Day Nova'],
  [180, '180-Day Singularity'],
  [365, '365-Day Ascension'],
];

function dates(json: unknown): string[] {
  return Array.isArray(json) ? json.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Device-scoped streak tracking for intentions, on YYYY-MM-DD strings in the
 * user's zone. A "day complete" (daily target met) advances the streak once.
 *
 * Streaks are resolved when read — no midnight cron: a run is alive while the
 * last completed day is today or yesterday. Missed days in between are
 * bridged with Aster's streak shields when there are enough; otherwise the
 * streak reads 0 and the next completed day starts a new run.
 */
@Injectable()
export class IntentionStreakService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mascot: MascotService,
  ) {}

  /** Bump total check-ins for every rep, regardless of target. */
  async recordCheckIn(deviceId: string, intentionId: string): Promise<void> {
    await this.prisma.intentionStreak.upsert({
      where: { intentionId },
      create: { deviceId, intentionId, totalCheckIns: 1 },
      update: { totalCheckIns: { increment: 1 } },
    });
  }

  /** The streak as it stands today, spending shields to bridge missed days. */
  async read(deviceId: string, intentionId: string, today: string): Promise<StreakView> {
    const row = await this.prisma.intentionStreak.findUnique({ where: { intentionId } });
    if (!row) return { currentStreak: 0, longestStreak: 0, shieldsUsed: 0, lastActiveDate: null };

    const [shields, rest] = await Promise.all([this.mascot.shieldCount(deviceId), this.mascot.restDays(deviceId)]);
    const plan = planStreak(row, today, shields, rest);
    // A gap the run survives — shielded days and/or eclipse days — is closed
    // up to yesterday, so today's completion continues the run.
    const gap = row.lastActiveDate !== null && row.lastActiveDate < shiftDays(today, -1);
    const survives = gap && !plan.broken && plan.effectiveStreak > 0;
    if (survives && (await this.mascot.consumeShields(deviceId, plan.bridgeDays.length))) {
      await this.prisma.intentionStreak.update({
        where: { intentionId },
        data: {
          lastActiveDate: shiftDays(today, -1),
          shieldUsedDates: [...dates(row.shieldUsedDates), ...plan.bridgeDays],
        },
      });
      return {
        currentStreak: row.currentStreak,
        longestStreak: row.longestStreak,
        shieldsUsed: plan.bridgeDays.length,
        lastActiveDate: row.lastActiveDate,
      };
    }
    const alive = !gap && !plan.broken;
    return {
      currentStreak: alive ? plan.effectiveStreak : 0,
      longestStreak: row.longestStreak,
      shieldsUsed: 0,
      lastActiveDate: row.lastActiveDate,
    };
  }

  /** Advance the streak when today's target is first met. Idempotent per day. */
  async recordDayCompleted(
    deviceId: string,
    intentionId: string,
    today: string,
  ): Promise<StreakResult> {
    // Bridge any missed days first so a shielded run continues instead of resetting.
    const view = await this.read(deviceId, intentionId, today);
    const existing = await this.prisma.intentionStreak.findUnique({ where: { intentionId } });

    if (existing?.lastActiveDate === today) {
      return {
        currentStreak: existing.currentStreak,
        longestStreak: existing.longestStreak,
        totalCheckIns: existing.totalCheckIns,
        shieldsUsed: view.shieldsUsed,
        milestoneName: null,
        lastActiveDate: existing.lastActiveDate,
      };
    }

    const isConsecutive = existing?.lastActiveDate === shiftDays(today, -1);
    const prevStreak = isConsecutive ? (existing?.currentStreak ?? 0) : 0;
    const newStreak = prevStreak + 1;
    const newLongest = Math.max(existing?.longestStreak ?? 0, newStreak);

    const updated = await this.prisma.intentionStreak.upsert({
      where: { intentionId },
      create: {
        deviceId,
        intentionId,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: today,
      },
      update: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: today,
      },
    });

    return {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      totalCheckIns: updated.totalCheckIns,
      shieldsUsed: view.shieldsUsed,
      milestoneName: this.getMilestoneName(newStreak, prevStreak),
      lastActiveDate: updated.lastActiveDate,
    };
  }

  private getMilestoneName(newStreak: number, previousStreak: number): string | null {
    for (const [threshold, name] of MILESTONES) {
      if (newStreak >= threshold && previousStreak < threshold) return name;
    }
    return null;
  }
}
