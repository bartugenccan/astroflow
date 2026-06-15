import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SynergyLevel } from '../../../generated/prisma/client';

@Injectable()
export class ScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getScore(userId: string) {
    const score = await this.prisma.frequencyScore.findUnique({
      where: { userId },
    });

    if (!score) {
      return this.prisma.frequencyScore.create({
        data: {
          userId,
          value: 0,
          trend: 'stable',
          synergyLevel: 'ALPHA',
          breakdown: { rituals: 0, consistency: 0, astro: 0, social: 0 },
        },
      });
    }

    return score;
  }

  async addScore(userId: string, amount: number, category: 'rituals' | 'consistency' | 'astro' | 'social') {
    const current = await this.getScore(userId);
    const breakdown = current.breakdown as Record<string, number> || {};

    const newBreakdown = {
      ...breakdown,
      [category]: (breakdown[category] || 0) + amount,
    };

    const newValue = current.value + amount;
    const trend = newValue > current.value ? 'up' : newValue < current.value ? 'down' : 'stable';
    const synergyLevel = this.calculateSynergyLevel(newValue);

    return this.prisma.frequencyScore.update({
      where: { userId },
      data: {
        value: newValue,
        trend,
        synergyLevel,
        breakdown: newBreakdown,
      },
    });
  }

  private calculateSynergyLevel(score: number): SynergyLevel {
    if (score >= 800) return 'OMEGA';
    if (score >= 600) return 'DELTA';
    if (score >= 400) return 'GAMMA';
    if (score >= 200) return 'BETA';
    return 'ALPHA';
  }
}
