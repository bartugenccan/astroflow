// Unit tests for when a sign-in code may be sent. Run: npm test --workspace @astroflow/api
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OTP_LIMITS, otpSendVerdict } from '../src/modules/auth/providers/email-otp-rules.ts';

const NOW = Date.parse('2026-11-20T12:00:00Z');
const CAP = 200;
const fresh = { lastSentAt: null, inWindow: 0, inDay: 0, globalLastHour: 0 };

test('a first code for an address goes out', () => {
  assert.equal(otpSendVerdict(fresh, NOW, CAP), 'ok');
});

test('a second code inside a minute waits; after the minute it goes out', () => {
  const stats = { ...fresh, lastSentAt: NOW - 30_000, inWindow: 1, inDay: 1 };
  assert.equal(otpSendVerdict(stats, NOW, CAP), 'cooldown');
  assert.equal(otpSendVerdict({ ...stats, lastSentAt: NOW - OTP_LIMITS.cooldownMs }, NOW, CAP), 'ok');
});

test('the per-address window and day limits still hold', () => {
  const old = NOW - 5 * 60_000;
  assert.equal(otpSendVerdict({ ...fresh, lastSentAt: old, inWindow: 3, inDay: 3 }, NOW, CAP), 'address_limit');
  assert.equal(otpSendVerdict({ ...fresh, lastSentAt: old, inWindow: 0, inDay: 10 }, NOW, CAP), 'address_limit');
});

test('the hourly global cap pauses sending for every address', () => {
  assert.equal(otpSendVerdict({ ...fresh, globalLastHour: CAP }, NOW, CAP), 'global_limit');
  assert.equal(otpSendVerdict({ ...fresh, globalLastHour: CAP - 1 }, NOW, CAP), 'ok');
});

test('an address over its own limit is told so even when the global cap is also hit', () => {
  const stats = { lastSentAt: NOW - 10_000, inWindow: 1, inDay: 1, globalLastHour: CAP };
  assert.equal(otpSendVerdict(stats, NOW, CAP), 'cooldown');
});
