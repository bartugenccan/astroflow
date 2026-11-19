// Unit tests for which daily AI counters a generation is charged to. Run: npm test --workspace @astroflow/api
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_KEY,
  NEW_DEVICES_KEY,
  NEW_DEVICE_AGE_MS,
  aiBudgetCounters,
} from '../src/modules/ai/ai-budget-rules.ts';

const LIMITS = { perDevice: 300, global: 20000, perNewDevice: 100, newDevicesGlobal: 5000 };
const HOUR = 60 * 60 * 1000;

test('an established device: its own cap, then the global one', () => {
  const counters = aiBudgetCounters('dev-1', 3 * 24 * HOUR, LIMITS);
  assert.deepEqual(counters, [
    { key: 'dev-1', cap: 300, scope: 'device' },
    { key: GLOBAL_KEY, cap: 20000, scope: 'global' },
  ]);
});

test('a device younger than a day: a smaller own cap and the new-device pool before global', () => {
  const counters = aiBudgetCounters('dev-2', 2 * HOUR, LIMITS);
  assert.deepEqual(counters, [
    { key: 'dev-2', cap: 100, scope: 'device' },
    { key: NEW_DEVICES_KEY, cap: 5000, scope: 'new_devices' },
    { key: GLOBAL_KEY, cap: 20000, scope: 'global' },
  ]);
});

test('the day boundary: exactly one day old is established', () => {
  assert.equal(aiBudgetCounters('dev-3', NEW_DEVICE_AGE_MS, LIMITS).length, 2);
  assert.equal(aiBudgetCounters('dev-3', NEW_DEVICE_AGE_MS - 1, LIMITS).length, 3);
});

test('an unknown (legacy) id counts as established', () => {
  const counters = aiBudgetCounters('legacy', null, LIMITS);
  assert.deepEqual(counters.map((c) => c.scope), ['device', 'global']);
});

test('no device (background work): only the global counter', () => {
  assert.deepEqual(aiBudgetCounters(undefined, null, LIMITS), [{ key: GLOBAL_KEY, cap: 20000, scope: 'global' }]);
});

test('a new-device cap set above the normal one never raises it', () => {
  const counters = aiBudgetCounters('dev-4', HOUR, { ...LIMITS, perNewDevice: 900 });
  assert.equal(counters[0].cap, 300);
});
