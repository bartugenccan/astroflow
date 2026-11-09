import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Moves everything one subject owns onto another, in one transaction. Used
 * when an install that has been working anonymously signs in to an existing
 * account: whatever it created meanwhile (usually just the onboarding chart)
 * joins the account, and where only one row may exist the account's wins.
 *
 * Every device-keyed table must be listed here and in DeviceDataService.
 */
@Injectable()
export class SubjectMergeService {
  constructor(private readonly prisma: PrismaService) {}

  async merge(from: string, into: string): Promise<void> {
    if (from === into) return;
    const where = { deviceId: from };
    const move = { deviceId: into };

    await this.prisma.$transaction(async (tx) => {
      // One chart per subject: the account's chart stays.
      const intoChart = await tx.deviceChart.findUnique({ where: { deviceId: into }, select: { id: true } });
      if (intoChart) await tx.deviceChart.deleteMany({ where });
      else await tx.deviceChart.updateMany({ where, data: move });

      // Unique per (subject, feature): keep the account's, move the rest.
      const owned = await tx.deviceUnlockedFeature.findMany({
        where: { deviceId: into },
        select: { featureType: true },
      });
      await tx.deviceUnlockedFeature.deleteMany({
        where: { deviceId: from, featureType: { in: owned.map((o) => o.featureType) } },
      });
      await tx.deviceUnlockedFeature.updateMany({ where, data: move });

      // Daily AI counters add up, so merging can't reset a budget.
      await tx.$executeRaw`
        INSERT INTO ai_usage (day, "deviceId", count)
        SELECT day, ${into}, count FROM ai_usage WHERE "deviceId" = ${from}
        ON CONFLICT (day, "deviceId") DO UPDATE SET count = ai_usage.count + EXCLUDED.count`;
      await tx.aiUsage.deleteMany({ where });
      await tx.$executeRaw`
        INSERT INTO daily_quotas (day, "deviceId", feature, count)
        SELECT day, ${into}, feature, count FROM daily_quotas WHERE "deviceId" = ${from}
        ON CONFLICT (day, "deviceId", feature) DO UPDATE SET count = daily_quotas.count + EXCLUDED.count`;
      await tx.dailyQuota.deleteMany({ where });

      // No per-subject uniqueness: rows simply change owner.
      await tx.chatMessage.updateMany({ where, data: move });
      await tx.memoryEntry.updateMany({ where, data: move });
      await tx.intention.updateMany({ where, data: move });
      await tx.intentionCheckIn.updateMany({ where, data: move });
      await tx.intentionStreak.updateMany({ where, data: move });
      await tx.savedPerson.updateMany({ where, data: move });
      await tx.interpretation.updateMany({ where, data: move });
      await tx.report.updateMany({ where, data: move });
    });
  }
}
