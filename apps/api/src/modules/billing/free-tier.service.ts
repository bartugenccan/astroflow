import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DailyQuotaService } from '../../common/quota/daily-quota.service';
import { DeviceEntitlementService } from '../../common/device/device-entitlement.service';
import { localToday } from '../../common/context/request-context';
import { MascotService } from '../mascot/mascot.service';
import { FREE_DAILY, FreeLimitBody, MeteredFeature, tarotReadingKey } from './free-tier';

/**
 * Server-side free tier: Premium (or beta) passes straight through; everyone
 * else gets FREE_DAILY plus today's bought passes, counted in the user's local
 * day. A refusal is a 402 `{ code: "FREE_LIMIT", feature }` — distinct from the
 * throttler's 429 — which the app turns into its limit card.
 */
@Injectable()
export class FreeTierService {
  constructor(
    private readonly quota: DailyQuotaService,
    private readonly entitlement: DeviceEntitlementService,
    private readonly mascot: MascotService,
  ) {}

  /** One Aster message. Throws 402 when today's free messages are used up. */
  async chargeCompanionMessage(deviceId: string): Promise<void> {
    if (await this.entitlement.isPremium(deviceId)) return;
    const ok = await this.quota.take(deviceId, 'free_companion', await this.limit(deviceId, 'companion'), localToday());
    if (!ok) throw limitReached('companion');
  }

  /**
   * One tarot reading, however many card/synthesis calls it takes. The marker
   * is set only after the reading was charged, so a refused reading stays
   * refused and an allowed one stays free for the rest of the day.
   */
  async chargeTarotReading(
    deviceId: string,
    spread: { spread?: string; category: string; cards: { cardId: string; reversed?: boolean }[] },
  ): Promise<void> {
    if (await this.entitlement.isPremium(deviceId)) return;
    const day = localToday();
    const marker = `free_tarot_r:${tarotReadingKey(spread)}`;
    if (await this.quota.has(deviceId, marker, day)) return;
    const ok = await this.quota.take(deviceId, 'free_tarot', await this.limit(deviceId, 'tarot'), day);
    if (!ok) throw limitReached('tarot');
    await this.quota.take(deviceId, marker, 1, day);
  }

  private async limit(deviceId: string, feature: MeteredFeature): Promise<number> {
    const passes = await this.mascot.passCount(deviceId, feature === 'companion' ? 'chat' : 'tarot').catch(() => 0);
    return FREE_DAILY[feature] + passes;
  }
}

function limitReached(feature: MeteredFeature): HttpException {
  const body: FreeLimitBody = { code: 'FREE_LIMIT', feature };
  return new HttpException(body, HttpStatus.PAYMENT_REQUIRED);
}
