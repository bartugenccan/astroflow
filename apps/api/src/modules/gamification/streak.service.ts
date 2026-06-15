import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RitualType } from '../../../generated/prisma/client';

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  async getStreaks(userId: string) {
    return this.prisma.userStreak.findMany({
      where: { userId },
      orderBy: { ritualType: 'asc' },
    });
  }

  async getStreak(userId: string, ritualType: RitualType) {
    return this.prisma.userStreak.findUnique({
      where: {
        userId_ritualType: { userId, ritualType },
      },
    });
  }

  async recordCompletion(userId: string, ritualType: RitualType): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalCompletions: number;
    streakUpdated: boolean;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.userStreak.findUnique({
      where: {
        userId_ritualType: { userId, ritualType },
      },
    });

    if (!existing) {
      const created = await this.prisma.userStreak.create({
        data: {
          userId,
          ritualType,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
          totalCompletions: 1,
        },
      });

      return {
        currentStreak: created.currentStreak,
        longestStreak: created.longestStreak,
        totalCompletions: created.totalCompletions,
        streakUpdated: true,
      };
    }

    const lastActive = new Date(existing.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isConsecutive = lastActive.getTime() === yesterday.getTime();
    const isToday = lastActive.getTime() === today.getTime();

    if (isToday) {
      return {
        currentStreak: existing.currentStreak,
        longestStreak: existing.longestStreak,
        totalCompletions: existing.totalCompletions,
        streakUpdated: false,
      };
    }

    const newStreak = isConsecutive ? existing.currentStreak + 1 : 1;
    const newLongest = Math.max(existing.longestStreak, newStreak);

    const updated = await this.prisma.userStreak.update({
      where: {
        userId_ritualType: { userId, ritualType },
      },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: today,
        totalCompletions: existing.totalCompletions + 1,
      },
    });

    return {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      totalCompletions: updated.totalCompletions,
      streakUpdated: true,
    };
  }

  async resetExpiredStreaks(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    yesterday.setHours(23, 59, 59, 999);

    const result = await this.prisma.userStreak.updateMany({
      where: {
        lastActiveDate: {
          lte: yesterday,
        },
        currentStreak: { gt: 0 },
      },
      data: {
        currentStreak: 0,
      },
    });

    return result.count;
  }

  async logRitualCompletion(
    userId: string,
    ritualType: RitualType,
    frequencyBoost: number,
    durationMinutes: number,
    notes?: string,
  ) {
    return this.prisma.ritualLog.create({
      data: {
        userId,
        ritualType,
        frequencyBoost,
        durationMinutes,
        notes,
      },
    });
  }
}
