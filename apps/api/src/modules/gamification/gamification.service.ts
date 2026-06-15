import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StreakService, CompleteRitualResult } from './streak.service';
import { ScoreService } from './score.service';
import { UnlockService } from './unlock.service';
import { RitualType, FeatureType } from '../../../generated/prisma/client';

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streakService: StreakService,
    private readonly scoreService: ScoreService,
    private readonly unlockService: UnlockService,
  ) {}

  async completeRitual(
    userId: string,
    ritualType: RitualType,
    durationMinutes?: number,
    notes?: string,
  ): Promise<CompleteRitualResult & { frequencyScore: number }> {
    const streakResult = await this.streakService.completeRitual(
      userId,
      ritualType,
      durationMinutes,
      notes,
    );

    if (!streakResult.ritualCompleted) {
      throw new BadRequestException('This ritual was already completed today');
    }

    const category = this.mapRitualToCategory(ritualType);
    const freqBoost = Math.round(streakResult.starPointsEarned * 0.6);
    const updatedScore = await this.scoreService.addScore(userId, freqBoost, category);

    return {
      ...streakResult,
      frequencyScore: updatedScore.value,
    };
  }

  async unlockFeature(
    userId: string,
    featureType: FeatureType,
  ) {
    return this.unlockService.unlockFeature(userId, featureType);
  }

  async getStatus(userId: string) {
    const [user, streaks, unlockedFeatures, frequencyScore] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { starPoints: true },
        }),
        this.streakService.getStreaks(userId),
        this.unlockService.getUnlockedFeatures(userId),
        this.scoreService.getScore(userId),
      ]);

    return {
      starPoints: user.starPoints,
      streaks,
      unlockedFeatures: unlockedFeatures.map((f) => ({
        featureType: f.featureType,
        unlockedAt: f.unlockedAt,
        cost: this.unlockService.getFeatureCost(f.featureType),
      })),
      availableFeatures: this.unlockService
        .getAllFeatureCosts()
        .filter(
          (f) =>
            !unlockedFeatures.some((uf) => uf.featureType === f.featureType),
        )
        .map((f) => ({
          featureType: f.featureType,
          cost: f.cost,
          canAfford: user.starPoints >= f.cost,
        })),
      frequencyScore: {
        value: frequencyScore.value,
        synergyLevel: frequencyScore.synergyLevel,
        trend: frequencyScore.trend,
        breakdown: frequencyScore.breakdown,
      },
    };
  }

  private mapRitualToCategory(
    ritualType: RitualType,
  ): 'rituals' | 'consistency' | 'astro' | 'social' {
    switch (ritualType) {
      case 'WATER_PROGRAMMING':
      case 'BREATHWORK':
      case 'FREQUENCY_TUNING':
        return 'rituals';
      case 'KINETIC_SYNC':
        return 'consistency';
      case 'GROUNDING':
      case 'LIGHT_EXPOSURE':
        return 'astro';
      default:
        return 'rituals';
    }
  }
}
