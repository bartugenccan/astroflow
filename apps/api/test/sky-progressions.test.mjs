// Chiron (JPL table) and secondary progressions in the key-sky-moments engine.
// Run: npm test --workspace @astroflow/api
//
// Reference values independent of our code:
// - Chiron, JPL Horizons observer table (2060 Chiron, quantity 31, 00:00 UT):
//   2026-11-17 27.3798587°, 2026-11-19 27.3003861° (between the table's 2-day
//   samples, so they test the interpolation, not just the stored values).
// - Chiron's orbital period is ~50.4–50.8 years, so a Chiron return falls at age ~49–51.
// - The progressed Moon goes round in ~27.3 years (one sidereal month of days).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Eph from '../src/modules/astrology/sky/sky-ephemeris.ts';
import * as ChironData from '../src/modules/astrology/sky/chiron-table.ts';
import { decodeChironTable, chironLongitudeAt } from '../src/modules/astrology/sky/chiron.ts';
import { detectMoments } from '../src/modules/astrology/sky/sky-moments.ts';

const DAY = 86_400_000;
const YEAR = 365.2425 * DAY;
const at = (s) => Date.parse(s);

const table = decodeChironTable({
  startUtc: ChironData.CHIRON_START_UTC,
  stepDays: ChironData.CHIRON_STEP_DAYS,
  samples: ChironData.CHIRON_SAMPLES,
  scale: ChironData.CHIRON_SCALE,
  packed: ChironData.CHIRON_PACKED,
});
const chironAt = (ms) => chironLongitudeAt(table, ms);

/** A natal input built straight from the ephemeris at a known UTC birth instant. */
function natalAt(birthIso, { unknownTime = false } = {}) {
  const birthMs = at(birthIso);
  const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  return {
    birthMs,
    unknownTime,
    points: bodies.map((id) => ({ id, longitude: Eph.longitudeAt(id, birthMs), retrograde: Eph.isRetrogradeAt(id, birthMs) })),
    chartRuler: null,
    cusps: null,
    birthUtcMs: birthMs,
    chiron: chironAt(birthMs),
  };
}

function skyFor(fromMs, toMs) {
  const scanStart = fromMs - 3 * YEAR;
  const scanEnd = toMs + 3 * YEAR;
  return {
    series: {},
    node: Eph.sampleFunction(Eph.meanNorthNodeAt, scanStart, scanEnd),
    chiron: Eph.sampleFunction(chironAt, scanStart, scanEnd),
    stations: [],
    eclipses: [],
    lunations: [],
  };
}

const run = (natal, fromIso, toIso) => {
  const q = { fromMs: at(fromIso), toMs: at(toIso) };
  return detectMoments(natal, skyFor(q.fromMs, q.toMs), Eph, q);
};

test('Chiron table: interpolated longitudes match JPL between samples (< 1″)', () => {
  for (const [iso, jpl] of [
    ['2026-11-17T00:00:00Z', 27.3798587],
    ['2026-11-19T00:00:00Z', 27.3003861],
  ]) {
    const err = Math.abs(Eph.signedDiff(chironAt(at(iso)) - jpl)) * 3600;
    assert.ok(err < 1, `${iso}: ${err.toFixed(3)}″`);
  }
  assert.ok(Number.isNaN(chironAt(at('1899-06-01T00:00:00Z'))), 'outside the table is NaN, not a guess');
});

test('birth instant from the natal Moon: recovers the UTC time from any local clock offset', () => {
  const real = at('1990-05-15T05:30:00Z');
  const moon = Eph.longitudeAt('Moon', real);
  for (const offsetH of [-10, -3, 0, 3, 9, 14]) {
    const got = Eph.birthInstantFromMoon(moon, real + offsetH * 3_600_000);
    assert.ok(Math.abs(got - real) < 2 * 60_000, `offset ${offsetH}h → ${new Date(got).toISOString()}`);
  }
});

test('Chiron return: about age 50, on the natal Chiron degree', () => {
  const natal = natalAt('1976-06-01T12:00:00Z');
  const found = run(natal, '2024-01-01T00:00:00Z', '2030-12-31T00:00:00Z').filter((m) => m.kind === 'chiron_return');
  assert.ok(found.length >= 1, 'a Chiron return is found');
  for (const m of found) {
    assert.ok(m.detail.age >= 48 && m.detail.age <= 52, `age ${m.detail.age}`);
    for (const p of m.passes) {
      assert.ok(Math.abs(Eph.signedDiff(chironAt(at(p)) - natal.chiron)) < 0.01, `pass ${p} is exact`);
    }
  }
});

test('progressed Moon return: ~27.3 years after birth, exact on the natal Moon', () => {
  const natal = natalAt('1997-09-24T08:00:00Z');
  const moments = run(natal, '2024-01-01T00:00:00Z', '2026-12-31T00:00:00Z');
  const ret = moments.find((m) => m.kind === 'progressed_moon_return');
  assert.ok(ret, 'progressed Moon return found');
  const years = (at(ret.peak) - natal.birthMs) / YEAR;
  assert.ok(years > 26.8 && years < 27.9, `at ${years.toFixed(2)} years`);
  const progressedMs = natal.birthUtcMs + (at(ret.peak) - natal.birthUtcMs) / 365.24219;
  const moonThen = Eph.longitudeAt('Moon', progressedMs);
  const natalMoon = natal.points.find((p) => p.id === 'Moon').longitude;
  assert.ok(Math.abs(Eph.signedDiff(moonThen - natalMoon)) < 0.05, 'progressed Moon on the natal Moon');
});

test('progressed sign changes and lunations land where the progressed body crosses', () => {
  const natal = natalAt('1997-09-24T08:00:00Z');
  const moments = run(natal, '2020-01-01T00:00:00Z', '2030-12-31T00:00:00Z');
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const moonSigns = moments.filter((m) => m.kind === 'progressed_moon_sign');
  // ~13° a year: three to five sign changes in eleven years.
  assert.ok(moonSigns.length >= 3 && moonSigns.length <= 5, `${moonSigns.length} progressed Moon ingresses`);
  for (const m of [...moonSigns, ...moments.filter((x) => x.kind === 'progressed_sun_sign')]) {
    const p = natal.birthUtcMs + (at(m.peak) - natal.birthUtcMs) / 365.24219;
    const lon = Eph.longitudeAt(m.planet, p);
    const boundary = signs.indexOf(m.detail.sign) * 30;
    assert.ok(Math.abs(Eph.signedDiff(lon - boundary)) < 0.05, `${m.kind} ${m.detail.sign} at ${lon}`);
  }
  // Born with the Sun at ~1° Libra: the progressed Sun reaches Scorpio at about 29.
  const sun = moments.find((m) => m.kind === 'progressed_sun_sign');
  assert.ok(sun && sun.detail.sign === 'Scorpio' && sun.detail.age >= 28 && sun.detail.age <= 29, JSON.stringify(sun?.detail));
  for (const m of moments.filter((x) => x.kind === 'progressed_lunation')) {
    const p = natal.birthUtcMs + (at(m.peak) - natal.birthUtcMs) / 365.24219;
    const elong = Eph.norm360(Eph.longitudeAt('Moon', p) - Eph.longitudeAt('Sun', p));
    const want = m.detail.lunationKind === 'full' ? 180 : 0;
    assert.ok(Math.abs(Eph.signedDiff(elong - want)) < 0.05, `${m.detail.lunationKind} at elongation ${elong}`);
  }
});

test('without a birth time, progressed Moon moments are only "possible" and ranked lower', () => {
  const sure = run(natalAt('1997-09-24T08:00:00Z'), '2024-01-01T00:00:00Z', '2026-12-31T00:00:00Z');
  const unsure = run(natalAt('1997-09-24T08:00:00Z', { unknownTime: true }), '2024-01-01T00:00:00Z', '2026-12-31T00:00:00Z');
  const a = sure.find((m) => m.kind === 'progressed_moon_return');
  const b = unsure.find((m) => m.kind === 'progressed_moon_return');
  assert.equal(a.certainty, 'exact');
  assert.equal(b.certainty, 'possible');
  assert.ok(b.salience < a.salience);
});
