import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { safeError } from '../../common/logging/safe-error';
import { AiBudgetLimits, AiBudgetScope, aiBudgetCounters } from './ai-budget-rules';

export class AiBudgetExceeded extends Error {
  constructor(readonly scope: AiBudgetScope) {
    super(`AI daily budget exceeded (${scope})`);
    this.name = 'AiBudgetExceeded';
  }
}

/** Subjects whose first-install time is kept in memory (it never changes). */
const AGE_CACHE_MAX = 5000;

/**
 * Daily caps on AI generations that actually reach the provider (cache hits
 * never get here). Counted per device, for devices younger than a day as a
 * pool, and system-wide in `ai_usage`, keyed by UTC day, so a leaked or
 * scripted client — or a farm of freshly minted devices — can only burn a
 * bounded slice of the provider budget per day (`ai-budget-rules.ts`).
 */
@Injectable()
export class AiBudgetService {
  private readonly logger = new Logger(AiBudgetService.name);
  private readonly limits: AiBudgetLimits;
  /** subjectId → first install's registration time (ms), or null for unknown (legacy) ids. */
  private readonly registeredAt = new Map<string, number | null>();

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.limits = {
      perDevice: config.get<number>('AI_DAILY_PER_DEVICE') ?? 300,
      global: config.get<number>('AI_DAILY_GLOBAL') ?? 20000,
      perNewDevice: config.get<number>('AI_DAILY_PER_NEW_DEVICE') ?? 100,
      newDevicesGlobal: config.get<number>('AI_DAILY_NEW_DEVICES') ?? 10000,
    };
  }

  /**
   * Count one generation for `deviceId` (and its pools); throws once a cap is
   * passed. Counters are charged in order and a refused call stops there, so
   * one token cannot exhaust everyone's budget by hammering its own cap.
   */
  async consume(deviceId: string | undefined): Promise<void> {
    const day = new Date().toISOString().slice(0, 10);
    try {
      const counters = aiBudgetCounters(deviceId, await this.ageOf(deviceId), this.limits);
      for (const counter of counters) {
        const count = await this.bump(day, counter.key);
        if (count > counter.cap) {
          if (counter.scope !== 'device' && count === counter.cap + 1) {
            this.logger.warn(`${counter.scope} AI budget reached (${counter.cap}/day)`);
          }
          throw new AiBudgetExceeded(counter.scope);
        }
      }
    } catch (err) {
      if (err instanceof AiBudgetExceeded) throw err;
      // Fail closed: without a working counter nothing bounds spend. The caller
      // serves its templated stub, which is never cached.
      this.logger.warn(`AI budget check failed closed: ${safeError(err)}`);
      throw err;
    }
  }

  /** Remaining generations for a device today (for e.g. pre-flighting a long report). */
  async remainingForDevice(deviceId: string): Promise<number> {
    const day = new Date().toISOString().slice(0, 10);
    const [own] = aiBudgetCounters(deviceId, await this.ageOf(deviceId), this.limits);
    const row = await this.prisma.aiUsage.findUnique({
      where: { day_deviceId: { day, deviceId } },
      select: { count: true },
    });
    return Math.max(0, own.cap - (row?.count ?? 0));
  }

  /**
   * How long ago the subject's first install registered (a subject id is the
   * id of the install that created it), or null when there is no such row.
   */
  private async ageOf(deviceId: string | undefined): Promise<number | null> {
    if (!deviceId) return null;
    let at = this.registeredAt.get(deviceId);
    if (at === undefined) {
      const row = await this.prisma.deviceIdentity.findUnique({
        where: { deviceId },
        select: { createdAt: true },
      });
      at = row ? row.createdAt.getTime() : null;
      this.registeredAt.set(deviceId, at);
      if (this.registeredAt.size > AGE_CACHE_MAX) {
        this.registeredAt.delete(this.registeredAt.keys().next().value as string);
      }
    }
    return at === null ? null : Date.now() - at;
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
