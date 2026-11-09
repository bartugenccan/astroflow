// Unit tests for the personal sky plan and wish-star rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, focusAreaOf, stepForTransit, weekStrip, MAX_PERSONAL_STEPS } from '../src/modules/plan/plan-rules.ts';
import { starState, isWaitingForMoon, visiblePowerDays } from '../src/modules/intentions/intention-rules.ts';
import { nextLunarPeak, lunarProgress } from '../src/modules/mascot/mascot-rules.ts';

const t = (transitPlanet, natalPlanet, aspect, nature, orb, transitSign = 'Leo') => ({
  transitPlanet, natalPlanet, aspect, nature, orb, transitSign,
});
const base = {
  today: '2026-11-10',
  transits: [],
  moon: { sign: 'Capricorn', natalHouse: 10 },
  areaScores: { love: 40, career: 80, money: 50, energy: 60 },
  areaReasons: { career: { transitPlanet: 'Jupiter', aspect: 'Trine', natalPoint: 'Sun', nature: 'harmonic' } },
  week: [],
  intentions: [],
  mood: null,
  lunar: null,
};

test('focus area is today’s best-scoring life area', () => {
  assert.equal(focusAreaOf(base.areaScores), 'career');
  assert.equal(focusAreaOf(null), 'energy');
});

test('transits map to existing practices', () => {
  assert.equal(stepForTransit(t('Venus', 'Moon', 'Conjunction', 'neutral', 1)), 'AFFIRMATION');
  assert.equal(stepForTransit(t('Jupiter', 'Mars', 'Square', 'challenging', 1)), 'CHECKIN');
  assert.equal(stepForTransit(t('Mercury', 'Sun', 'Sextile', 'harmonic', 1)), 'EVENING_REFLECTION');
  assert.equal(stepForTransit(t('Saturn', 'Moon', 'Square', 'challenging', 1)), 'BREATH');
  assert.equal(stepForTransit(t('Saturn', 'Moon', 'Trine', 'harmonic', 1)), null);
});

test('plan always anchors on check-in and the daily reading', () => {
  const p = buildPlan(base);
  assert.deepEqual(p.anchors.map((s) => s.kind), ['SKY_CHECKIN', 'SKY_READ']);
});

test('without a wish in the focus area the plan invites one, with the area prefilled', () => {
  const p = buildPlan(base);
  const s = p.steps.find((x) => x.kind === 'INTENTION_CREATE');
  assert.ok(s);
  assert.equal(s.prefill.area, 'career');
  assert.equal(p.powerIntentionId, null);
});

test('the oldest wish in the focus area becomes the power wish and gets the check-in', () => {
  const p = buildPlan({ ...base, intentions: [{ id: 'a', lifeArea: 'love' }, { id: 'b', lifeArea: 'career' }, { id: 'c', lifeArea: 'career' }] });
  assert.equal(p.powerIntentionId, 'b');
  assert.equal(p.steps.find((x) => x.kind === 'CHECKIN').prefill.intentionId, 'b');
});

test('tightest transit leads, steps are unique and capped', () => {
  const p = buildPlan({
    ...base,
    transits: [t('Mercury', 'Sun', 'Sextile', 'harmonic', 3), t('Saturn', 'Moon', 'Square', 'challenging', 0.4), t('Venus', 'Venus', 'Trine', 'harmonic', 2)],
  });
  assert.equal(p.steps[0].kind, 'BREATH');
  assert.equal(p.steps[0].why.transitPlanet, 'Saturn');
  assert.ok(p.steps.length <= MAX_PERSONAL_STEPS);
  assert.equal(new Set(p.steps.map((s) => s.kind)).size, p.steps.length);
});

test('a stormy mood makes the day gentle: breath first, calm affirmations', () => {
  const p = buildPlan({ ...base, mood: 'STORMY', transits: [t('Venus', 'Moon', 'Trine', 'harmonic', 1)] });
  assert.equal(p.gentle, true);
  assert.equal(p.steps[0].kind, 'BREATH');
  assert.equal(p.steps.find((s) => s.kind === 'AFFIRMATION').prefill.category, 'calm');
});

test('the moon window outranks everything', () => {
  const p = buildPlan({ ...base, mood: 'STORMY', lunar: { phase: 'full', peakDate: '2026-11-10' } });
  assert.equal(p.steps[0].kind, 'MOON_RITUAL');
  assert.equal(p.steps[0].titleKey, 'plan.step.moon.full');
});

test('the tarot question comes from today’s tightest aspect', () => {
  const p = buildPlan({ ...base, transits: [t('Mars', 'Sun', 'Square', 'challenging', 0.2)] });
  const tarot = p.steps.find((s) => s.kind === 'TAROT');
  assert.ok(tarot, JSON.stringify(p.steps));
  assert.equal(tarot.prefill.questionKey, 'plan.tarotQ.challenging');
  assert.deepEqual(tarot.prefill.questionParams, { planet: 'Mars', natal: 'Sun', aspect: 'Square' });
});

test('week strip picks the strongest area each day', () => {
  assert.deepEqual(weekStrip([{ date: 'd', love: 90, career: 10, money: 10, energy: 10 }]), [{ date: 'd', area: 'love', score: 90 }]);
});

test('a wish shines with care, not with days, and only rests when quiet', () => {
  const today = '2026-11-10';
  assert.equal(starState({ totalCheckIns: 0, avgConviction: null, lastActiveDate: null, plantedMoon: null }, today).state, 'seed');
  assert.equal(starState({ totalCheckIns: 1, avgConviction: 2, lastActiveDate: today, plantedMoon: null }, today).state, 'spark');
  assert.equal(starState({ totalCheckIns: 7, avgConviction: 3, lastActiveDate: today, plantedMoon: null }, today).state, 'glowing');
  assert.equal(starState({ totalCheckIns: 21, avgConviction: 4, lastActiveDate: today, plantedMoon: null }, today).state, 'radiant');
  const quiet = starState({ totalCheckIns: 21, avgConviction: 4, lastActiveDate: '2026-11-01', plantedMoon: null }, today);
  assert.equal(quiet.state, 'radiant');
  assert.equal(quiet.resting, true);
});

test('a wish planted for the new moon waits until its window opens', () => {
  assert.equal(isWaitingForMoon('2026-11-20', '2026-11-10'), true);
  assert.equal(isWaitingForMoon('2026-11-20', '2026-11-19'), false);
  assert.equal(isWaitingForMoon(null, '2026-11-10'), false);
  assert.equal(starState({ totalCheckIns: 0, avgConviction: null, lastActiveDate: null, plantedMoon: '2026-11-20' }, '2026-11-10').waiting, true);
});

test('power days stay mostly locked until Glimmer', () => {
  assert.equal(visiblePowerDays(2, 14), 3);
  assert.equal(visiblePowerDays(3, 14), 14);
});

test('next lunar peaks are ahead and within one cycle', () => {
  const now = new Date('2026-11-10T00:00:00Z');
  for (const phase of ['new', 'full']) {
    const d = nextLunarPeak(now, phase);
    const gap = (Date.parse(d) - now.getTime()) / 86400000;
    assert.ok(gap >= -1 && gap <= 30, `${phase} ${d}`);
  }
  const p = lunarProgress(now);
  assert.ok(p >= 0 && p < 1);
});
