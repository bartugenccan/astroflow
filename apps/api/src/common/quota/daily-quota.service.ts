import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Daily allowances per subject and feature (`daily_quotas`).
 *
 * `take` is one atomic statement: the row is created or incremented only while
 * it is under the limit, so concurrent requests cannot both slip past the last
 * slot, and nothing a client deletes afterwards gives the slot back.
 *
 * The day defaults to UTC; free-tier limits the app also counts on the phone
 * pass the user's local day (`localToday()`) so both agree at midnight.
 */
@Injectable()
export class DailyQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Claim one use of `feature` today; false when the limit is already reached. */
  async take(deviceId: string, feature: string, limit: number, day: string = utcDay()): Promise<boolean> {
    if (limit <= 0) return false;
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO daily_quotas (day, "deviceId", feature, count)
      VALUES (${day}, ${deviceId}, ${feature}, 1)
      ON CONFLICT (day, "deviceId", feature)
      DO UPDATE SET count = daily_quotas.count + 1
      WHERE daily_quotas.count < ${limit}
      RETURNING count`;
    return rows.length > 0;
  }

  /** Whether `feature` was claimed at least once on `day` (a marker check, no claim). */
  async has(deviceId: string, feature: string, day: string = utcDay()): Promise<boolean> {
    const row = await this.prisma.dailyQuota.findUnique({
      where: { day_deviceId_feature: { day, deviceId, feature } },
      select: { count: true },
    });
    return (row?.count ?? 0) > 0;
  }
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}
