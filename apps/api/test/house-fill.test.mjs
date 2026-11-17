// Houses for points the ephemeris library leaves unhoused. Run: npm test --workspace @astroflow/api
//
// The library stores the 12th house's end as 0° Aries instead of the 1st cusp,
// so whenever the 12th house spans 0° Aries, anything between 0° Aries and the
// Ascendant gets no house and used to surface as "house 0".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fillMissingHouses, houseOfLongitude } from '../src/modules/astrology/house-fill.ts';

const require = createRequire(import.meta.url);
const { Origin, Horoscope } = require('circular-natal-horoscope-js');

// Istanbul 2018-03-10 08:15: Ascendant 9°42′ Aries, 12th cusp 25°38′ Aquarius;
// Mercury (6°25′ Aries) and Venus (4°01′ Aries) sit in the unhoused gap.
const castIstanbul = () =>
  new Horoscope({
    origin: new Origin({ year: 2018, month: 2, date: 10, hour: 8, minute: 15, latitude: 41.0082, longitude: 28.9784 }),
    houseSystem: 'placidus',
    zodiac: 'tropical',
    aspectPoints: ['bodies', 'angles'],
    aspectWithPoints: ['bodies', 'angles'],
    aspectTypes: ['major'],
    language: 'en',
  });

test('the library still leaves the 0° Aries → Ascendant gap unhoused (guards this fix)', () => {
  const h = castIstanbul();
  assert.equal(h.CelestialBodies.mercury.House, undefined);
  assert.equal(h.CelestialBodies.venus.House, undefined);
});

test('fillMissingHouses puts the gap in the 12th house and leaves placed points alone', () => {
  const h = castIstanbul();
  const before = Object.fromEntries(h.CelestialBodies.all.filter((b) => b.House).map((b) => [b.label, b.House.id]));
  fillMissingHouses(h);
  assert.equal(h.CelestialBodies.mercury.House.id, 12);
  assert.equal(h.CelestialBodies.venus.House.id, 12);
  for (const [label, id] of Object.entries(before)) {
    assert.equal(h.CelestialBodies.all.find((b) => b.label === label).House.id, id, label);
  }
  for (const p of [...h.CelestialBodies.all, ...h.CelestialPoints.all]) {
    assert.ok(p.House.id >= 1 && p.House.id <= 12, `${p.label} house ${p.House.id}`);
  }
});

test('houseOfLongitude handles the 0° Aries wrap and cusp boundaries', () => {
  // Cusps starting at 25° Aquarius for the 12th (wrap through 0° Aries into the 1st).
  const cusps = [9.7, 48.44, 73.82, 95.11, 117.22, 145.63, 189.7, 228.44, 253.82, 275.11, 297.22, 325.63];
  assert.equal(houseOfLongitude(6.42, cusps), 12);
  assert.equal(houseOfLongitude(359.9, cusps), 12);
  assert.equal(houseOfLongitude(325.63, cusps), 12); // a cusp belongs to the house it opens
  assert.equal(houseOfLongitude(9.7, cusps), 1);
  assert.equal(houseOfLongitude(9.69, cusps), 12);
  assert.equal(houseOfLongitude(200, cusps), 7);
  assert.equal(houseOfLongitude(-10, cusps), 12); // normalised
});

test('every point gets a house 1–12 across many charts', () => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 300; i++) {
    const d = new Date(Date.UTC(1950, 0, 1) + rnd() * 2.05e12);
    const h = fillMissingHouses(
      new Horoscope({
        origin: new Origin({
          year: d.getUTCFullYear(),
          month: d.getUTCMonth(),
          date: d.getUTCDate(),
          hour: d.getUTCHours(),
          minute: d.getUTCMinutes(),
          latitude: 36 + rnd() * 6,
          longitude: 26 + rnd() * 18,
        }),
        houseSystem: 'placidus',
        zodiac: 'tropical',
        aspectPoints: [],
        aspectWithPoints: [],
        aspectTypes: [],
        language: 'en',
      }),
    );
    for (const p of [...h.CelestialBodies.all, ...h.CelestialPoints.all]) {
      assert.ok(p.House?.id >= 1 && p.House.id <= 12, `chart ${i} ${p.label}`);
    }
  }
});
