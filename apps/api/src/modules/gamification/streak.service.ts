import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RitualType } from '../../../generated/prisma/client';

export interface CompleteRitualResult {
  ritualCompleted: boolean;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  starPointsEarned: number;
  streakMultiplier: number;
  totalStarPoints: number;
  milestoneReached: boolean;
  milestoneName: string | null;
}

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStreaks(userId: string) {
    return this.prisma.userStreak.findMany({
      where: { userId },
      orderBy: { ritualType: 'asc' },
    });
  }

  async getStreak(userId: string, ritualType: RitualType) {
    return this.prisma.userStreak.findUnique({
      where: { userId_ritualType: { userId, ritualType } },
    });
  }

  async completeRitual(
    userId: string,
    ritualType: RitualType,
    durationMinutes: number = 0,
    notes?: string,
  ): Promise<CompleteRitualResult> {
    const today = this.startOfDay(new Date());
    const yesterday = this.startOfDay(new Date(Date.now() - 86400000));

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, starPoints: true, timezone: true },
      });

      const existing = await tx.userStreak.findUnique({
        where: { userId_ritualType: { userId, ritualType } },
      });

      const alreadyCompletedToday =
        existing &&
        this.startOfDay(new Date(existing.lastActiveDate)).getTime() === today.getTime();

      if (alreadyCompletedToday) {
        return {
          ritualCompleted: false,
          currentStreak: existing.currentStreak,
          longestStreak: existing.longestStreak,
          totalCompletions: existing.totalCompletions,
          starPointsEarned: 0,
          streakMultiplier: 1,
          totalStarPoints: user.starPoints,
          milestoneReached: false,
          milestoneName: null,
        };
      }

      const isConsecutive =
        existing &&
        this.startOfDay(new Date(existing.lastActiveDate)).getTime() === yesterday.getTime();

      const newStreak = !existing ? 1 : isConsecutive ? existing.currentStreak + 1 : 1;
      const newLongest = existing ? Math.max(existing.longestStreak, newStreak) : newStreak;
      const newTotalCompletions = (existing?.totalCompletions ?? 0) + 1;

      const multiplier = this.calculateMultiplier(newStreak);
      const basePoints = 10;
      const starPointsEarned = Math.round(basePoints * multiplier);

      const milestoneName = this.getMilestoneName(newStreak, existing?.currentStreak ?? 0);

      await tx.userStreak.upsert({
        where: { userId_ritualType: { userId, ritualType } },
        create: {
          userId,
          ritualType,
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
          totalCompletions: newTotalCompletions,
        },
        update: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
          totalCompletions: newTotalCompletions,
        },
      });

      await tx.ritualLog.create({
        data: {
          userId,
          ritualType,
          frequencyBoost: starPointsEarned,
          durationMinutes,
          notes: notes ?? null,
        },
      });

      const newStarPoints = user.starPoints + starPointsEarned;
      await tx.user.update({
        where: { id: userId },
        data: { starPoints: newStarPoints },
      });

      return {
        ritualCompleted: true,
        currentStreak: newStreak,
        longestStreak: newLongest,
        totalCompletions: newTotalCompletions,
        starPointsEarned,
        streakMultiplier: multiplier,
        totalStarPoints: newStarPoints,
        milestoneReached: milestoneName !== null,
        milestoneName,
      };
    });

    return result;
  }

  async resetExpiredStreaks(): Promise<{ resetCount: number }> {
    const dayBeforeYesterday = this.startOfDay(new Date(Date.now() - 172800000));

    const result = await this.prisma.$transaction(async (tx) => {
      const expired = await tx.userStreak.findMany({
        where: {
          lastActiveDate: { lte: dayBeforeYesterday },
          currentStreak: { gt: 0 },
        },
        select: { userId: true, ritualType: true, currentStreak: true },
      });

      if (expired.length === 0) {
        return { resetCount: 0 };
      }

      const updateResult = await tx.userStreak.updateMany({
        where: {
          lastActiveDate: { lte: dayBeforeYesterday },
          currentStreak: { gt: 0 },
        },
        data: { currentStreak: 0 },
      });

      this.logger.log(
        `Streak reset complete: ${updateResult.count} streaks reset for ${expired.length} users`,
      );

      return { resetCount: updateResult.count };
    });

    return result;
  }

  private calculateMultiplier(streak: number): number {
    if (streak >= 90) return 10;
    if (streak >= 60) return 8;
    if (streak >= 30) return 5;
    if (streak >= 14) return 3;
    if (streak >= 7) return 2;
    return 1;
  }

  private getMilestoneName(
    newStreak: number,
    previousStreak: number,
  ): string | null {
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
      if (newStreak >= threshold && previousStreak < threshold) {
        return name;
      }
    }

    return null;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
