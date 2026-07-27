import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  milestoneName: string | null;
}

/**
 * Device-scoped streak tracking for intentions. Day-boundary / consecutive-day
 * math is ported from the (userId-scoped, dead) gamification StreakService, on
 * YYYY-MM-DD strings. A "day complete" (daily target met) advances the streak
 * once; extra same-day check-ins only bump totalCheckIns.
 */
@Injectable()
export class IntentionStreakService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bump total check-ins for every rep, regardless of target. */
  async recordCheckIn(deviceId: string, intentionId: string): Promise<void> {
    await this.prisma.intentionStreak.upsert({
      where: { intentionId },
      create: { deviceId, intentionId, totalCheckIns: 1 },
      update: { totalCheckIns: { increment: 1 } },
    });
  }

  /** Advance the streak when today's target is first met. Idempotent per day. */
  async recordDayCompleted(
    deviceId: string,
    intentionId: string,
    today: string,
  ): Promise<StreakResult> {
    const existing = await this.prisma.intentionStreak.findUnique({ where: { intentionId } });

    if (existing?.lastActiveDate === today) {
      return {
        currentStreak: existing.currentStreak,
        longestStreak: existing.longestStreak,
        totalCheckIns: existing.totalCheckIns,
        milestoneName: null,
      };
    }

    const yesterday = this.shiftDays(today, -1);
    const isConsecutive = existing?.lastActiveDate === yesterday;
    const prevStreak = existing?.currentStreak ?? 0;
    const newStreak = isConsecutive ? prevStreak + 1 : 1;
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
      milestoneName: this.getMilestoneName(newStreak, prevStreak),
    };
  }

  private getMilestoneName(newStreak: number, previousStreak: number): string | null {
    const milestones: [number, string][] = [
      [3, '3-Day Spark'],
      [7, '7-Day Flow'],
      [14, '14-Day Wave'],
      [30, '30-Day Vortex'],
      [60, '60-Day Surge'],
      [90, '90-Day Nova'],
      [180, '180-Day Singularity'],
      [365, '365-Day Ascension'],
    ];
    for (const [threshold, name] of milestones) {
      if (newStreak >= threshold && previousStreak < threshold) return name;
    }
    return null;
  }

  private shiftDays(iso: string, delta: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + delta, 12));
    return dt.toISOString().slice(0, 10);
  }
}
