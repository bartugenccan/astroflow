/**
 * Subscription rules — pure, dependency-free, unit-testable.
 *
 * Reads RevenueCat's REST v1 subscriber payload (GET /v1/subscribers/{id}) and
 * turns it into the one thing the app cares about: is the "premium"
 * entitlement active right now, and until when.
 */

export const PREMIUM_ENTITLEMENT = 'premium';

export interface SubscriptionState {
  active: boolean;
  productId: string | null;
  /** Null for a lifetime purchase (or when there is no entitlement at all). */
  expiresAt: Date | null;
  store: string | null;
  /** "SANDBOX" | "PRODUCTION" | null — support info only, never a gate. */
  environment: string | null;
  willRenew: boolean;
}

export const NO_SUBSCRIPTION: SubscriptionState = {
  active: false,
  productId: null,
  expiresAt: null,
  store: null,
  environment: null,
  willRenew: false,
};

type Json = Record<string, unknown>;

function obj(v: unknown): Json | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null;
}

function date(v: unknown): Date | null {
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Active when the entitlement exists and either never expires, has not expired,
 * or is inside a billing grace period.
 */
export function isEntitlementActive(expiresAt: Date | null, graceUntil: Date | null, now: Date, exists = true): boolean {
  if (!exists) return false;
  if (expiresAt === null) return true;
  if (expiresAt.getTime() > now.getTime()) return true;
  return graceUntil !== null && graceUntil.getTime() > now.getTime();
}

/** RevenueCat v1 subscriber response → our state. Unknown shapes read as "no subscription". */
export function subscriptionFromRevenueCat(payload: unknown, now: Date = new Date()): SubscriptionState {
  const subscriber = obj(obj(payload)?.subscriber);
  const ent = obj(obj(subscriber?.entitlements)?.[PREMIUM_ENTITLEMENT]);
  if (!subscriber || !ent) return { ...NO_SUBSCRIPTION };

  const productId = typeof ent.product_identifier === 'string' ? ent.product_identifier : null;
  const expiresAt = date(ent.expires_date);
  const grace = date(ent.grace_period_expires_date);
  const sub = productId ? obj(obj(subscriber.subscriptions)?.[productId]) : null;

  return {
    active: isEntitlementActive(expiresAt, grace, now),
    productId,
    expiresAt,
    store: typeof sub?.store === 'string' ? sub.store : null,
    environment: sub ? (sub.is_sandbox === true ? 'SANDBOX' : 'PRODUCTION') : null,
    // Renews unless the user turned auto-renew off or billing is failing; lifetime never "renews".
    willRenew: !!sub && expiresAt !== null && !sub.unsubscribe_detected_at && !sub.billing_issues_detected_at,
  };
}

/** A stored row is still Premium at `now` (the cache can outlive an expiry the webhook missed). */
export function isStoredActive(row: { active: boolean; expiresAt: Date | null } | null, now: Date = new Date()): boolean {
  if (!row || !row.active) return false;
  return row.expiresAt === null || row.expiresAt.getTime() > now.getTime();
}

/** The app user ids a RevenueCat webhook event is about (all of them get re-read). */
export function webhookSubjects(body: unknown): string[] {
  const event = obj(obj(body)?.event);
  if (!event) return [];
  const ids = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === 'string' && v && !v.startsWith('$RCAnonymousID')) ids.add(v);
  };
  add(event.app_user_id);
  add(event.original_app_user_id);
  for (const key of ['aliases', 'transferred_from', 'transferred_to']) {
    const list = event[key];
    if (Array.isArray(list)) list.forEach(add);
  }
  return [...ids].slice(0, 20);
}
