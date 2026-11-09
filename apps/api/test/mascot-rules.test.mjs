// Unit tests for Aster's pure growth rules. Run: npm test --workspace @astroflow/api
// Node >= 23 strips TypeScript types natively, so the rules file is imported as-is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stageFor,
  stageBounds,
  energyFor,
  moodFor,
  planStreak,
  isoWeek,
  daysBetween,
  shiftDays,
  lunarWindow,
  EVENT_RULES,
  CLIENT_EVENT_KINDS,
} from '../src/modules/mascot/mascot-rules.ts';

test('the egg stays an egg until it hatches, whatever the Işık', () => {
  assert.equal(stageFor(0, false), 0);
  assert.equal(stageFor(5000, false), 0);
});

test('stage thresholds once hatched', () => {
  assert.equal(stageFor(0, true), 1);
  assert.equal(stageFor(149, true), 1);
  assert.equal(stageFor(150, true), 2);
  assert.equal(stageFor(499, true), 2);
  assert.equal(stageFor(500, true), 3);
  assert.equal(stageFor(1200, true), 4);
  assert.equal(stageFor(2999, true), 4);
  assert.equal(stageFor(3000, true), 5);
  assert.equal(stageFor(99999, true), 5);
});

test('stage bounds feed the progress bar; Nova has no next stage', () => {
  assert.deepEqual(stageBounds(1), { floor: 0, next: 150 });
  assert.deepEqual(stageBounds(2), { floor: 150, next: 500 });
  assert.deepEqual(stageBounds(5), { floor: 3000, next: null });
});

test('energy sums event weights and is capped at 100', () => {
  assert.equal(energyFor([]), 0);
  assert.equal(energyFor(['CHECKIN']), EVENT_RULES.CHECKIN.energy);
  assert.equal(energyFor(['MOON_RITUAL', 'MOON_RITUAL', 'MOON_RITUAL', 'MOON_RITUAL']), 100);
});

test('mood follows energy', () => {
  assert.equal(moodFor(0), 'sleepy');
  assert.equal(moodFor(24), 'sleepy');
  assert.equal(moodFor(25), 'happy');
  assert.equal(moodFor(69), 'happy');
  assert.equal(moodFor(70), 'glowing');
});

test('server-side actions cannot be reported by the client', () => {
  for (const k of ['INTENTION_CREATE', 'CHECKIN', 'DAY_COMPLETE', 'MILESTONE', 'SKY_READ']) {
    assert.ok(!CLIENT_EVENT_KINDS.includes(k), k);
  }
});

test('streak alive today or yesterday', () => {
  assert.deepEqual(planStreak({ currentStreak: 4, lastActiveDate: '2026-11-09' }, '2026-11-09', 0), {
    effectiveStreak: 4, bridgeDays: [], broken: false,
  });
  assert.deepEqual(planStreak({ currentStreak: 4, lastActiveDate: '2026-11-08' }, '2026-11-09', 0), {
    effectiveStreak: 4, bridgeDays: [], broken: false,
  });
});

test('a missed day breaks the streak without a shield', () => {
  const plan = planStreak({ currentStreak: 4, lastActiveDate: '2026-11-07' }, '2026-11-09', 0);
  assert.equal(plan.broken, true);
  assert.equal(plan.effectiveStreak, 0);
});

test('one shield bridges one missed day', () => {
  const plan = planStreak({ currentStreak: 4, lastActiveDate: '2026-11-07' }, '2026-11-09', 1);
  assert.deepEqual(plan, { effectiveStreak: 4, bridgeDays: ['2026-11-08'], broken: false });
});

test('too few shields for the gap breaks the streak and spends nothing', () => {
  const plan = planStreak({ currentStreak: 9, lastActiveDate: '2026-11-04' }, '2026-11-09', 2);
  assert.equal(plan.broken, true);
  assert.deepEqual(plan.bridgeDays, []);
});

test('no stored run means zero', () => {
  assert.equal(planStreak({ currentStreak: 0, lastActiveDate: null }, '2026-11-09', 3).effectiveStreak, 0);
});

test('date helpers', () => {
  assert.equal(daysBetween('2026-11-07', '2026-11-09'), 2);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(shiftDays('2026-03-01', -1), '2026-02-28');
  assert.equal(isoWeek('2026-11-09'), '2026-W46');
  assert.equal(isoWeek('2027-01-01'), '2026-W53');
});

test('lunar window: inside around the mean new moon, outside at the quarter', () => {
  const knownNew = Date.UTC(2000, 0, 6, 18, 14);
  const synodicMs = 29.53058867 * 86400000;
  const nthNew = new Date(knownNew + 320 * synodicMs);
  const w = lunarWindow(new Date(nthNew.getTime() + 86400000));
  assert.ok(w);
  assert.equal(w.phase, 'new');
  assert.equal(w.peakDate, nthNew.toISOString().slice(0, 10));
  const full = lunarWindow(new Date(nthNew.getTime() + synodicMs / 2 - 3600000));
  assert.equal(full?.phase, 'full');
  assert.equal(lunarWindow(new Date(nthNew.getTime() + synodicMs / 4)), null);
});
