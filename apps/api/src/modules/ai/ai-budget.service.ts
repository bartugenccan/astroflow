import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { safeError } from '../../common/logging/safe-error';

export class AiBudgetExceeded extends Error {
  constructor(readonly scope: 'device' | 'global') {
    super(`AI daily budget exceeded (${scope})`);
    this.name = 'AiBudgetExceeded';
  }
}

const GLOBAL = '*';

/**
 * Daily caps on AI generations that actually reach the provider (cache hits
 * never get here). Counted per device and system-wide in `ai_usage`, keyed by
 * UTC day, so a leaked or scripted client can only burn a bounded slice of the
 * prepaid DeepSeek balance per day.
 */
@Injectable()
export class AiBudgetService {
  private readonly logger = new Logger(AiBudgetService.name);
  private readonly perDevice: number;
  private readonly global: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.perDevice = config.get<number>('AI_DAILY_PER_DEVICE') ?? 300;
    this.global = config.get<number>('AI_DAILY_GLOBAL') ?? 20000;
  }

  /** Count one generation for `deviceId` (and globally); throws once a cap is passed. */
  async consume(deviceId: string | undefined): Promise<void> {
    const day = new Date().toISOString().slice(0, 10);
    try {
      const globalCount = await this.bump(day, GLOBAL);
      if (globalCount > this.global) {
        if (globalCount === this.global + 1) this.logger.warn(`global AI budget reached (${this.global}/day)`);
        throw new AiBudgetExceeded('global');
      }
      if (deviceId) {
        const deviceCount = await this.bump(day, deviceId);
        if (deviceCount > this.perDevice) throw new AiBudgetExceeded('device');
      }
    } catch (err) {
      if (err instanceof AiBudgetExceeded) throw err;
      // Counting must never take the feature down: if the DB hiccups, allow the call.
      this.logger.warn(`AI budget check failed open: ${safeError(err)}`);
    }
  }

  /** Remaining generations for a device today (for e.g. pre-flighting a long report). */
  async remainingForDevice(deviceId: string): Promise<number> {
    const day = new Date().toISOString().slice(0, 10);
    const row = await this.prisma.aiUsage.findUnique({
      where: { day_deviceId: { day, deviceId } },
      select: { count: true },
    });
    return Math.max(0, this.perDevice - (row?.count ?? 0));
  }

  private async bump(day: string, deviceId: string): Promise<number> {
    const row = await this.prisma.aiUsage.upsert({
      where: { day_deviceId: { day, deviceId } },
      create: { day, deviceId, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    return row.count;
  }
}
