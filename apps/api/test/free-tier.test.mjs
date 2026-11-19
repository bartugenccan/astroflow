// Unit tests for the Aster message allowance (free tier + Premium fair use). Run: npm test --workspace @astroflow/api
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM_DAILY, companionAllowance } from '../src/modules/billing/free-tier.ts';

test('free users draw from their own allowance and are sent to the paywall', () => {
  assert.deepEqual(companionAllowance(false, 5), { quotaKey: 'free_companion', limit: 5, refusal: 'FREE_LIMIT' });
  // Bought passes raise the free limit, never the Premium one.
  assert.equal(companionAllowance(false, 10).limit, 10);
});

test('Premium is capped at 100 messages a day and refused with FAIR_USE, never the paywall', () => {
  assert.equal(PREMIUM_DAILY.companion, 100);
  assert.deepEqual(companionAllowance(true, 0), { quotaKey: 'premium_companion', limit: 100, refusal: 'FAIR_USE' });
});

test('Premium and free counters are separate, so going Premium mid-day starts a fresh count', () => {
  assert.notEqual(companionAllowance(true, 0).quotaKey, companionAllowance(false, 5).quotaKey);
});
