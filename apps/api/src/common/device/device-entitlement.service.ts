import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureType } from '../../../generated/prisma/client';
import { isStoredActive } from '../../modules/billing/subscription-rules';

export interface PremiumState {
  premium: boolean;
  /** Why: "beta" (everyone), "subscription", or null when not Premium. */
  source: 'beta' | 'subscription' | null;
  expiresAt: string | null;
  willRenew: boolean;
  productId: string | null;
}

/**
 * Subject-scoped entitlements. Premium comes from the `subscriptions` row
 * (RevenueCat "premium", refreshed by /billing/sync and the webhook) or from
 * PREMIUM_BETA. Per-feature unlocks (`device_unlocked_features`) stay for the
 * dev stub; a Premium subject has every feature.
 */
@Injectable()
export class DeviceEntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Beta: everything Premium is open to everyone. */
  get premiumBeta(): boolean {
    return this.config.get<boolean>('PREMIUM_BETA') === true;
  }

  async premiumState(deviceId: string): Promise<PremiumState> {
    const row = await this.prisma.subscription.findUnique({ where: { deviceId } }).catch(() => null);
    const subscribed = isStoredActive(row);
    const premium = this.premiumBeta || subscribed;
    return {
      premium,
      source: subscribed ? 'subscription' : this.premiumBeta ? 'beta' : null,
      expiresAt: subscribed && row?.expiresAt ? row.expiresAt.toISOString() : null,
      willRenew: subscribed ? !!row?.willRenew : false,
      productId: subscribed ? (row?.productId ?? null) : null,
    };
  }

  async isPremium(deviceId: string): Promise<boolean> {
    return (await this.premiumState(deviceId)).premium;
  }

  async isFeatureUnlocked(deviceId: string, featureType: FeatureType): Promise<boolean> {
    if (await this.isPremium(deviceId)) return true;
    try {
      const hit = await this.prisma.deviceUnlockedFeature.findUnique({
        where: { deviceId_featureType: { deviceId, featureType } },
      });
      return hit !== null;
    } catch {
      return false;
    }
  }

  async unlock(deviceId: string, featureType: FeatureType): Promise<void> {
    await this.prisma.deviceUnlockedFeature.upsert({
      where: { deviceId_featureType: { deviceId, featureType } },
      create: { deviceId, featureType },
      update: {},
    });
  }

  async listUnlocked(deviceId: string): Promise<FeatureType[]> {
    if (await this.isPremium(deviceId)) return Object.values(FeatureType);
    const rows = await this.prisma.deviceUnlockedFeature.findMany({
      where: { deviceId },
      select: { featureType: true },
    });
    return rows.map((r) => r.featureType);
  }
}
