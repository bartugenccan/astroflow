// Unit tests for the key-sky-moments engine. Run: npm test --workspace @astroflow/api
// Node >= 23 strips TypeScript types natively, so the modules are imported as-is.
//
// Reference values are independent of astronomy-engine:
// - Eclipse times: NASA GSFC eclipse catalog (greatest eclipse, UT):
//   2024-04-08 total solar 18:17 UT; 2025-03-14 total lunar 06:58 UT.
// - Eclipse / lunation / station degrees and times: published tropical
//   ephemeris tables (e.g. astro.com, Cafe Astrology 2025–2026 tables):
//   solar eclipse 2024-04-08 at 19°24′ Aries; lunar eclipse 2025-03-14 with
//   the Moon at 23°57′ Virgo; New Moon 2025-01-29 12:36 UT at 9°51′ Aquarius;
//   Mercury stations retrograde 2025-03-15 06:46 UT at 9°35′ Aries;
//   Saturn stations retrograde 2025-07-13 ~04:07 UT at 1°56′ Aries;
//   Saturn enters Aries 2025-05-24/25, back to Pisces 2025-09-01, re-enters
//   2026-02-13/14; Mercury retrograde 2026-10-24 → 2026-11-13.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Eph from '../src/modules/astrology/sky/sky-ephemeris.ts';
import {
  detectMoments,
  natalInputFromChart,
  houseOf,
  toLongitude,
  rankMoments,
  momentStatus,
  WEIGHTS,
} from '../src/modules/astrology/sky/sky-moments.ts';

const DAY = 86_400_000;
const YEAR = 365 * DAY;
const MIN = 60_000;
const at = (s) => Date.parse(s);
const near = (actualMs, expectedIso, tolMs, label) =>
  assert.ok(
    Math.abs(actualMs - at(expectedIso)) <= tolMs,
    `${label}: ${new Date(actualMs).toISOString()} vs ${expectedIso}`,
  );
const closeDeg = (a, b, tol, label) => assert.ok(Math.abs(Eph.signedDiff(a - b)) <= tol, `${label}: ${a} vs ${b}`);

// ─── Ephemeris against published values ─────────────────────────────────────

test('eclipses: times (NASA) and degrees (syzygy) match published values', () => {
  const ecl = Eph.findEclipses(at('2024-03-01T00:00:00Z'), at('2025-04-01T00:00:00Z'));
  const solar = ecl.find((e) => e.kind === 'solar' && e.type === 'total');
  assert.ok(solar, 'total solar eclipse found');
  near(solar.ms, '2024-04-08T18:17:00Z', 5 * MIN, 'solar peak');
  closeDeg(solar.longitude, 19 + 24 / 60, 0.05, 'solar degree');
  const lunar = ecl.find((e) => e.kind === 'lunar' && e.type === 'total');
  assert.ok(lunar, 'total lunar eclipse found');
  near(lunar.ms, '2025-03-14T06:58:00Z', 5 * MIN, 'lunar peak');
  closeDeg(lunar.longitude, 150 + 23 + 57 / 60, 0.05, 'lunar degree');
});

test('lunations: the 2025-01-29 New Moon', () => {
  const l = Eph.findLunations(at('2025-01-28T00:00:00Z'), at('2025-01-31T00:00:00Z'));
  assert.equal(l.length, 1);
  assert.equal(l[0].kind, 'new');
  near(l[0].ms, '2025-01-29T12:36:00Z', 3 * MIN, 'new moon');
  closeDeg(l[0].longitude, 300 + 9 + 51 / 60, 0.05, 'new moon degree');
});

test('stations: Mercury and Saturn retrograde stations in 2025', () => {
  const st = Eph.findStations(at('2025-01-01T00:00:00Z'), at('2025-12-31T00:00:00Z'), ['Mercury', 'Saturn']);
  const merc = st.find((s) => s.body === 'Mercury' && s.kind === 'retrograde');
  near(merc.ms, '2025-03-15T06:46:00Z', 15 * MIN, 'Mercury SR');
  closeDeg(merc.longitude, 9 + 35 / 60, 0.05, 'Mercury SR degree');
  const sat = st.find((s) => s.body === 'Saturn' && s.kind === 'retrograde');
  near(sat.ms, '2025-07-13T04:07:00Z', 60 * MIN, 'Saturn SR');
  closeDeg(sat.longitude, 1 + 56 / 60, 0.05, 'Saturn SR degree');
  // Mercury: three retrogrades a year → six stations.
  assert.equal(st.filter((s) => s.body === 'Mercury').length, 6);
});

test('retrograde flag: Saturn on 1997-09-24 and on 2026-11-16', () => {
  assert.equal(Eph.isRetrogradeAt('Saturn', at('1997-09-24T12:00:00Z')), true);
  assert.equal(Eph.isRetrogradeAt('Saturn', at('2026-11-16T12:00:00Z')), true);
  assert.equal(Eph.isRetrogradeAt('Saturn', at('2026-03-01T12:00:00Z')), false);
});

// ─── Window search ───────────────────────────────────────────────────────────

test('aspectWindows: a fast body is caught even when it jumps over a narrow orb', () => {
  // The Sun moves ~1°/day; with a 0.3° orb most daily samples skip the window.
  const s = Eph.sampleLongitudes('Sun', at('2025-01-01T00:00:00Z'), at('2025-12-31T00:00:00Z'));
  const w = Eph.aspectWindows(s, 100.5, 0, 0.3);
  assert.equal(w.length, 1);
  assert.equal(w[0].passes.length, 1);
  closeDeg(Eph.longitudeAt('Sun', w[0].passes[0]), 100.5, 0.01, 'exact pass');
});

test('aspectWindows: a retrograde loop is one window with several passes', () => {
  // Neptune opposing a point at 1.3° Libra: three passes in 2025–26, out of orb in between.
  const s = Eph.sampleLongitudes('Neptune', at('2023-01-01T00:00:00Z'), at('2029-01-01T00:00:00Z'));
  const merged = Eph.aspectWindows(s, 181.3, 180, 0.3, 2 * YEAR);
  assert.equal(merged.length, 1);
  assert.ok(merged[0].passes.length >= 3, `passes: ${merged[0].passes.length}`);
  const split = Eph.aspectWindows(s, 181.3, 180, 0.3, 0);
  assert.ok(split.length > 1, 'without merging the loop splits apart');
});

test('aspectWindows: a window touching the scan edge is flagged as clipped', () => {
  const s = Eph.sampleLongitudes('Saturn', at('2027-04-08T00:00:00Z'), at('2027-12-31T00:00:00Z'));
  const natalSaturn = Eph.longitudeAt('Saturn', at('2027-04-11T00:00:00Z'));
  const w = Eph.aspectWindows(s, natalSaturn, 0, 1);
  assert.equal(w.length, 1);
  assert.equal(w[0].clipped, true);
});

test('signSeasons: Saturn in Aries is one season with two entries (in → out → in)', () => {
  const s = Eph.sampleLongitudes('Saturn', at('2024-01-01T00:00:00Z'), at('2030-01-01T00:00:00Z'));
  const seasons = Eph.signSeasons(s, 0, 2 * YEAR);
  assert.equal(seasons.length, 1);
  assert.equal(seasons[0].entries.length, 2);
  near(seasons[0].entries[0], '2025-05-25T00:00:00Z', 2 * DAY, 'first entry');
  near(seasons[0].entries[1], '2026-02-14T00:00:00Z', 2 * DAY, 're-entry');
});

// ─── Rules ───────────────────────────────────────────────────────────────────

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
function natalAt(ms, extra = {}) {
  const points = BODIES.map((id) => ({ id, longitude: Eph.longitudeAt(id, ms), retrograde: Eph.isRetrogradeAt(id, ms) }));
  const node = Eph.meanNorthNodeAt(ms);
  points.push({ id: 'NorthNode', longitude: node, retrograde: true });
  points.push({ id: 'SouthNode', longitude: Eph.norm360(node + 180), retrograde: true });
  return { birthMs: ms, unknownTime: true, points, chartRuler: null, cusps: null, ...extra };
}

const Q = { fromMs: at('2026-10-17T00:00:00Z'), toMs: at('2027-11-16T23:59:59Z') };
const SKY = {
  series: Object.fromEntries(
    ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map((b) => [b, Eph.sampleLongitudes(b, Q.fromMs - 3 * YEAR, Q.toMs + 3 * YEAR)]),
  ),
  node: Eph.sampleFunction(Eph.meanNorthNodeAt, Q.fromMs - 3 * YEAR, Q.toMs + 3 * YEAR),
  stations: Eph.findStations(Q.fromMs - 200 * DAY, Q.toMs + 200 * DAY),
  eclipses: Eph.findEclipses(Q.fromMs - 200 * DAY, Q.toMs + 40 * DAY),
  lunations: Eph.findLunations(Q.fromMs - 5 * DAY, Q.toMs + 5 * DAY),
};
const run = (natal) => detectMoments(natal, SKY, Eph, Q);

test('Saturn return: the sign season is now, the exact hit is April 2027', () => {
  const m = run(natalAt(at('1997-09-24T12:00:00Z'))).find((x) => x.kind === 'saturn_return');
  assert.ok(m, 'saturn_return present');
  assert.equal(m.detail.cycle, 1);
  near(at(m.detail.seasonStart), '2025-05-25T00:00:00Z', 3 * DAY, 'season start');
  assert.equal(m.passes.length, 1);
  assert.equal(m.peak.slice(0, 7), '2027-04');
  assert.equal(momentStatus(m, at('2026-11-16T12:00:00Z')), 'active');
});

test('ranking: the Saturn return outranks retrogrades and the double-retrograde note', () => {
  const moments = run(natalAt(at('1997-09-24T12:00:00Z')));
  const idx = (kind) => moments.findIndex((x) => x.kind === kind);
  assert.ok(idx('saturn_return') >= 0 && idx('double_retrograde') >= 0 && idx('retrograde_period') >= 0);
  assert.ok(idx('saturn_return') < idx('retrograde_period'));
  assert.ok(idx('saturn_return') < idx('double_retrograde'));
  assert.ok(moments[0].salience >= moments[moments.length - 1].salience);
});

test('double retrograde: natal-retrograde Saturn yes, yearly outer planets no', () => {
  const moments = run(natalAt(at('1997-09-24T12:00:00Z')));
  const dbl = moments.filter((x) => x.kind === 'double_retrograde');
  assert.ok(dbl.some((x) => x.planet === 'Saturn'), 'Saturn double retrograde');
  assert.ok(!dbl.some((x) => ['Uranus', 'Neptune', 'Pluto'].includes(x.planet)), 'no outer-planet notes');
  assert.equal(dbl.find((x) => x.planet === 'Saturn').salience, WEIGHTS.doubleRetro);
});

test('different charts get different highlights', () => {
  const top = (iso) => run(natalAt(at(iso)))[0];
  const a = top('1997-09-24T12:00:00Z');
  const b = top('1985-03-02T12:00:00Z');
  assert.notEqual(`${a.kind}:${a.planet}:${a.target}`, `${b.kind}:${b.planet}:${b.target}`);
  // 1985 (Pluto in Scorpio): the Pluto square falls in the early 40s, not at 36.
  const pluto = run(natalAt(at('1985-03-02T12:00:00Z'))).find((x) => x.kind === 'generational' && x.planet === 'Pluto');
  assert.ok(pluto && pluto.detail.age >= 40 && pluto.detail.age <= 43, `Pluto square age ${pluto?.detail.age}`);
});

test('birth time: angle moments are hidden when unknown, shown when known', () => {
  // Put the Ascendant exactly on a New Moon degree inside the range.
  const lunation = SKY.lunations.find((l) => l.ms > Q.fromMs + 30 * DAY && !SKY.eclipses.some((e) => Math.abs(e.syzygyMs - l.ms) < DAY));
  const base = natalAt(at('1990-05-15T08:30:00Z'));
  const withAsc = { ...base, points: [...base.points, { id: 'Ascendant', longitude: lunation.longitude, retrograde: false }] };
  const known = run({ ...withAsc, unknownTime: false });
  assert.ok(known.some((x) => x.target === 'Ascendant' && x.kind === 'lunation_on_natal'), 'shown with a birth time');
  const unknown = run({ ...withAsc, unknownTime: true });
  assert.ok(!unknown.some((x) => x.target === 'Ascendant'), 'hidden without a birth time');
  assert.ok(!unknown.some((x) => x.needsBirthTime), 'nothing needing a birth time');
});

test('birth time: natal-Moon contacts are "possible" and rank lower without it', () => {
  const natal = natalAt(at('1990-05-15T08:30:00Z'));
  const unknown = run({ ...natal, unknownTime: true }).filter((x) => x.target === 'Moon');
  const known = run({ ...natal, unknownTime: false }).filter((x) => x.target === 'Moon');
  assert.ok(unknown.length > 0);
  assert.ok(unknown.every((x) => x.certainty === 'possible'));
  for (const u of unknown) {
    const k = known.find((x) => x.id === u.id);
    if (k) assert.ok(u.salience < k.salience, `${u.id}: ${u.salience} < ${k.salience}`);
  }
});

test('natalInputFromChart: parses the stored chart; angles only with a birth time', () => {
  const chart = {
    planets: [
      { name: 'Sun', sign: 'Libra', degree: 1, minute: 30, retrograde: false },
      { name: 'Saturn', sign: 'Aries', degree: 18, minute: 7, retrograde: true },
    ],
    angles: { ascendant: { sign: 'Leo', degree: 10, minute: 0 }, midheaven: { sign: 'Taurus', degree: 2, minute: 0 } },
    nodes: { north: { sign: 'Virgo', degree: 12, minute: 0 } },
    houses: Array.from({ length: 12 }, (_, i) => ({
      house: i + 1, sign: ['Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer'][i],
      degree: 10, minute: 0, ruler: i === 0 ? 'Sun' : 'Mars',
    })),
  };
  const known = natalInputFromChart(chart, 0, false);
  assert.equal(known.chartRuler, 'Sun');
  assert.ok(known.points.some((p) => p.id === 'Ascendant'));
  assert.equal(known.points.find((p) => p.id === 'SouthNode').longitude, toLongitude({ sign: 'Pisces', degree: 12, minute: 0 }));
  assert.equal(houseOf(toLongitude({ sign: 'Leo', degree: 15, minute: 0 }), known.cusps), 1);
  assert.equal(houseOf(toLongitude({ sign: 'Leo', degree: 5, minute: 0 }), known.cusps), 12);
  const unknown = natalInputFromChart(chart, 0, true);
  assert.equal(unknown.chartRuler, null);
  assert.equal(unknown.cusps, null);
  assert.ok(!unknown.points.some((p) => p.id === 'Ascendant' || p.id === 'Midheaven'));
});

test('rankMoments: equal salience falls back to the headline kind', () => {
  const m = (kind, salience) => ({ kind, salience, peak: '2027-01-01T00:00:00.000Z' });
  const ranked = rankMoments([m('outer_transit', 100), m('saturn_return', 100)]);
  assert.equal(ranked[0].kind, 'saturn_return');
});
