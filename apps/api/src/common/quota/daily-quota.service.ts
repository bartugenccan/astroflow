import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Daily allowances per subject and feature (`daily_quotas`, UTC day).
 *
 * `take` is one atomic statement: the row is created or incremented only while
 * it is under the limit, so concurrent requests cannot both slip past the last
 * slot, and nothing a client deletes afterwards gives the slot back.
 */
@Injectable()
export class DailyQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Claim one use of `feature` today; false when the limit is already reached. */
  async take(deviceId: string, feature: string, limit: number): Promise<boolean> {
    if (limit <= 0) return false;
    const day = new Date().toISOString().slice(0, 10);
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO daily_quotas (day, "deviceId", feature, count)
      VALUES (${day}, ${deviceId}, ${feature}, 1)
      ON CONFLICT (day, "deviceId", feature)
      DO UPDATE SET count = daily_quotas.count + 1
      WHERE daily_quotas.count < ${limit}
      RETURNING count`;
    return rows.length > 0;
  }
}
