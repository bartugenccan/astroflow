import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  MergeableMascot,
  mergeMascotState,
  partitionMergeEvents,
  stageFor,
} from '../../mascot/mascot-rules';

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

      await this.mergeMascot(tx, from, into);
    });
  }

  /**
   * Aster: events join the account unless they would double-count (same
   * unique key, or a once-ever award already earned), and the state rows
   * fold into one with exactly the moved Işık added.
   */
  private async mergeMascot(tx: Tx, from: string, into: string): Promise<void> {
    const pick = { id: true, kind: true, localDate: true, refKey: true, xp: true } as const;
    const [fromEvents, intoEvents] = await Promise.all([
      tx.mascotEvent.findMany({ where: { deviceId: from }, select: pick }),
      tx.mascotEvent.findMany({ where: { deviceId: into }, select: pick }),
    ]);
    const { moveIds, dropIds, movedXp } = partitionMergeEvents(fromEvents, intoEvents);
    if (dropIds.length) await tx.mascotEvent.deleteMany({ where: { id: { in: dropIds } } });
    if (moveIds.length) await tx.mascotEvent.updateMany({ where: { id: { in: moveIds } }, data: { deviceId: into } });

    const [fromState, intoState] = await Promise.all([
      tx.mascotState.findUnique({ where: { deviceId: from } }),
      tx.mascotState.findUnique({ where: { deviceId: into } }),
    ]);
    if (!fromState) return;
    const merged = mergeMascotState(intoState ? asMergeable(intoState) : null, asMergeable(fromState), movedXp);
    const data = { ...merged, stage: stageFor(merged.xp, !!merged.hatchedAt) };
    await tx.mascotState.delete({ where: { deviceId: from } });
    await tx.mascotState.upsert({ where: { deviceId: into }, create: { deviceId: into, ...data }, update: data });
  }
}

type Tx = Prisma.TransactionClient;

function ids(json: unknown): string[] {
  return Array.isArray(json) ? json.filter((v): v is string => typeof v === 'string') : [];
}

function asMergeable(row: {
  xp: number;
  stardust: number;
  shields: number;
  equipped: unknown;
  owned: unknown;
  lastFreeShieldWeek: string | null;
  hatchedAt: Date | null;
}): MergeableMascot {
  return {
    xp: row.xp,
    stardust: row.stardust,
    shields: row.shields,
    equipped: ids(row.equipped),
    owned: ids(row.owned),
    lastFreeShieldWeek: row.lastFreeShieldWeek,
    hatchedAt: row.hatchedAt,
  };
}
