import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FeatureType } from '../../../generated/prisma/client';

const FEATURE_COSTS: Record<FeatureType, number> = {
  [FeatureType.TRANSIT_CHART]: 100,
  [FeatureType.COMPATIBILITY]: 200,
  [FeatureType.DEEP_INSIGHT]: 300,
  [FeatureType.PREMIUM_RITUAL]: 500,
  [FeatureType.ADVANCED_CYMATICS]: 750,
};

@Injectable()
export class UnlockService {
  constructor(private readonly prisma: PrismaService) {}

  async getUnlockedFeatures(userId: string) {
    return this.prisma.unlockedFeature.findMany({
      where: { userId },
      select: { featureType: true, unlockedAt: true },
    });
  }

  async isFeatureUnlocked(userId: string, featureType: FeatureType): Promise<boolean> {
    const existing = await this.prisma.unlockedFeature.findUnique({
      where: { userId_featureType: { userId, featureType } },
    });
    return existing !== null;
  }

  async unlockFeature(
    userId: string,
    featureType: FeatureType,
  ): Promise<{
    success: boolean;
    starPointsSpent: number;
    remainingStarPoints: number;
    featureType: FeatureType;
    unlockedAt: Date;
  }> {
    const cost = FEATURE_COSTS[featureType];

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, starPoints: true },
      });

      const alreadyUnlocked = await tx.unlockedFeature.findUnique({
        where: { userId_featureType: { userId, featureType } },
      });

      if (alreadyUnlocked) {
        throw new BadRequestException(
          `Feature ${featureType} is already unlocked`,
        );
      }

      if (user.starPoints < cost) {
        throw new BadRequestException(
          `Insufficient star points. Required: ${cost}, Available: ${user.starPoints}`,
        );
      }

      const newBalance = user.starPoints - cost;

      const unlocked = await tx.unlockedFeature.create({
        data: { userId, featureType },
      });

      await tx.user.update({
        where: { id: userId },
        data: { starPoints: newBalance },
      });

      return {
        success: true,
        starPointsSpent: cost,
        remainingStarPoints: newBalance,
        featureType: unlocked.featureType,
        unlockedAt: unlocked.unlockedAt,
      };
    });

    return result;
  }

  getFeatureCost(featureType: FeatureType): number {
    return FEATURE_COSTS[featureType];
  }

  getAllFeatureCosts(): { featureType: FeatureType; cost: number }[] {
    return Object.entries(FEATURE_COSTS).map(([key, cost]) => ({
      featureType: key as FeatureType,
      cost,
    }));
  }
}
