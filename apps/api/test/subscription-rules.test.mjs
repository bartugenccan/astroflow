// Unit tests for the RevenueCat subscription rules. Run: npm test --workspace @astroflow/api
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  subscriptionFromRevenueCat,
  isEntitlementActive,
  isStoredActive,
  webhookSubjects,
} from '../src/modules/billing/subscription-rules.ts';

const NOW = new Date('2026-11-20T12:00:00Z');

function payload(ent, subs = {}) {
  return { subscriber: { entitlements: ent ? { premium: ent } : {}, subscriptions: subs } };
}

test('no entitlement reads as not premium', () => {
  const s = subscriptionFromRevenueCat(payload(null), NOW);
  assert.equal(s.active, false);
  assert.equal(s.productId, null);
});

test('garbage payload reads as not premium', () => {
  for (const p of [null, 'x', 42, {}, { subscriber: 'nope' }]) {
    assert.equal(subscriptionFromRevenueCat(p, NOW).active, false);
  }
});

test('active yearly with renewal', () => {
  const s = subscriptionFromRevenueCat(
    payload(
      { product_identifier: 'yearly', expires_date: '2027-11-20T12:00:00Z' },
      { yearly: { store: 'app_store', is_sandbox: true, unsubscribe_detected_at: null, billing_issues_detected_at: null } },
    ),
    NOW,
  );
  assert.equal(s.active, true);
  assert.equal(s.productId, 'yearly');
  assert.equal(s.environment, 'SANDBOX');
  assert.equal(s.store, 'app_store');
  assert.equal(s.willRenew, true);
});

test('expired entitlement is not active, grace period keeps it', () => {
  const expired = { product_identifier: 'monthly', expires_date: '2026-11-19T12:00:00Z' };
  assert.equal(subscriptionFromRevenueCat(payload(expired), NOW).active, false);
  const inGrace = { ...expired, grace_period_expires_date: '2026-11-25T12:00:00Z' };
  assert.equal(subscriptionFromRevenueCat(payload(inGrace), NOW).active, true);
});

test('cancelled but unexpired stays active and does not renew', () => {
  const s = subscriptionFromRevenueCat(
    payload(
      { product_identifier: 'monthly', expires_date: '2026-12-01T00:00:00Z' },
      { monthly: { store: 'app_store', is_sandbox: false, unsubscribe_detected_at: '2026-11-10T00:00:00Z' } },
    ),
    NOW,
  );
  assert.equal(s.active, true);
  assert.equal(s.willRenew, false);
  assert.equal(s.environment, 'PRODUCTION');
});

test('lifetime (null expiry) is active', () => {
  assert.equal(isEntitlementActive(null, null, NOW), true);
  assert.equal(subscriptionFromRevenueCat(payload({ product_identifier: 'life', expires_date: null }), NOW).active, true);
});

test('stored row expires on its own date even without a webhook', () => {
  assert.equal(isStoredActive({ active: true, expiresAt: new Date('2026-11-21T00:00:00Z') }, NOW), true);
  assert.equal(isStoredActive({ active: true, expiresAt: new Date('2026-11-19T00:00:00Z') }, NOW), false);
  assert.equal(isStoredActive({ active: false, expiresAt: null }, NOW), false);
  assert.equal(isStoredActive(null, NOW), false);
});

test('webhook subjects collect every id, skip anonymous RevenueCat ids', () => {
  const ids = webhookSubjects({
    event: {
      type: 'TRANSFER',
      app_user_id: 'a',
      original_app_user_id: 'b',
      aliases: ['a', '$RCAnonymousID:123'],
      transferred_from: ['c'],
      transferred_to: ['d'],
    },
  });
  assert.deepEqual(ids.sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual(webhookSubjects({}), []);
});
