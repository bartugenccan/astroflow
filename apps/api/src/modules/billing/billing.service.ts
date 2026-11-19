import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DeviceEntitlementService, PremiumState } from '../../common/device/device-entitlement.service';
import { NO_SUBSCRIPTION, SubscriptionState, subscriptionFromRevenueCat, webhookSubjects } from './subscription-rules';

const RC_API = 'https://api.revenuecat.com/v1';
const TIMEOUT_MS = 8000;

/**
 * Keeps `subscriptions` in step with RevenueCat. RevenueCat is the source of
 * truth: both the app's /billing/sync and the webhook re-read the subscriber
 * over REST and overwrite the row; webhook bodies are never trusted.
 * Without REVENUECAT_SECRET_KEY the sync is a no-op (beta / not set up yet).
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly secretKey: string;
  private readonly webhookAuth: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlement: DeviceEntitlementService,
    config: ConfigService,
  ) {
    this.secretKey = (config.get<string>('REVENUECAT_SECRET_KEY') ?? '').trim();
    this.webhookAuth = (config.get<string>('REVENUECAT_WEBHOOK_AUTH') ?? '').trim();
  }

  get configured(): boolean {
    return this.secretKey.length > 0;
  }

  /** Re-read one subject from RevenueCat, store it, and return the app-facing state. */
  async sync(deviceId: string): Promise<PremiumState> {
    if (this.configured) {
      try {
        await this.refresh(deviceId);
      } catch (err) {
        // The app still gets the last known state; the webhook will catch up.
        this.logger.warn(`billing sync failed: ${err instanceof Error ? err.name : 'unknown'}`);
      }
    }
    return this.entitlement.premiumState(deviceId);
  }

  /** True when the webhook's Authorization header matches the configured secret. */
  webhookAuthorized(header: string | undefined): boolean {
    if (!this.webhookAuth || !header) return false;
    const a = Buffer.from(header.trim());
    const b = Buffer.from(this.webhookAuth);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Webhook: re-read every app user id the event names (incl. transfer
   * sources/targets). Throws 503 when RevenueCat can't be read, so it retries.
   */
  async handleWebhook(body: unknown): Promise<number> {
    if (!this.configured) throw new ServiceUnavailableException('Billing not configured');
    const ids = webhookSubjects(body);
    for (const id of ids) {
      try {
        await this.refresh(id);
      } catch {
        throw new ServiceUnavailableException('RevenueCat unavailable');
      }
    }
    return ids.length;
  }

  private async refresh(deviceId: string): Promise<SubscriptionState> {
    const state = await this.fetchState(deviceId);
    const data = {
      active: state.active,
      productId: state.productId,
      expiresAt: state.expiresAt,
      store: state.store,
      environment: state.environment,
      willRenew: state.willRenew,
    };
    if (!state.active && state.productId === null) {
      // Nothing at RevenueCat: drop any stale row instead of keeping an empty one.
      await this.prisma.subscription.deleteMany({ where: { deviceId } });
      return { ...NO_SUBSCRIPTION };
    }
    await this.prisma.subscription.upsert({ where: { deviceId }, create: { deviceId, ...data }, update: data });
    return state;
  }

  private async fetchState(appUserId: string): Promise<SubscriptionState> {
    const res = await fetch(`${RC_API}/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`RevenueCat HTTP ${res.status}`);
    return subscriptionFromRevenueCat(await res.json());
  }
}
