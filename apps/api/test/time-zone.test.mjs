// Local clock ↔ UTC through ICU's tz database. Run: npm test --workspace @astroflow/api
//
// Expected offsets are civil-time facts from the IANA tz database (tzdata ≥ 2022):
// - Turkey: permanent UTC+3 since 2016-09-07; EET/EEST before. Summer 1963 and
//   1978–1985 corrected in later tzdb releases (the ephemeris library's bundled
//   2019b data still had them wrong).
// - Iran: no DST since 2022 (summer 2024 is UTC+3:30).
// - US Central 2021-03-14: clocks jump 02:00 → 03:00; Europe/Berlin
//   2021-10-31: 02:00–03:00 happens twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { utcFromWall, wallFromUtc, zoneOffsetMs } from '../src/modules/astrology/time-zone.ts';

const require = createRequire(import.meta.url);
const { Origin } = require('circular-natal-horoscope-js');
const wall = (iso) => Date.parse(`${iso}Z`);
const H = 3_600_000;

test('ordinary local times map to the civil UTC offset', () => {
  assert.equal(utcFromWall('Europe/Istanbul', wall('2018-03-10T08:15')), Date.parse('2018-03-10T05:15Z'));
  assert.equal(utcFromWall('Europe/Istanbul', wall('1990-08-20T21:45')), Date.parse('1990-08-20T18:45Z'));
  assert.equal(utcFromWall('Europe/Istanbul', wall('1992-01-05T06:00')), Date.parse('1992-01-05T04:00Z'));
  assert.equal(utcFromWall('Asia/Tehran', wall('2024-06-04T21:10')), Date.parse('2024-06-04T17:40Z'));
  assert.equal(utcFromWall('America/New_York', wall('2000-07-01T12:00')), Date.parse('2000-07-01T16:00Z'));
});

test('years the bundled 2019b data got wrong now follow current tzdb', () => {
  for (const [local, offsetH] of [
    ['1963-06-05T01:19', 3],
    ['1979-06-07T13:22', 3],
    ['1982-08-10T17:10', 3],
    ['1985-02-03T04:33', 2],
  ]) {
    assert.equal(utcFromWall('Europe/Istanbul', wall(local)), wall(local) - offsetH * H, local);
  }
  // Guard: the library's own conversion still disagrees, so the fix stays necessary.
  const lib = new Origin({ year: 1979, month: 5, date: 7, hour: 13, minute: 22, latitude: 39.9334, longitude: 32.8597 });
  assert.notEqual(Date.parse(lib.utcTimeFormatted), wall('1979-06-07T13:22') - 3 * H);
});

test('clock changes: skipped hour lands after the gap, repeated hour takes its first pass', () => {
  // 02:30 does not exist in Chicago on 2021-03-14; read with CST (-6) → 08:30Z = 03:30 CDT.
  assert.equal(utcFromWall('America/Chicago', wall('2021-03-14T02:30')), Date.parse('2021-03-14T08:30Z'));
  // 02:30 happens twice in Berlin on 2021-10-31; the first pass is CEST (+2) → 00:30Z.
  assert.equal(utcFromWall('Europe/Berlin', wall('2021-10-31T02:30')), Date.parse('2021-10-31T00:30Z'));
});

test('wallFromUtc inverts utcFromWall and keeps second-exact LMT offsets', () => {
  for (const [zone, iso] of [
    ['Europe/Istanbul', '1975-11-02T23:59'],
    ['Australia/Sydney', '2001-01-01T00:00'],
    ['Asia/Kolkata', '1999-12-31T23:30'],
  ]) {
    assert.equal(wallFromUtc(zone, utcFromWall(zone, wall(iso))), wall(iso), `${zone} ${iso}`);
  }
  // Istanbul Mean Time (before 1910) is +1:56:56 in tzdb.
  assert.equal(zoneOffsetMs('Europe/Istanbul', Date.parse('1900-01-01T00:00Z')), (1 * 3600 + 56 * 60 + 56) * 1000);
});
