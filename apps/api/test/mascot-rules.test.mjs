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
  partitionMergeEvents,
  mergeMascotState,
  MAX_SHIELDS,
  SKY_PATH,
  lessonStatus,
  skyPathView,
  canUnlockEarly,
  spreadUnlocked,
  unlocksAt,
  passesToday,
  STAGES,
} from '../src/modules/mascot/mascot-rules.ts';
import { intentionStats } from '../src/modules/intentions/intention-rules.ts';

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

// ─── Merging an anonymous install into an existing account ───────────────────

const ev = (id, kind, localDate, refKey, xp) => ({ id, kind, localDate, refKey, xp });

test('merge moves events that do not clash and counts their Işık', () => {
  const from = [ev('a', 'CHECKIN', '2026-11-01', '1', 10), ev('b', 'TAROT', '2026-11-02', '1', 10)];
  const into = [ev('x', 'CHECKIN', '2026-11-03', '1', 10)];
  assert.deepEqual(partitionMergeEvents(from, into), { moveIds: ['a', 'b'], dropIds: [], movedXp: 20 });
});

test('merge drops events with the same unique key', () => {
  const from = [ev('a', 'CHECKIN', '2026-11-01', '1', 10), ev('b', 'CHECKIN', '2026-11-01', '2', 10)];
  const into = [ev('x', 'CHECKIN', '2026-11-01', '1', 10)];
  assert.deepEqual(partitionMergeEvents(from, into), { moveIds: ['b'], dropIds: ['a'], movedXp: 10 });
});

test('merge never double-counts a once-ever award earned on different days', () => {
  const from = [ev('a', 'MOON_RITUAL', '2026-11-05', '2026-11-05', 50)];
  const into = [ev('x', 'MOON_RITUAL', '2026-11-06', '2026-11-05', 50)];
  assert.deepEqual(partitionMergeEvents(from, into), { moveIds: [], dropIds: ['a'], movedXp: 0 });
});

const mascot = (o = {}) => ({
  xp: 0, stardust: 0, shields: 0, equipped: [], owned: [], lastFreeShieldWeek: null, hatchedAt: null,
  lessonsDone: [], lessonsEarly: [], novaLook: false, ...o,
});

test('merging into nothing keeps the anonymous Aster as is', () => {
  const from = mascot({ xp: 200, stardust: 120, hatchedAt: new Date('2026-11-01') });
  assert.deepEqual(mergeMascotState(null, from, 200), from);
});

test('merged Aster adds moved Işık, caps stardust at what was left, unites purchases', () => {
  const into = mascot({ xp: 500, stardust: 300, shields: 1, equipped: ['hat'], owned: ['hat'], hatchedAt: new Date('2026-10-01') });
  const from = mascot({ xp: 180, stardust: 40, shields: 3, equipped: ['scarf'], owned: ['scarf'], hatchedAt: new Date('2026-09-01') });
  const m = mergeMascotState(into, from, 150);
  assert.equal(m.xp, 650);
  assert.equal(m.stardust, 340); // only 40 was unspent
  assert.equal(m.shields, MAX_SHIELDS);
  assert.deepEqual(m.equipped, ['hat']);
  assert.deepEqual(m.owned.sort(), ['hat', 'scarf']);
  assert.equal(m.hatchedAt.toISOString().slice(0, 10), '2026-09-01');
});

test('an unhatched account inherits the hatch from the device', () => {
  const m = mergeMascotState(mascot({ xp: 0 }), mascot({ xp: 40, stardust: 40, hatchedAt: new Date('2026-11-02') }), 40);
  assert.ok(m.hatchedAt);
  assert.equal(m.xp, 40);
});

// ─── Rewards, orbit, eclipse, journeys, constellations ───────────────────────
import {
  stardustFor,
  advanceOrbit,
  viewOrbit,
  eclipseDays,
  eclipseActive,
  journeyStatus,
  journeyEarnsShield,
  JOURNEY_MIN_ENERGY,
  ABILITIES,
} from '../src/modules/mascot/mascot-rules.ts';
import { pickConstellation, ALL_CONSTELLATIONS } from '../src/modules/mascot/constellations.ts';

test('stardust follows Işık unless a rule says otherwise', () => {
  assert.equal(stardustFor('CHECKIN'), EVENT_RULES.CHECKIN.xp);
  assert.equal(stardustFor('ACCOUNT_LINKED'), 50);
  assert.equal(EVENT_RULES.ACCOUNT_LINKED.xp, 0);
});

test('server-only kinds can never be self-reported', () => {
  for (const k of ['SKY_CHECKIN', 'JOURNEY_RETURN', 'MANIFESTED', 'ACCOUNT_LINKED']) {
    assert.ok(!CLIENT_EVENT_KINDS.includes(k), k);
  }
});

test('power days is now a live ability', () => {
  assert.equal(ABILITIES.find((a) => a.key === 'powerDays').available, true);
});

test('planStreak skips eclipse days instead of spending shields on them', () => {
  const paused = new Set(['2026-11-02', '2026-11-03']);
  const plan = planStreak({ currentStreak: 5, lastActiveDate: '2026-11-01' }, '2026-11-04', 0, paused);
  assert.deepEqual(plan, { effectiveStreak: 5, bridgeDays: [], broken: false });
  const partly = planStreak({ currentStreak: 5, lastActiveDate: '2026-11-01' }, '2026-11-05', 1, paused);
  assert.deepEqual(partly.bridgeDays, ['2026-11-04']);
});

test('orbit: first award of the day extends, second does nothing', () => {
  const a = advanceOrbit({ streak: 2, best: 4, lastDate: '2026-11-09' }, '2026-11-10', 0);
  assert.deepEqual(a, { streak: 3, best: 4, lastDate: '2026-11-10', shieldsUsed: 0, changed: true });
  const b = advanceOrbit({ streak: 3, best: 4, lastDate: '2026-11-10' }, '2026-11-10', 0);
  assert.equal(b.changed, false);
});

test('orbit: a missed day is bridged by a shield, otherwise the run restarts at 1', () => {
  const bridged = advanceOrbit({ streak: 6, best: 6, lastDate: '2026-11-08' }, '2026-11-10', 1);
  assert.equal(bridged.streak, 7);
  assert.equal(bridged.best, 7);
  assert.equal(bridged.shieldsUsed, 1);
  const broken = advanceOrbit({ streak: 6, best: 6, lastDate: '2026-11-07' }, '2026-11-10', 1);
  assert.equal(broken.streak, 1);
  assert.equal(broken.best, 6);
  assert.equal(broken.shieldsUsed, 0);
});

test('orbit view never spends and flags an uncounted live run as at risk', () => {
  assert.deepEqual(viewOrbit({ streak: 4, best: 9, lastDate: '2026-11-09' }, '2026-11-10', 0), {
    streak: 4, best: 9, countedToday: false, atRisk: true,
  });
  assert.equal(viewOrbit({ streak: 4, best: 9, lastDate: '2026-11-10' }, '2026-11-10', 0).atRisk, false);
  assert.equal(viewOrbit({ streak: 4, best: 9, lastDate: '2026-11-05' }, '2026-11-10', 0).streak, 0);
});

test('eclipse covers its days inclusively', () => {
  const e = { start: '2026-11-10', end: '2026-11-12' };
  assert.deepEqual([...eclipseDays(e)], ['2026-11-10', '2026-11-11', '2026-11-12']);
  assert.ok(eclipseActive(e, '2026-11-12'));
  assert.ok(!eclipseActive(e, '2026-11-13'));
  assert.ok(!eclipseActive({ start: null, end: null }, '2026-11-10'));
});

test('journey status resolves on read', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  assert.equal(journeyStatus(null, JOURNEY_MIN_ENERGY - 1, false, now), 'locked');
  assert.equal(journeyStatus(null, JOURNEY_MIN_ENERGY, false, now), 'ready');
  assert.equal(journeyStatus(null, 100, true, now), 'locked');
  const away = { returnsAt: new Date('2026-11-10T13:00:00Z'), claimedAt: null };
  assert.equal(journeyStatus(away, 0, false, now), 'away');
  assert.equal(journeyStatus({ ...away, returnsAt: new Date('2026-11-10T11:00:00Z') }, 0, false, now), 'returned');
  assert.equal(journeyStatus({ ...away, claimedAt: now }, 0, false, now), 'claimed');
});

test('every third journey earns a shield', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(journeyEarnsShield), [false, false, true, false, false, true]);
});

test('the first constellation is always the natal Sun sign', () => {
  assert.equal(pickConstellation({ sunSign: 'Scorpio', discoverySign: 'Leo', owned: [], rolls: [0.99, 0.5] }), 'scorpius');
});

test('later journeys mostly bring the discovery sign, else an unfound sky figure', () => {
  const owned = ['scorpius'];
  assert.equal(pickConstellation({ sunSign: 'Scorpio', discoverySign: 'Leo', owned, rolls: [0.1, 0] }), 'leo');
  assert.equal(pickConstellation({ sunSign: 'Scorpio', discoverySign: 'Leo', owned: [...owned, 'orion'], rolls: [0.9, 0] }), 'ursaMajor');
  const k = pickConstellation({ sunSign: 'Scorpio', discoverySign: null, owned, rolls: [0, 0.999] });
  assert.ok(ALL_CONSTELLATIONS.includes(k));
});

const fullMascot = (o = {}) => ({
  xp: 0, stardust: 0, shields: 0, equipped: [], owned: [], lastFreeShieldWeek: null, hatchedAt: null,
  orbitStreak: 0, orbitBest: 0, orbitLastDate: null, journeysCompleted: 0, eclipseStart: null, eclipseEnd: null,
  lessonsDone: [], lessonsEarly: [], novaLook: false, ...o,
});

test('merge keeps the most recent orbit, the best best, and adds journeys', () => {
  const into = fullMascot({ orbitStreak: 9, orbitBest: 20, orbitLastDate: '2026-11-01', journeysCompleted: 4 });
  const from = fullMascot({ orbitStreak: 3, orbitBest: 3, orbitLastDate: '2026-11-10', journeysCompleted: 2 });
  const m = mergeMascotState(into, from, 0);
  assert.equal(m.orbitStreak, 3);
  assert.equal(m.orbitLastDate, '2026-11-10');
  assert.equal(m.orbitBest, 20);
  assert.equal(m.journeysCompleted, 6);
});

// ─── Harita Yolu ─────────────────────────────────────────────────────────────

const path = (o = {}) => ({ stage: 1, done: [], early: [], ...o });

test('the first chapter is open from the start, even for the egg', () => {
  assert.equal(lessonStatus('bigThree', path({ stage: 0 })), 'open');
  assert.equal(lessonStatus('chartMood', path({ stage: 0 })), 'lockedPrev');
});

test('chapters open in order; a done chapter stays done', () => {
  const p = path({ done: ['bigThree'] });
  assert.equal(lessonStatus('bigThree', p), 'done');
  assert.equal(lessonStatus('chartMood', p), 'open');
  assert.equal(lessonStatus('personal', p), 'lockedPrev');
});

test('stage gates a chapter only once the one above it is done', () => {
  const done = ['bigThree', 'chartMood', 'personal'];
  assert.equal(lessonStatus('housesSelf', path({ stage: 1, done })), 'lockedStage');
  assert.equal(lessonStatus('housesSelf', path({ stage: 2, done })), 'open');
  assert.equal(lessonStatus('housesWorld', path({ stage: 2, done })), 'lockedPrev');
});

test('buying a chapter early opens it before the stage, never out of order', () => {
  const done = ['bigThree', 'chartMood', 'personal'];
  assert.equal(lessonStatus('housesSelf', path({ stage: 1, done, early: ['housesSelf'] })), 'open');
  assert.equal(lessonStatus('housesWorld', path({ stage: 1, done, early: ['housesWorld'] })), 'lockedPrev');
});

test('only stage-gated, not yet owned chapters can be bought early', () => {
  assert.equal(canUnlockEarly('bigThree', path()), false); // free
  assert.equal(canUnlockEarly('housesSelf', path({ stage: 1 })), true);
  assert.equal(canUnlockEarly('housesSelf', path({ stage: 2 })), false); // stage already enough
  assert.equal(canUnlockEarly('housesSelf', path({ stage: 1, early: ['housesSelf'] })), false);
});

test('the path view lists every chapter in order', () => {
  const v = skyPathView(path());
  assert.deepEqual(v.map((c) => c.key), SKY_PATH.map((c) => c.key));
  assert.equal(v[0].status, 'open');
});

test('lessons award once each, at most two a day', () => {
  assert.equal(EVENT_RULES.SKY_LESSON.mode, 'once');
  assert.equal(EVENT_RULES.SKY_LESSON.dailyCap, 2);
  assert.equal(EVENT_RULES.SIGN_LOG.dailyCap, 1);
  assert.ok(!CLIENT_EVENT_KINDS.includes('SKY_LESSON'), 'lessons are server-verified');
});

test('the decision spread opens at Glimmer', () => {
  assert.equal(spreadUnlocked('three', 0), true);
  assert.equal(spreadUnlocked('decision', 2), false);
  assert.equal(spreadUnlocked('decision', 3), true);
});

test('every grown stage opens something that works, not only cosmetics', () => {
  for (let stage = 2; stage < STAGES.length; stage++) {
    const u = unlocksAt(stage);
    assert.ok(u.lessons.length + u.spreads.length + u.abilities.length > 0, `stage ${stage} opens nothing`);
  }
  assert.ok(ABILITIES.every((a) => a.available), 'every advertised ability is built');
});

test('passes only count for today', () => {
  const stored = { '2026-11-09': { tarot: 1 }, '2026-11-10': { chat: 5 } };
  assert.deepEqual(passesToday(stored, '2026-11-10'), { chat: 5 });
  assert.deepEqual(passesToday(stored, '2026-11-11'), {});
  assert.deepEqual(passesToday(null, '2026-11-11'), {});
});

test('merging unites finished and early lessons and keeps the Nova look', () => {
  const into = mascot({ lessonsDone: ['bigThree'], lessonsEarly: [], novaLook: false });
  const from = mascot({ lessonsDone: ['bigThree', 'chartMood'], lessonsEarly: ['housesSelf'], novaLook: true });
  const m = mergeMascotState(into, from, 0);
  assert.deepEqual(m.lessonsDone.sort(), ['bigThree', 'chartMood']);
  assert.deepEqual(m.lessonsEarly, ['housesSelf']);
  assert.equal(m.novaLook, true);
});

test('a typical 60 Işık day reaches Glimmer in about nine days', () => {
  const day = 60;
  const daysTo = (stage) => Math.ceil(STAGES[stage].minXp / day);
  assert.ok(daysTo(2) <= 3);
  assert.ok(daysTo(3) <= 9);
  assert.ok(daysTo(4) <= 20);
});

// ─── Manifest report card ────────────────────────────────────────────────────

test('manifest stats count days, practice days and the conviction trend oldest first', () => {
  const rows = [
    { date: '2026-11-10', conviction: 5 },
    { date: '2026-11-10', conviction: 4 },
    { date: '2026-11-08', conviction: 3 },
  ];
  const s = intentionStats(rows, '2026-11-01', '2026-11-10', 4);
  assert.equal(s.daysActive, 10);
  assert.equal(s.checkIns, 3);
  assert.equal(s.practiceDays, 2);
  assert.equal(s.longestStreak, 4);
  assert.deepEqual(s.convictionTrend, [3, 4, 5]);
});

test('a manifest planted today is one day old', () => {
  assert.equal(intentionStats([], '2026-11-10', '2026-11-10', 0).daysActive, 1);
});
