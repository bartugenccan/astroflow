#!/usr/bin/env node
// Astrology consistency check ("uyuşma testi").
//
// Runs the backend's real chart code (the compiled `dist`, no database, no
// HTTP) and checks:
//
//   1. Math      — every planet, the Ascendant/MC, the node and retrograde flags
//                  against an independent ephemeris (astronomy-engine), at a UTC
//                  instant written down by hand (so a time-zone bug cannot
//                  cancel itself out).
//   2. Internal  — signs, houses, rulers, nodes, sect, aspects and the Big Three
//                  agree with each other; today's transit report agrees with
//                  the independent ephemeris.
//   3. AI text   — every AI reading of the astrology routes, through the real
//                  controller and prompts, scanned for planet ↔ sign / house /
//                  retrograde / aspect claims that contradict the chart, and for
//                  English names in Turkish text. Reports only; never fails.
//   4. Privacy   — every prompt the routes build (recorded, no AI cost) must not
//                  carry the birth date, time, coordinates, or birthday + age.
//   5. Bulk math — thousands of random instants and places, Feb 1901–2100.
//   6. Time zone — random local times 1950–2025 in Turkish and world cities,
//                  end to end, against moment-timezone's current tz data.
//
// Usage (from apps/api):
//   npm run check:astro                         # build + default cases, AI on case 1
//   node scripts/astro-consistency.mjs --no-ai  # everything except real AI calls
//   node scripts/astro-consistency.mjs --bulk 2000 --tz 2000   # bigger random samples (0 = skip)
//   node scripts/astro-consistency.mjs --date 1994-11-02 --time 23:40 \
//        --lat 38.4237 --lon 27.1428 --utc 1994-11-02T21:40:00Z --locale tr
//
// `--utc` is the birth instant in UTC as YOU know it (from the civil time-zone
// rules of that place and date). It is required for a custom case: it is the
// independent reference the backend's own time-zone lookup is checked against.

import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const require = createRequire(import.meta.url);
const API_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(API_ROOT, 'dist', 'src');

// ─── Cases ──────────────────────────────────────────────────────────────────
// UTC instants come from Turkey's civil time rules, not from any library:
// permanent UTC+3 since 2016-09-07; before that EET (UTC+2) in winter and
// EEST (UTC+3) in summer.
const DEFAULT_CASES = [
  {
    label: 'İstanbul 2018-03-10 08:15 (kalıcı UTC+3 dönemi, kış)',
    birthDate: '2018-03-10',
    birthTime: '08:15',
    latitude: 41.0082,
    longitude: 28.9784,
    utc: '2018-03-10T05:15:00Z',
  },
  {
    label: 'İstanbul 1990-08-20 21:45 (yaz saati dönemi, EEST UTC+3)',
    birthDate: '1990-08-20',
    birthTime: '21:45',
    latitude: 41.0082,
    longitude: 28.9784,
    utc: '1990-08-20T18:45:00Z',
  },
  {
    label: 'Ankara 1992-01-05 06:00 (yaz saati dönemi, kış, EET UTC+2)',
    birthDate: '1992-01-05',
    birthTime: '06:00',
    latitude: 39.9334,
    longitude: 32.8597,
    utc: '1992-01-05T04:00:00Z',
  },
];

// ─── Tolerances ─────────────────────────────────────────────────────────────
const TOL_PLANET_DEG = 0.1; // CNH vs astronomy-engine, Sun..Pluto
const TOL_MOON_DEG = 0.2; // the Moon moves ~0.5°/h; 0.2° ≈ 25 minutes of time
const TOL_ANGLE_DEG = 0.25; // Ascendant / MC (≈ 1 minute of time)
const TOL_NODE_DEG = 2.0; // mean vs true node differ by up to ~1.7°
const TOL_BIRTH_MIN = 10; // birth instant recovered from the Moon vs the hand-written UTC
const BORDER_DEG = 0.15; // closer than this to a sign/house edge → "border", not "fail"
const STATION_SPEED = 0.02; // deg/day: slower than this, the retrograde flag is ambiguous

// ─── CLI ────────────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    date: { type: 'string' },
    time: { type: 'string' },
    lat: { type: 'string' },
    lon: { type: 'string' },
    utc: { type: 'string' },
    label: { type: 'string' },
    locale: { type: 'string', default: 'tr' },
    'no-ai': { type: 'boolean', default: false },
    'ai-all': { type: 'boolean', default: false },
    out: { type: 'string' },
    rescan: { type: 'string' },
    bulk: { type: 'string', default: '500' },
    tz: { type: 'string', default: '510' },
    seed: { type: 'string', default: '20261117' },
  },
});

function buildCases() {
  const custom = [args.date, args.time, args.lat, args.lon, args.utc];
  if (custom.every((v) => v === undefined)) return DEFAULT_CASES;
  if (custom.some((v) => v === undefined)) {
    fatal('Özel tarih için --date --time --lat --lon --utc birlikte verilmeli.');
  }
  if (Number.isNaN(Date.parse(args.utc))) fatal(`--utc geçerli bir ISO zamanı değil: ${args.utc}`);
  return [
    {
      label: args.label ?? `${args.date} ${args.time} (${args.lat}, ${args.lon})`,
      birthDate: args.date,
      birthTime: args.time,
      latitude: Number(args.lat),
      longitude: Number(args.lon),
      utc: args.utc,
    },
  ];
}

function fatal(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(2);
}

// ─── Load backend code (compiled) ───────────────────────────────────────────
if (!existsSync(join(DIST, 'modules', 'astrology', 'astrology-adapter.service.js'))) {
  fatal('dist bulunamadı. Önce derle: npm run build --workspace @astroflow/api (ya da npm run check:astro).');
}
const { EphemerisService } = require(join(DIST, 'modules/astrology/ephemeris.service.js'));
const { AstrologyAdapterService } = require(join(DIST, 'modules/astrology/astrology-adapter.service.js'));
const C = require(join(DIST, 'modules/astrology/astrology.constants.js'));
const Eph = require(join(DIST, 'modules/astrology/sky/sky-ephemeris.js'));
const Astronomy = require('astronomy-engine');

const ephemeris = new EphemerisService();
const adapter = new AstrologyAdapterService(ephemeris);

// ─── Small helpers ──────────────────────────────────────────────────────────
const { norm360, signedDiff } = Eph;
const SIGNS = C.SIGNS;
const PLANETS = C.PLANETS;
const signOf = (lon) => SIGNS[Math.floor(norm360(lon) / 30)];
const distToSignEdge = (lon) => {
  const x = norm360(lon) % 30;
  return Math.min(x, 30 - x);
};
const fmt = (lon) => {
  const l = norm360(lon);
  const d = Math.floor(l % 30);
  const m = Math.floor(((l % 30) - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}′ ${signOf(l)}`;
};
const placementAbs = (p) => SIGNS.indexOf(p.sign) * 30 + p.degree + p.minute / 60;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** Which house (1..12) a longitude falls in, given cusp longitudes ordered 1..12. */
function houseOf(lon, cusps) {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    const span = norm360(end - start);
    if (norm360(lon - start) < span) return i + 1;
  }
  return 0;
}
const distToCusp = (lon, cusps) => Math.min(...cusps.map((c) => Math.abs(signedDiff(lon - c))));

/** Independent Ascendant and MC from sidereal time (astronomy-engine). */
function anglesAt(ms, lat, lon) {
  const time = Astronomy.MakeTime(new Date(ms));
  const ramc = rad(norm360(Astronomy.SiderealTime(time) * 15 + lon));
  const eps = rad(Astronomy.e_tilt(time).tobl);
  const phi = rad(lat);
  const mc = norm360(deg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps))));
  const asc = norm360(
    deg(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)))),
  );
  return { asc, mc };
}

/** Sun's altitude above the horizon (degrees) at an instant and place. */
function sunAltitude(ms, lat, lon) {
  const date = new Date(ms);
  const observer = new Astronomy.Observer(lat, lon, 0);
  const eq = Astronomy.Equator('Sun', date, observer, true, true);
  return Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal').altitude;
}

const ASPECT_ANGLE = { Conjunction: 0, Sextile: 60, Square: 90, Trine: 120, Opposition: 180 };

// ─── Result collection ──────────────────────────────────────────────────────
function makeLayer(name) {
  const rows = [];
  return {
    name,
    rows,
    pass: (check, detail = '') => rows.push({ status: 'pass', check, detail }),
    fail: (check, detail = '') => rows.push({ status: 'fail', check, detail }),
    border: (check, detail = '') => rows.push({ status: 'border', check, detail }),
    info: (check, detail = '') => rows.push({ status: 'info', check, detail }),
  };
}

// ─── Layer 1: math against an independent ephemeris ────────────────────────
function checkMath(c, raw, natal) {
  const L = makeLayer('1 · Matematik (bağımsız efemeris)');
  const ms = Date.parse(c.utc);
  const body = (name) => raw.CelestialBodies.all.find((b) => b.label === name);

  // Birth instant implied by the backend's own time-zone lookup, recovered from
  // its Moon. A time-zone error shows up here as whole hours.
  const localAsUtc = Date.parse(`${c.birthDate}T${c.birthTime}:00Z`);
  const recovered = Eph.birthInstantFromMoon(body('Moon').ChartPosition.Ecliptic.DecimalDegrees, localAsUtc);
  const offMin = (recovered - ms) / 60_000;
  const impliedOffsetH = (localAsUtc - recovered) / 3_600_000;
  const tzDetail = `backend'in kullandığı an ≈ ${new Date(recovered).toISOString().slice(0, 16)}Z (UTC${impliedOffsetH >= 0 ? '+' : ''}${impliedOffsetH.toFixed(2)}), beklenen ${c.utc}`;
  if (Math.abs(offMin) <= TOL_BIRTH_MIN) L.pass('Doğum anı / saat dilimi', tzDetail);
  else L.fail('Doğum anı / saat dilimi', `${tzDetail} → fark ${offMin.toFixed(0)} dk`);

  for (const name of PLANETS) {
    const b = body(name);
    const got = b.ChartPosition.Ecliptic.DecimalDegrees;
    const ref = Eph.longitudeAt(name, ms);
    const diff = Math.abs(signedDiff(got - ref));
    const tol = name === 'Moon' ? TOL_MOON_DEG : TOL_PLANET_DEG;
    const detail = `backend ${fmt(got)} · referans ${fmt(ref)} · fark ${diff.toFixed(3)}°`;
    if (diff <= tol && signOf(got) === signOf(ref)) L.pass(`${name} konumu`, detail);
    else if (signOf(got) !== signOf(ref) && distToSignEdge(ref) < BORDER_DEG && diff <= tol)
      L.border(`${name} konumu`, `${detail} (burç sınırında)`);
    else L.fail(`${name} konumu`, detail);

    if (name === 'Sun' || name === 'Moon') continue;
    const speed = Eph.speedAt(name, ms);
    const refRetro = speed < 0;
    const gotRetro = !!b.isRetrograde;
    const rDetail = `backend ${gotRetro ? 'retro' : 'direkt'} · referans ${refRetro ? 'retro' : 'direkt'} (hız ${speed.toFixed(3)}°/gün)`;
    if (gotRetro === refRetro) L.pass(`${name} retro bayrağı`, rDetail);
    else if (Math.abs(speed) < STATION_SPEED) L.border(`${name} retro bayrağı`, `${rDetail} (durağan)`);
    else L.fail(`${name} retro bayrağı`, rDetail);
  }

  const ref = anglesAt(ms, c.latitude, c.longitude);
  for (const [label, got, want] of [
    ['Yükselen (ASC)', raw.Ascendant.ChartPosition.Ecliptic.DecimalDegrees, ref.asc],
    ['Tepe noktası (MC)', raw.Midheaven.ChartPosition.Ecliptic.DecimalDegrees, ref.mc],
  ]) {
    const diff = Math.abs(signedDiff(got - want));
    const detail = `backend ${fmt(got)} · referans ${fmt(want)} · fark ${diff.toFixed(3)}°`;
    if (diff <= TOL_ANGLE_DEG && signOf(got) === signOf(want)) L.pass(label, detail);
    else if (diff <= TOL_ANGLE_DEG && distToSignEdge(want) < BORDER_DEG) L.border(label, `${detail} (burç sınırında)`);
    else L.fail(label, detail);
  }

  const north = raw.CelestialPoints.northnode.ChartPosition.Ecliptic.DecimalDegrees;
  const meanNode = Eph.meanNorthNodeAt(ms);
  const nDiff = Math.abs(signedDiff(north - meanNode));
  const nDetail = `backend ${fmt(north)} · ortalama düğüm ${fmt(meanNode)} · fark ${nDiff.toFixed(2)}°`;
  if (nDiff <= TOL_NODE_DEG) L.pass('Kuzey Ay Düğümü', nDetail);
  else L.fail('Kuzey Ay Düğümü', nDetail);
  if (signOf(north) !== signOf(meanNode))
    L.info('Düğüm burcu (gerçek/ortalama)', `iki yöntem farklı burç veriyor: ${signOf(north)} / ${signOf(meanNode)}`);

  return L;
}

// ─── Layer 2: internal consistency ──────────────────────────────────────────
function checkInternal(c, raw, natal) {
  const L = makeLayer('2 · İç tutarlılık');
  const ms = Date.parse(c.utc);
  const cusps = raw.Houses.slice()
    .sort((a, b) => a.id - b.id)
    .map((h) => h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees);
  const rawLon = (name) =>
    raw.CelestialBodies.all.find((b) => b.label === name).ChartPosition.Ecliptic.DecimalDegrees;

  // Sign and house of every planet as the app shows them.
  for (const p of natal.planets) {
    const lon = rawLon(p.name);
    if (p.sign === signOf(lon) && Math.abs(signedDiff(placementAbs(p) - lon)) < 1 / 60 + 1e-9)
      L.pass(`${p.name} burç/derece`, `${p.sign} ${p.degree}°${p.minute}′`);
    else L.fail(`${p.name} burç/derece`, `gösterilen ${p.sign} ${p.degree}°${p.minute}′ · ham ${fmt(lon)}`);

    const h = houseOf(lon, cusps);
    if (h === p.house) L.pass(`${p.name} ev`, `${p.house}. ev`);
    else if (distToCusp(lon, cusps) < BORDER_DEG)
      L.border(`${p.name} ev`, `gösterilen ${p.house}. ev · hesap ${h}. ev (ev sınırında)`);
    else L.fail(`${p.name} ev`, `gösterilen ${p.house}. ev · hesap ${h}. ev`);
  }

  // Angles ↔ cusps (Placidus: cusp 1 = ASC, cusp 10 = MC).
  const asc = raw.Ascendant.ChartPosition.Ecliptic.DecimalDegrees;
  const mc = raw.Midheaven.ChartPosition.Ecliptic.DecimalDegrees;
  const d1 = Math.abs(signedDiff(cusps[0] - asc));
  const d10 = Math.abs(signedDiff(cusps[9] - mc));
  (d1 < 0.02 ? L.pass : L.fail)('1. ev başı = Yükselen', `fark ${d1.toFixed(3)}°`);
  (d10 < 0.02 ? L.pass : L.fail)('10. ev başı = MC', `fark ${d10.toFixed(3)}°`);
  for (let i = 0; i < 6; i++) {
    const opp = Math.abs(signedDiff(cusps[i] - cusps[i + 6] - 180));
    (opp < 0.02 ? L.pass : L.fail)(`${i + 1}. ve ${i + 7}. ev karşıt`, `fark ${opp.toFixed(3)}°`);
  }

  // Big Three summary.
  const sun = natal.planets.find((p) => p.name === 'Sun');
  const moon = natal.planets.find((p) => p.name === 'Moon');
  const s = natal.summary;
  const big3 = s.sunSign === sun.sign && s.moonSign === moon.sign && s.risingSign === natal.angles.ascendant.sign;
  (big3 ? L.pass : L.fail)(
    'Büyük Üçlü özeti',
    `Güneş ${s.sunSign} · Ay ${s.moonSign} · Yükselen ${s.risingSign}`,
  );
  (natal.houses[0].sign === natal.angles.ascendant.sign ? L.pass : L.fail)(
    '1. ev burcu = Yükselen burcu',
    `${natal.houses[0].sign} / ${natal.angles.ascendant.sign}`,
  );

  // House rulers point at the ruler's real placement; planetsInHouse matches.
  for (const h of natal.houses) {
    const ruler = C.TRADITIONAL_SIGN_RULER[h.sign];
    const rp = natal.planets.find((p) => p.name === ruler);
    const okRuler = h.ruler === ruler && h.rulerSign === rp.sign && h.rulerHouse === rp.house;
    const inHouse = natal.planets.filter((p) => p.house === h.house).map((p) => p.name).sort();
    const okList = JSON.stringify([...h.planetsInHouse].sort()) === JSON.stringify(inHouse);
    if (okRuler && okList)
      L.pass(`${h.house}. ev yönetici/içerik`, `${h.sign} → ${ruler} (${rp.sign}, ${rp.house}. ev)`);
    else
      L.fail(
        `${h.house}. ev yönetici/içerik`,
        `gösterilen ${h.ruler} ${h.rulerSign} ${h.rulerHouse}. ev · beklenen ${ruler} ${rp.sign} ${rp.house}. ev; gezegenler ${h.planetsInHouse.join(',')} / ${inHouse.join(',')}`,
      );
  }

  // Nodes are exactly opposite, in opposite houses.
  const n = natal.nodes.north;
  const so = natal.nodes.south;
  const opp = Math.abs(signedDiff(placementAbs(n) - placementAbs(so) - 180));
  (opp < 0.05 ? L.pass : L.fail)('Kuzey/Güney düğüm karşıt', `${n.sign} / ${so.sign}, fark ${opp.toFixed(3)}°`);
  const oppHouse = ((n.house + 5) % 12) + 1;
  if (so.house === oppHouse) L.pass('Düğüm evleri karşıt', `${n.house}. ev / ${so.house}. ev`);
  else if (distToCusp(placementAbs(n), cusps) < BORDER_DEG)
    L.border('Düğüm evleri karşıt', `${n.house}. ev / ${so.house}. ev (ev sınırında)`);
  else L.fail('Düğüm evleri karşıt', `${n.house}. ev / ${so.house}. ev`);

  // Sect: the app's day/night against the Sun's real altitude.
  const alt = sunAltitude(ms, c.latitude, c.longitude);
  const realSect = alt > 0 ? 'day' : 'night';
  const sDetail = `gösterilen ${natal.sect} · Güneş yüksekliği ${alt.toFixed(2)}°`;
  if (natal.sect === realSect) L.pass('Gündüz/gece haritası', sDetail);
  else if (Math.abs(alt) < 1) L.border('Gündüz/gece haritası', `${sDetail} (ufukta)`);
  else L.fail('Gündüz/gece haritası', sDetail);

  // Aspects: the separation really is the aspect angle ± orb.
  for (const a of natal.aspects) {
    const sep = Math.abs(signedDiff(rawLon(a.planet1) - rawLon(a.planet2)));
    const want = ASPECT_ANGLE[a.aspect];
    const realOrb = Math.abs(sep - want);
    const ok = want !== undefined && Math.abs(realOrb - a.orb) <= 0.06;
    (ok ? L.pass : L.fail)(
      `Açı ${a.planet1}–${a.planet2} ${a.aspect}`,
      `ayrım ${sep.toFixed(2)}°, gösterilen orb ${a.orb}°, gerçek ${realOrb.toFixed(2)}°`,
    );
  }

  return L;
}

/** Today's transit report against the independent ephemeris, same instant. */
function checkTransits(c) {
  const L = makeLayer('2b · Bugünkü transitler');
  const t0 = Date.now();
  const report = adapter.getTransitReport(c.birthDate, c.birthTime, c.latitude, c.longitude);
  const ms = (t0 + Date.now()) / 2;
  for (const m of report.movements) {
    const ref = Eph.longitudeAt(m.planet, ms);
    const got = placementAbs(m);
    const diff = Math.abs(signedDiff(got - ref));
    const tol = m.planet === 'Moon' ? TOL_MOON_DEG : TOL_PLANET_DEG;
    const detail = `backend ${fmt(got)}${m.retrograde ? ' R' : ''} · referans ${fmt(ref)} · fark ${diff.toFixed(3)}°`;
    if (diff <= tol + 1 / 60 && m.sign === signOf(ref)) L.pass(`${m.planet} bugün`, detail);
    else if (distToSignEdge(ref) < BORDER_DEG) L.border(`${m.planet} bugün`, `${detail} (burç sınırında)`);
    else L.fail(`${m.planet} bugün`, detail);

    if (m.planet === 'Sun' || m.planet === 'Moon') continue;
    const speed = Eph.speedAt(m.planet, ms);
    if (m.retrograde !== speed < 0) {
      if (Math.abs(speed) < STATION_SPEED) L.border(`${m.planet} retro (bugün)`, `durağan, hız ${speed.toFixed(3)}°/gün`);
      else L.fail(`${m.planet} retro (bugün)`, `backend ${m.retrograde ? 'retro' : 'direkt'}, hız ${speed.toFixed(3)}°/gün`);
    }
  }
  return { layer: L, report };
}

// ─── Layer 3: AI text scan ──────────────────────────────────────────────────
const TR_SIGN = {
  Aries: 'Koç', Taurus: 'Boğa', Gemini: 'İkizler', Cancer: 'Yengeç', Leo: 'Aslan', Virgo: 'Başak',
  Libra: 'Terazi', Scorpio: 'Akrep', Sagittarius: 'Yay', Capricorn: 'Oğlak', Aquarius: 'Kova', Pisces: 'Balık',
};
const TR_PLANET = {
  Sun: 'Güneş', Moon: 'Ay', Mercury: 'Merkür', Venus: 'Venüs', Mars: 'Mars', Jupiter: 'Jüpiter',
  Saturn: 'Satürn', Uranus: 'Uranüs', Neptune: 'Neptün', Pluto: 'Plüton',
};
const TR_ORDINAL = {
  birinci: 1, ikinci: 2, üçüncü: 3, dördüncü: 4, beşinci: 5, altıncı: 6, yedinci: 7, sekizinci: 8,
  dokuzuncu: 9, onuncu: 10, 'on birinci': 11, onbirinci: 11, 'on ikinci': 12, onikinci: 12,
};
const EN_ORDINAL = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9,
  tenth: 10, eleventh: 11, twelfth: 12,
};

const APOS = `['’]`;
// A Turkish proper noun with an optional apostrophe suffix ("Akrep'te", "Yay’da").
const trProper = (w) => new RegExp(`(?<!\\p{L})${w}(?:${APOS}\\p{L}+)?(?!\\p{L})`, 'gu');

function mentionPatterns(locale) {
  // English names: an English proper noun, optionally with a Turkish
  // apostrophe suffix ("Scorpio'da", "Sun'ın") — they leak into Turkish text.
  const enProper = (w) => new RegExp(`(?<!\\p{L})${w}(?:${APOS}\\p{L}+)?(?!\\p{L})`, 'gu');
  const signs = SIGNS.flatMap((s) =>
    locale === 'tr'
      ? [
          { kind: 'sign', key: s, re: trProper(TR_SIGN[s]) },
          { kind: 'sign', key: s, re: enProper(s), english: true },
        ]
      : [{ kind: 'sign', key: s, re: enProper(s) }],
  );
  const planets = PLANETS.flatMap((p) => {
    if (locale === 'en') return [{ kind: 'planet', key: p, re: enProper(p) }];
    const tr =
      p === 'Moon'
        ? new RegExp(`(?<!\\p{L})Ay(?:${APOS}\\p{L}+|ın|ın[ıi]z|ı)?(?!\\p{L})`, 'gu')
        : new RegExp(`(?<!\\p{L})${TR_PLANET[p]}(?:${APOS}?\\p{L}{0,6})?(?!\\p{L})`, 'gu');
    const out = [{ kind: 'planet', key: p, re: tr }];
    if (TR_PLANET[p] !== p) out.push({ kind: 'planet', key: p, re: enProper(p), english: true });
    return out;
  });
  const points =
    locale === 'tr'
      ? [
          { kind: 'planet', key: 'Ascendant', re: /(?<!\p{L})[Yy]ükselen\p{L}*/gu },
          { kind: 'planet', key: 'NorthNode', re: /Kuzey\s+(?:Ay\s+)?Düğüm\p{L}*/gu },
          { kind: 'planet', key: 'SouthNode', re: /Güney\s+(?:Ay\s+)?Düğüm\p{L}*/gu },
        ]
      : [
          { kind: 'planet', key: 'Ascendant', re: /\b(?:[Rr]ising|Ascendant)\b/g },
          { kind: 'planet', key: 'NorthNode', re: /\bNorth\s+Node\b/g },
          { kind: 'planet', key: 'SouthNode', re: /\bSouth\s+Node\b/g },
        ];
  const houses =
    locale === 'tr'
      ? [
          { kind: 'house', re: /(?<!\p{L})(\d{1,2})\.\s*ev(?:\p{L}*)/gu, n: (m) => Number(m[1]) },
          {
            kind: 'house',
            re: new RegExp(`(?<!\\p{L})(${Object.keys(TR_ORDINAL).join('|')})\\s+ev\\p{L}*`, 'giu'),
            n: (m) => TR_ORDINAL[m[1].toLowerCase()],
          },
        ]
      : [
          { kind: 'house', re: /\b(\d{1,2})(?:st|nd|rd|th)\s+house\b/gi, n: (m) => Number(m[1]) },
          { kind: 'house', re: /\bhouse\s+(\d{1,2})\b/gi, n: (m) => Number(m[1]) },
          {
            kind: 'house',
            re: new RegExp(`\\b(${Object.keys(EN_ORDINAL).join('|')})\\s+house\\b`, 'gi'),
            n: (m) => EN_ORDINAL[m[1].toLowerCase()],
          },
        ];
  const retro =
    locale === 'tr'
      ? [{ kind: 'retro', re: /(?<!\p{L})(?:retro\p{L}*|geri\s+hareket\p{L}*|geri\s+gid\p{L}*)/giu }]
      : [{ kind: 'retro', re: /\bretrograd\w*|\bRx\b/gi }];
  const aspects = Object.entries(locale === 'tr' ? TR_ASPECT : EN_ASPECT).map(([key, stem]) => ({
    kind: 'aspect',
    key,
    re: new RegExp(`(?<!\\p{L})${stem}\\p{L}*`, 'giu'),
  }));
  return [...signs, ...planets, ...points, ...houses, ...retro, ...aspects];
}

const TR_ASPECT = { Conjunction: 'kavuşum', Sextile: 'altmışlık', Square: 'kare', Trine: 'üçgen', Opposition: 'karşıt' };
const EN_ASPECT = { Conjunction: 'conjunct', Sextile: 'sextile', Square: 'square', Trine: 'trine', Opposition: 'oppos' };
const PLANET_SET = new Set(PLANETS);

function findMentions(text, locale) {
  const out = [];
  for (const p of mentionPatterns(locale)) {
    p.re.lastIndex = 0;
    for (const m of text.matchAll(p.re)) {
      out.push({
        kind: p.kind,
        key: p.kind === 'house' ? p.n(m) : p.key,
        start: m.index,
        end: m.index + m[0].length,
        raw: m[0],
        english: !!p.english,
      });
    }
  }
  // Drop mentions nested inside a longer one ("Ay" inside "Kuzey Ay Düğümü").
  out.sort((a, b) => a.start - b.start || b.end - a.end);
  return out.filter((m, i) => !out.some((o, j) => j !== i && o.start <= m.start && o.end >= m.end && (o.end - o.start) > (m.end - m.start)));
}

const WINDOW = 45; // characters after a planet in which its sign / house / "retro" is read

/**
 * Pair each planet mention with the sign, house and retrograde words that
 * describe it inside its sentence. "Akrep Güneşin" pairs a sign right before
 * a planet; otherwise the first sign after the planet, before the next planet.
 */
function extractClaims(text, locale) {
  const claims = [];
  // "10. evde" is an ordinal, not a sentence end.
  const sentences = text.split(/(?<=[.!?…])(?<!\d\.)\s+|\n+/u);
  let offset = 0;
  for (const sentence of sentences) {
    const ms = findMentions(sentence, locale);
    const consumed = new Set();
    const planets = ms.filter((m) => m.kind === 'planet');
    for (const p of planets) {
      const prevSign = ms.filter((m) => m.kind === 'sign' && m.end <= p.start).at(-1);
      if (prevSign && /^\s*$/.test(sentence.slice(prevSign.end, p.start))) {
        claims.push({ subject: p.key, type: 'sign', value: prevSign.key, sentence, at: offset + p.start });
        consumed.add(prevSign);
      }
    }
    for (const p of planets) {
      const nextPlanet = planets.find((q) => q.start > p.start);
      const limit = Math.min(p.end + WINDOW, nextPlanet ? nextPlanet.start : Infinity);
      const after = ms.filter((m) => m.start >= p.end && m.start < limit);
      const sign = after.find((m) => m.kind === 'sign' && !consumed.has(m));
      if (sign && !claims.some((c) => c.subject === p.key && c.sentence === sentence && c.type === 'sign')) {
        claims.push({ subject: p.key, type: 'sign', value: sign.key, sentence, at: offset + p.start });
        consumed.add(sign);
      }
      const house = after.find((m) => m.kind === 'house');
      if (house) claims.push({ subject: p.key, type: 'house', value: house.key, sentence, at: offset + p.start });
      const r = after.find((m) => m.kind === 'retro');
      if (r) claims.push({ subject: p.key, type: 'retro', value: true, sentence, at: offset + p.start });
    }
    // "Güneş ile Mars arasındaki kare", "Güneş Mars'a kare", "Sun square Mars":
    // an aspect word paired with the two closest distinct planets around it.
    for (const a of ms.filter((m) => m.kind === 'aspect')) {
      const near = planets
        .filter((p) => PLANET_SET.has(p.key) && Math.abs(p.start - a.start) <= 90)
        .sort((x, y) => Math.abs(x.start - a.start) - Math.abs(y.start - a.start));
      const two = [];
      for (const p of near) {
        if (two.length === 2) break;
        const same = two.find((q) => q.key === p.key);
        // "Ay'ın natal Ay'ına altmışlık": a transit to its own natal place.
        const between = same ? sentence.slice(Math.min(same.end, p.end), Math.max(same.start, p.start)) : '';
        if (!same || /natal/i.test(between)) two.push(p);
      }
      if (two.length === 2) {
        claims.push({ subject: two[0].key, type: 'aspect', value: { other: two[1].key, aspect: a.key }, sentence, at: offset + a.start });
      }
    }
    offset += sentence.length + 1;
  }
  return claims;
}

/** Facts a claim can be checked against: subject → { sign, house, retrograde }. */
function natalFacts(natal) {
  const f = {};
  for (const p of natal.planets) f[p.name] = { sign: p.sign, house: p.house, retrograde: p.retrograde };
  f.Ascendant = { sign: natal.angles.ascendant.sign, house: 1, retrograde: false };
  f.NorthNode = { sign: natal.nodes.north.sign, house: natal.nodes.north.house };
  f.SouthNode = { sign: natal.nodes.south.sign, house: natal.nodes.south.house };
  f._aspects = natal.aspects.flatMap((a) => [`${a.planet1}|${a.planet2}|${a.aspect}`, `${a.planet2}|${a.planet1}|${a.aspect}`]);
  return f;
}
function transitFacts(report) {
  const f = {};
  for (const m of report.movements) f[m.planet] = { sign: m.sign, house: m.natalHouse, retrograde: m.retrograde };
  f._aspects = [
    // transit → natal
    ...report.movements.flatMap((m) =>
      m.aspects.flatMap((a) => [`${m.planet}|${a.natalPlanet}|${a.aspect}`, `${a.natalPlanet}|${m.planet}|${a.aspect}`]),
    ),
    // the general sky: transiting planets with each other
    ...(report.skyAspects ?? []).flatMap((a) => [`${a.planet1}|${a.planet2}|${a.aspect}`, `${a.planet2}|${a.planet1}|${a.aspect}`]),
  ];
  return f;
}

const shortSentence = (s) => (s.length > 220 ? `${s.slice(0, 217)}…` : s).replace(/\s+/g, ' ').trim();

function scanReading(name, text, locale, facts, altFacts, opts = {}) {
  const flags = [];
  let confirmed = 0;
  for (const c of extractClaims(text, locale)) {
    if (c.type === 'house' && !(c.value >= 1 && c.value <= 12)) {
      flags.push({ reading: name, kind: 'ev', claim: `${c.subject} → ${c.value}. ev`, chart: 'geçersiz ev numarası', sentence: shortSentence(c.sentence) });
      continue;
    }
    if (c.type === 'aspect') {
      const key = `${c.subject}|${c.value.other}|${c.value.aspect}`;
      if ((facts._aspects ?? []).includes(key) || (altFacts?._aspects ?? []).includes(key)) confirmed++;
      else if (!opts.skipAspects)
        flags.push({ reading: name, kind: 'açı', claim: `${c.subject} ${c.value.aspect} ${c.value.other}`, chart: 'haritada bu açı yok', sentence: shortSentence(c.sentence) });
      continue;
    }
    if (c.type === 'sign' && opts.skipSigns?.has(c.subject)) continue;
    const fact = facts[c.subject];
    if (!fact) continue;
    if (c.type === 'sign') {
      if (fact.sign === c.value) confirmed++;
      else if (altFacts?.[c.subject]?.sign === c.value) confirmed++; // e.g. natal Sun mentioned in a transit text
      else flags.push({ reading: name, kind: 'burç', claim: `${c.subject} → ${c.value}`, chart: fact.sign, sentence: shortSentence(c.sentence) });
    } else if (c.type === 'house') {
      if (fact.house === c.value || altFacts?.[c.subject]?.house === c.value) confirmed++;
      else flags.push({ reading: name, kind: 'ev', claim: `${c.subject} → ${c.value}. ev`, chart: `${fact.house}. ev`, sentence: shortSentence(c.sentence) });
    } else if (c.type === 'retro' && fact.retrograde === false && altFacts?.[c.subject]?.retrograde !== true) {
      flags.push({ reading: name, kind: 'retro', claim: `${c.subject} retro`, chart: 'direkt', sentence: shortSentence(c.sentence) });
    } else if (c.type === 'retro') confirmed++;
  }
  if (locale === 'tr') {
    const leaked = new Map();
    for (const m of findMentions(text, locale)) {
      if (!m.english) continue;
      const word = m.raw.replace(/['’].*$/u, '');
      if (!leaked.has(word)) leaked.set(word, { count: 0, at: m.start, tr: TR_SIGN[m.key] ?? TR_PLANET[m.key] });
      leaked.get(word).count++;
    }
    for (const [word, l] of leaked) {
      flags.push({
        reading: name,
        kind: 'dil',
        claim: `İngilizce ad "${word}"${l.count > 1 ? ` ×${l.count}` : ''}`,
        chart: l.tr,
        sentence: shortSentence(text.slice(Math.max(0, l.at - 60), l.at + 80)),
      });
    }
  }
  return { flags, confirmed };
}

/** A .env reader for the few AI keys (no dependency, values never printed). */
function loadEnv() {
  const env = {};
  const file = join(API_ROOT, '.env');
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/**
 * The real AstrologyController (compiled), wired by hand: no database (cache
 * reads miss, writes are dropped), no HTTP, no guards. `provider` is the AI.
 */
function buildController(provider) {
  const { InterpretationService } = require(join(DIST, 'modules/astrology/interpretation.service.js'));
  const { AstrologyController } = require(join(DIST, 'modules/astrology/astrology.controller.js'));
  const { SolarReturnService } = require(join(DIST, 'modules/astrology/solar-return.service.js'));
  const { SynastryService } = require(join(DIST, 'modules/astrology/synastry.service.js'));
  const { SkyMomentsEngine } = require(join(DIST, 'modules/astrology/sky/sky-moments.engine.js'));
  const quiet = { warn: () => {}, log: () => {}, error: () => {}, debug: () => {} };
  const prisma = { interpretation: { findUnique: async () => null, upsert: async () => ({}) } };
  const interpretation = new InterpretationService(provider, prisma);
  interpretation.logger = quiet;
  const controller = new AstrologyController(
    adapter,
    interpretation,
    new SynastryService(adapter),
    new SolarReturnService(ephemeris),
    null,
    prisma,
    { get: (_k, d) => d },
    { awardSafely: async () => {} },
    new SkyMomentsEngine(),
  );
  controller.logger = quiet;
  return controller;
}

/** Every AI reading the astrology routes serve, as [label, kind, call, pick-texts]. */
function aiRoutes(controller, c, locale) {
  const dto = { birthDate: c.birthDate, birthTime: c.birthTime, latitude: c.latitude, longitude: c.longitude };
  const forecastText = (v) => [v.overview, ...v.themes.map((x) => x.text), ...v.keyDates.map((k) => k.label)].join(' ');
  return [
    ['Büyük Üçlü', 'natal', () => controller.getBigThree(dto, locale), (v) => [['Büyük Üçlü', v.text]]],
    ['Yerleşimler', 'natal', () => controller.getPlacements(dto, locale), (v) => v.map((p) => [`Yerleşim: ${p.planet}`, p.text])],
    ['Açılar', 'natal', () => controller.getAspects(dto, locale), (v) => v.map((a) => [`Açı: ${a.planet1} ${a.aspect} ${a.planet2}`, a.text])],
    ['Genel bakış', 'natal', () => controller.getOverview(dto, locale), (v) => [['Genel bakış', v.text]]],
    ['Ay düğümleri', 'natal', () => controller.getNodes(dto, locale), (v) => [['Ay düğümleri', v.text]]],
    ['Harita bağlamı', 'natal', () => controller.getChartContext(dto, locale), (v) => [['Harita bağlamı', v.text]]],
    ...Array.from({ length: 12 }, (_, i) => [
      `${i + 1}. ev`,
      'natal',
      () => controller.getHouse(dto, String(i + 1), locale),
      (v) => [[`Ev ${i + 1}`, v.text]],
    ]),
    ['Bugünün gökyüzü', 'transit', () => controller.getTransitOverview(dto, locale), (v) => [['Transit özeti', v.text]]],
    ['Satürn transiti', 'transit', () => controller.getTransitDetail(dto, 'Saturn', locale), (v) => [['Transit: Satürn', v.text]]],
    ['Günlük içgörü', 'transit', () => controller.getDailyInsight(dto, 'consistency-check', locale), (v) => [['Günlük içgörü', `${v.title}. ${v.summary}`]]],
    ['Haftalık tahmin', 'weekly', () => controller.getWeeklyForecast(dto, undefined, locale), (v) => [['Haftalık tahmin', forecastText(v)]]],
    ['Aylık tahmin', 'monthly', () => controller.getMonthlyForecast(dto, undefined, locale), (v) => [['Aylık tahmin', forecastText(v)]]],
    [
      'Yıllık yorum',
      'year',
      () => controller.getYearAhead(dto, undefined, locale),
      (v) => [
        ['Yıllık yorum', [v.headline, v.overview, ...(v.strengths ?? []).map((x) => x.text), ...(v.tender ?? []).map((x) => x.text), v.why].join(' ')],
      ],
    ],
  ];
}

async function checkAiText(c, natal, report, locale) {
  const env = { ...loadEnv(), ...process.env };
  const providerName = (env.AI_PROVIDER ?? 'deepseek').toLowerCase();
  if (providerName !== 'deepseek' || !env.DEEPSEEK_API_KEY) {
    return { skipped: `AI katmanı atlandı: DEEPSEEK_API_KEY yok ya da AI_PROVIDER=${providerName}.` };
  }
  const { DeepSeekProvider } = require(join(DIST, 'modules/ai/deepseek.provider.js'));
  const config = { get: (k, d) => (env[k] !== undefined && env[k] !== '' ? env[k] : d) };
  const inner = new DeepSeekProvider(config);

  // Counts real model answers vs stub fallbacks, so a green run cannot be a stub run.
  // Per reading through AsyncLocalStorage: the readings run in parallel.
  const stats = { ok: 0, failed: 0 };
  const perCall = new AsyncLocalStorage();
  const tally = (key) => {
    stats[key]++;
    const s = perCall.getStore();
    if (s) s[key]++;
  };
  const provider = {
    get available() {
      return inner.available;
    },
    get model() {
      return inner.model;
    },
    generateText: (p) => inner.generateText(p),
    async generateJson(p) {
      try {
        const r = await inner.generateJson(p);
        tally('ok');
        return r;
      } catch (e) {
        tally('failed');
        throw e;
      }
    },
  };
  const controller = buildController(provider);

  const readings = [];
  const calls = await Promise.all(
    aiRoutes(controller, c, locale).map(([name, kind, fn, pick]) => {
      const own = { ok: 0, failed: 0 };
      return perCall.run(own, async () => {
        try {
          const value = await fn();
          for (const [label, text] of pick(value)) readings.push({ name: label, kind, text, stub: own.failed > 0 });
          return { name, ai: own.ok, stub: own.failed };
        } catch (e) {
          return { name, ai: own.ok, stub: own.failed, error: String(e?.message ?? e) };
        }
      });
    }),
  );

  const facts = { natal: natalFacts(natal), transit: transitFacts(report) };
  return { calls, readings, facts, stats, model: inner.model, ...scanAll(readings, locale, facts) };
}

// Fast-moving bodies change sign inside a forecast window: their sign claims
// are not checked there (a "Moon in Leo on Thursday" is not today's sky).
const SKIP_SIGNS = {
  weekly: new Set(['Moon']),
  monthly: new Set(['Moon', 'Sun', 'Mercury', 'Venus', 'Mars']),
  year: new Set(PLANETS),
};

function scanAll(readings, locale, facts) {
  const flags = [];
  let confirmed = 0;
  for (const r of readings) {
    const kind = r.kind ?? (r.name === 'Transit özeti' ? 'transit' : 'natal');
    const res =
      kind === 'natal'
        ? scanReading(r.name, r.text, locale, facts.natal)
        : scanReading(r.name, r.text, locale, facts.transit, facts.natal, {
            skipSigns: SKIP_SIGNS[kind],
            skipAspects: kind !== 'transit',
          });
    for (const f of res.flags) f.stub = !!r.stub;
    flags.push(...res.flags);
    confirmed += res.confirmed;
  }
  return { flags, confirmed };
}

// ─── Layer 4: what the language model is shown (privacy) ────────────────────
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Patterns that would hand the model the person's birth data, directly or recoverably. */
function birthDataPatterns(c) {
  const [y, m, d] = c.birthDate.split('-').map(Number);
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const coord = (v) => {
    const [i, f = ''] = String(v).split('.');
    return f.length >= 2 ? new RegExp(`(?<!\\d)-?${i}[.,]${f.slice(0, 2)}`) : null;
  };
  const near = (delta) => {
    const t = new Date(Date.UTC(2000, m - 1, d + delta));
    return `${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
  };
  const birthdays = [-1, 0, 1].map(near);
  const fullDate = [
    `${y}-${mm}-${dd}`,
    `${dd}[./]${mm}[./]${y}`,
    `${d}\\s+(?:${TR_MONTHS[m - 1]}|${EN_MONTHS[m - 1]})\\s+${y}`,
    `${EN_MONTHS[m - 1]}\\s+${d},?\\s+${y}`,
  ].join('|');
  return [
    { what: 'doğum tarihi', re: new RegExp(fullDate) },
    { what: 'doğum saati', re: new RegExp(`(?<!\\d)${c.birthTime}(?!\\d)`) },
    { what: 'enlem', re: coord(c.latitude) },
    { what: 'boylam', re: coord(c.longitude) },
    { what: 'doğum yılı', re: new RegExp(`(?<!\\d)${y}(?!\\d)`) },
    // A date on the birthday (±1 day, any year) next to an age gives the birth date back.
    { what: 'doğum günü (yıl içindeki tarih)', re: new RegExp(`\\d{4}-(?:${birthdays.join('|')})(?!\\d)`) },
    { what: 'yaş', re: /(?<!\d)\d{1,3}\s+yaşına|\bturn(?:s|ing)?\s+\d{1,3}\b/i },
  ].filter((p) => p.re);
}

async function checkPrivacy(c, locale) {
  const L = makeLayer('4 · Gizlilik (dil modeline giden metin)');
  const seen = [];
  const perRoute = new AsyncLocalStorage();
  const record = (text) => seen.push({ route: perRoute.getStore(), text });
  // A recording stand-in for the model: free, deterministic, sees exactly what the real one would.
  const provider = {
    available: true,
    model: 'recorder',
    generateText: async (p) => (record(`${p.system}\n${p.user}`), ''),
    generateJson: async (p) => (record(`${p.system}\n${p.user}\n${p.schemaHint ?? ''}`), {}),
  };
  const controller = buildController(provider);
  const routes = aiRoutes(controller, c, locale);
  // The recorder answers `{}`, so every route also falls back to its template
  // reading — exactly what users see when the model is down or over budget.
  const templates = [];
  await Promise.all(
    routes.map(([name, , fn, pick]) =>
      perRoute.run(name, async () => {
        try {
          for (const [label, text] of pick(await fn())) templates.push({ label, text });
        } catch {
          // A route that throws simply has no template text to scan.
        }
      }),
    ),
  );
  if (locale === 'tr') {
    const leaks = templates.flatMap((r) => scanReading(r.label, r.text, 'tr', {}).flags.filter((f) => f.kind === 'dil'));
    if (!leaks.length) L.pass('Şablon metinleri (model yanıt vermezse)', `${templates.length} metin, İngilizce ad yok`);
    else L.fail('Şablon metinleri (model yanıt vermezse)', `${leaks.length} İngilizce ad · örn. ${leaks.slice(0, 3).map((f) => `${f.reading}: ${f.claim}`).join('; ')}`);
  }

  const patterns = birthDataPatterns(c);
  for (const [route] of routes) {
    const texts = seen.filter((s) => s.route === route).map((s) => s.text);
    if (!texts.length) {
      L.info(route, 'bu girdiyle prompt üretmedi');
      continue;
    }
    const hits = patterns.filter((p) => texts.some((t) => p.re.test(t)));
    if (!hits.length) {
      L.pass(route, `${texts.length} prompt, doğum verisi yok`);
      continue;
    }
    const sample = texts.map((t) => t.match(hits[0].re)).find(Boolean);
    const around = sample ? sample.input.slice(Math.max(0, sample.index - 50), sample.index + 40).replace(/\s+/g, ' ') : '';
    L.fail(route, `${hits.map((h) => h.what).join(', ')} — örn. “…${around}…”`);
  }
  return L;
}

function printAi(ai, locale) {
  const stubbed = ai.calls.filter((x) => x.stub > 0 || x.error);
  console.log(
    `    model ${ai.model} · ${ai.readings.length} metin · ${ai.stats.ok} gerçek yanıt, ${ai.stats.failed} şablona düştü`,
  );
  for (const x of stubbed) console.log(`    ! ${x.name}: ${x.error ? `hata ${x.error}` : `${x.stub} çağrı şablona düştü`}`);
  const factual = ai.flags.filter((f) => f.kind !== 'dil');
  const language = ai.flags.filter((f) => f.kind === 'dil');
  console.log(`    ${ai.confirmed} iddia haritayla uyumlu, ${factual.length} çelişki işaretli`);
  for (const f of factual) {
    console.log(`    ⚑ [${f.kind}] ${f.reading}${f.stub ? ' (şablon metin)' : ''}: ${f.claim} (haritada: ${f.chart})`);
    console.log(`        “${f.sentence}”`);
  }
  if (language.length) {
    const words = new Map();
    for (const f of language) {
      const [, w, n] = f.claim.match(/"(.+?)"(?: ×(\d+))?/) ?? [];
      if (w) words.set(w, (words.get(w) ?? 0) + Number(n ?? 1));
    }
    const readingsHit = new Set(language.map((f) => f.reading)).size;
    const list = [...words].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ×${n}`).join(', ');
    console.log(`    ⚑ [dil] ${readingsHit}/${ai.readings.length} ${locale === 'tr' ? 'Türkçe' : ''} metinde İngilizce ad: ${list}`);
  }
}

/** Re-scan the readings saved by an earlier run — no AI calls, no cost. */
function rescan(file) {
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  for (const c of saved.cases) {
    if (!c.ai?.readings) continue;
    console.log(`\n━━ ${c.label} (kayıtlı yorumlar yeniden taranıyor)`);
    const ai = { ...c.ai, ...scanAll(c.ai.readings, saved.locale, c.ai.facts) };
    printAi(ai, saved.locale);
  }
}

// ─── Layer 5: many random charts against the independent ephemeris ─────────
function makeRng(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Random UTC instants (1901–2100) and places (±60° latitude, where Placidus
 * is defined everywhere), cast through `computeChartAtUtc` — the path the
 * solar return and electional charts use — and compared body by body.
 */
function checkBulkMath(n, seed) {
  const L = makeLayer(`5 · Toplu matematik (${n} rastgele harita, Şubat 1901–2100)`);
  const rnd = makeRng(seed);
  // Starts in February 1901 on purpose: the library's Julian-day routine is a
  // day off for March–August 1900 and January 1901, which turns the angles by
  // ~1° (planets are unaffected). Nobody alive was born then.
  const T0 = Date.UTC(1901, 1, 1);
  const T1 = Date.UTC(2100, 0, 1);
  const bodies = [...PLANETS, 'Ascendant', 'Midheaven', 'NorthNode'];
  const stat = Object.fromEntries(bodies.map((b) => [b, { max: 0, sum: 0, n: 0, fails: [] }]));
  let retroChecked = 0;
  const retroFails = [];
  let houseless = 0;
  const uncomputable = [];
  const note = (b, err, ctx, tol) => {
    const s = stat[b];
    s.max = Math.max(s.max, err);
    s.sum += err;
    s.n++;
    if (err > tol && s.fails.length < 3) s.fails.push(`${ctx} → ${(err * 60).toFixed(1)}′`);
    if (err > tol) s.failCount = (s.failCount ?? 0) + 1;
  };

  for (let i = 0; i < n; i++) {
    const ms = Math.round(T0 + rnd() * (T1 - T0));
    const lat = -60 + rnd() * 120;
    const lon = -180 + rnd() * 360;
    const ctx = `${new Date(ms).toISOString().slice(0, 16)}Z ${lat.toFixed(2)},${lon.toFixed(2)}`;
    let h;
    try {
      h = ephemeris.computeChartAtUtc(new Date(ms), lat, lon);
    } catch (e) {
      uncomputable.push(ctx);
      continue;
    }
    for (const name of PLANETS) {
      const b = h.CelestialBodies.all.find((x) => x.label === name);
      const err = Math.abs(signedDiff(b.ChartPosition.Ecliptic.DecimalDegrees - Eph.longitudeAt(name, ms)));
      note(name, err, ctx, name === 'Moon' ? TOL_MOON_DEG : TOL_PLANET_DEG);
      if (name !== 'Sun' && name !== 'Moon') {
        const speed = Eph.speedAt(name, ms);
        if (Math.abs(speed) >= STATION_SPEED) {
          retroChecked++;
          if (!!b.isRetrograde !== speed < 0 && retroFails.length < 50) retroFails.push(`${name} ${ctx}`);
        }
      }
    }
    const ref = anglesAt(ms, lat, lon);
    note('Ascendant', Math.abs(signedDiff(h.Ascendant.ChartPosition.Ecliptic.DecimalDegrees - ref.asc)), ctx, TOL_ANGLE_DEG);
    note('Midheaven', Math.abs(signedDiff(h.Midheaven.ChartPosition.Ecliptic.DecimalDegrees - ref.mc)), ctx, TOL_ANGLE_DEG);
    note(
      'NorthNode',
      Math.abs(signedDiff(h.CelestialPoints.northnode.ChartPosition.Ecliptic.DecimalDegrees - Eph.meanNorthNodeAt(ms))),
      ctx,
      TOL_NODE_DEG,
    );
    for (const p of [...h.CelestialBodies.all, ...h.CelestialPoints.all]) if (!(p.House?.id >= 1 && p.House.id <= 12)) houseless++;
  }

  for (const b of bodies) {
    const s = stat[b];
    const tol = b === 'Moon' ? TOL_MOON_DEG : b === 'NorthNode' ? TOL_NODE_DEG : ['Ascendant', 'Midheaven'].includes(b) ? TOL_ANGLE_DEG : TOL_PLANET_DEG;
    const detail = `en büyük sapma ${(s.max * 60).toFixed(2)}′ · ortalama ${((s.sum / Math.max(1, s.n)) * 60).toFixed(2)}′ (eşik ${(tol * 60).toFixed(0)}′)`;
    if (!s.failCount) L.pass(b, detail);
    else L.fail(b, `${s.failCount}/${s.n} eşik üstü · ${detail} · örn. ${s.fails.join('; ')}`);
  }
  if (!retroFails.length) L.pass('Retro bayrakları', `${retroChecked} kontrol, hepsi uyumlu (durağan anlar hariç)`);
  else L.fail('Retro bayrakları', `${retroFails.length}/${retroChecked} uyumsuz · örn. ${retroFails.slice(0, 3).join('; ')}`);
  (uncomputable.length === 0 ? L.pass : L.fail)('Hesaplanabilirlik', uncomputable.length === 0 ? `${n} haritanın hepsi hesaplandı` : `${uncomputable.length} harita hesaplanamadı · örn. ${uncomputable.slice(0, 3).join('; ')}`);
  (houseless === 0 ? L.pass : L.fail)('Ev ataması', houseless === 0 ? 'her nokta 1–12 arası bir evde' : `${houseless} nokta evsiz`);
  L.summary = Object.fromEntries(bodies.map((b) => [b, { maxArcmin: +(stat[b].max * 60).toFixed(2), meanArcmin: +((stat[b].sum / Math.max(1, stat[b].n)) * 60).toFixed(2) }]));
  return L;
}

// ─── Layer 6: time zones against the system's own tz database (ICU) ─────────
const TZ_CITIES = [
  ['İstanbul', 41.0082, 28.9784, 'Europe/Istanbul'],
  ['Ankara', 39.9334, 32.8597, 'Europe/Istanbul'],
  ['İzmir', 38.4237, 27.1428, 'Europe/Istanbul'],
  ['Antalya', 36.8969, 30.7133, 'Europe/Istanbul'],
  ['Diyarbakır', 37.9144, 40.2306, 'Europe/Istanbul'],
  ['Trabzon', 41.0027, 39.7168, 'Europe/Istanbul'],
  // North of the Green Line: KKTC followed Turkey's UTC+3 from 2016-09 to 2017-10.
  ['Lefkoşa (KKTC)', 35.1856, 33.3823, 'Asia/Famagusta'],
  ['Limasol', 34.6786, 33.0413, 'Asia/Nicosia'],
  ['Bakü', 40.4093, 49.8671, 'Asia/Baku'],
  ['Berlin', 52.52, 13.405, 'Europe/Berlin'],
  ['Amsterdam', 52.3676, 4.9041, 'Europe/Amsterdam'],
  ['Londra', 51.5074, -0.1278, 'Europe/London'],
  ['Moskova', 55.7558, 37.6173, 'Europe/Moscow'],
  ['Tahran', 35.6892, 51.389, 'Asia/Tehran'],
  ['New York', 40.7128, -74.006, 'America/New_York'],
  ['Los Angeles', 34.0522, -118.2437, 'America/Los_Angeles'],
  ['Tokyo', 35.6762, 139.6503, 'Asia/Tokyo'],
  ['Sidney', -33.8688, 151.2093, 'Australia/Sydney'],
];

const intlFormatters = new Map();
/** Offset (minutes east of UTC) of an IANA zone at an instant, from ICU. */
function zoneOffsetMin(zone, ms) {
  if (!intlFormatters.has(zone)) {
    intlFormatters.set(
      zone,
      new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }
  const p = Object.fromEntries(intlFormatters.get(zone).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

/** UTC instant of a local wall-clock time (given as UTC ms), or null near a clock change. */
function expectedUtc(zone, wallMs) {
  const a = zoneOffsetMin(zone, wallMs - 6 * 3_600_000);
  const b = zoneOffsetMin(zone, wallMs + 6 * 3_600_000);
  if (a !== b) return null; // a clock change within ±6 h: skip the ambiguous hour
  return wallMs - a * 60_000;
}

/**
 * End to end: a birth chart for a random local time (1950–2025) in each city,
 * cast through the backend's real `computeChart`, must stand on the UTC
 * instant that moment-timezone's current tz data gives for that local time.
 * The instant the chart was cast for is read back from its Moon (~0.5°/h, so
 * a one-hour zone error is ~30′ of Moon). Also counts how often the
 * ephemeris library's own bundled 2019 tz data would have been wrong.
 */
function checkTimeZones(n, seed) {
  const L = makeLayer(`6 · Saat dilimi (${n} rastgele yerel saat, 1950–2025, uçtan uca)`);
  const moment = require('moment-timezone');
  const { Origin } = require('circular-natal-horoscope-js');
  const rnd = makeRng(seed);
  const T0 = Date.UTC(1950, 0, 1);
  const T1 = Date.UTC(2025, 11, 31);
  const perCity = new Map(TZ_CITIES.map(([name]) => [name, { checked: 0, skipped: 0, wrong: [], libWrong: 0 }]));
  for (let i = 0; i < n; i++) {
    const [name, lat, lon, zone] = TZ_CITIES[i % TZ_CITIES.length];
    const wall = new Date(Math.floor((T0 + rnd() * (T1 - T0)) / 60_000) * 60_000);
    const s = perCity.get(name);
    if (expectedUtc(zone, wall.getTime()) === null) {
      s.skipped++;
      continue;
    }
    const fields = { year: wall.getUTCFullYear(), month: wall.getUTCMonth(), date: wall.getUTCDate(), hour: wall.getUTCHours(), minute: wall.getUTCMinutes() };
    const want = moment.tz(fields, zone).valueOf();
    const birthDate = wall.toISOString().slice(0, 10);
    const birthTime = wall.toISOString().slice(11, 16);
    const raw = ephemeris.computeChart({ birthDate, birthTime, latitude: lat, longitude: lon });
    const moon = raw.CelestialBodies.all.find((b) => b.label === 'Moon').ChartPosition.Ecliptic.DecimalDegrees;
    const got = Eph.birthInstantFromMoon(moon, wall.getTime());
    s.checked++;
    if (Math.abs(got - want) > 3 * 60_000) {
      s.wrong.push(`${birthDate} ${birthTime} yerel → harita UTC${fmtOffset(wall.getTime() - got)}, beklenen UTC${fmtOffset(wall.getTime() - want)}`);
    }
    const lib = Date.parse(new Origin({ ...fields, latitude: lat, longitude: lon }).utcTimeFormatted);
    if (lib !== want) s.libWrong++;
  }
  let libTotal = 0;
  let checkedTotal = 0;
  for (const [name, s] of perCity) {
    libTotal += s.libWrong;
    checkedTotal += s.checked;
    const lib = s.libWrong ? ` (kütüphanenin kendi verisiyle ${s.libWrong} tanesi yanlış olurdu)` : '';
    if (!s.wrong.length) L.pass(name, `${s.checked} tarih uyumlu${s.skipped ? `, ${s.skipped} saat değişimi anı atlandı` : ''}${lib}`);
    else L.fail(name, `${s.wrong.length}/${s.checked} tarihte farklı · örn. ${s.wrong.slice(0, 3).join('; ')}`);
  }
  L.info('Kütüphanenin gömülü 2019b verisi', `${libTotal}/${checkedTotal} tarihte bir saat (ya da daha fazla) yanlış olurdu; backend artık güncel veriyi kullanıyor`);
  return L;
}
const fmtOffset = (ms) => {
  const m = Math.round(ms / 60_000);
  return `${m >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(m) / 60)).padStart(2, '0')}:${String(Math.abs(m) % 60).padStart(2, '0')}`;
};

// ─── Report ─────────────────────────────────────────────────────────────────
const ICON = { pass: '✓', fail: '✖', border: '≈', info: 'i' };

function printLayer(L) {
  const counts = { pass: 0, fail: 0, border: 0, info: 0 };
  for (const r of L.rows) counts[r.status]++;
  console.log(`\n  ${L.name} — ${counts.pass} uyumlu, ${counts.fail} uyumsuz, ${counts.border} sınırda`);
  for (const r of L.rows) {
    if (r.status === 'pass') continue;
    console.log(`    ${ICON[r.status]} ${r.check}: ${r.detail}`);
  }
  return counts;
}

async function main() {
  if (args.rescan) {
    rescan(args.rescan);
    return;
  }
  const cases = buildCases();
  const locale = args.locale === 'en' ? 'en' : 'tr';
  const result = { ranAt: new Date().toISOString(), locale, cases: [] };
  let hardFails = 0;

  for (const [i, c] of cases.entries()) {
    console.log(`\n━━ ${c.label}`);
    console.log(`   girdi ${c.birthDate} ${c.birthTime} · ${c.latitude}, ${c.longitude} · beklenen UTC ${c.utc}`);
    const raw = ephemeris.computeChart(c);
    const natal = adapter.getNatalChart(c.birthDate, c.birthTime, c.latitude, c.longitude);
    const s = natal.summary;
    console.log(`   harita: Güneş ${s.sunSign} · Ay ${s.moonSign} · Yükselen ${s.risingSign} · ${natal.sect === 'day' ? 'gündüz' : 'gece'}`);

    const layers = [checkMath(c, raw, natal), checkInternal(c, raw, natal)];
    const { layer: transitLayer, report } = checkTransits(c);
    layers.push(transitLayer);
    for (const L of layers) hardFails += printLayer(L).fail;

    const caseOut = { ...c, summary: s, layers: layers.map((L) => ({ name: L.name, rows: L.rows })) };

    const wantAi = !args['no-ai'] && (i === 0 || args['ai-all']);
    if (wantAi) {
      console.log(`\n  3 · Yapay zeka metni (${locale}) — üretiliyor…`);
      const ai = await checkAiText(c, natal, report, locale);
      if (ai.skipped) console.log(`    ${ai.skipped}`);
      else printAi(ai, locale);
      caseOut.ai = ai;
    }
    const privacy = await checkPrivacy(c, locale);
    hardFails += printLayer(privacy).fail;
    caseOut.layers.push({ name: privacy.name, rows: privacy.rows });
    result.cases.push(caseOut);
  }

  const bulkN = Number(args.bulk);
  if (bulkN > 0) {
    console.log('\n━━ Toplu kontroller');
    const bulk = checkBulkMath(bulkN, Number(args.seed));
    hardFails += printLayer(bulk).fail;
    result.bulk = { name: bulk.name, rows: bulk.rows, summary: bulk.summary };
  }
  const tzN = Number(args.tz);
  if (tzN > 0) {
    const tz = checkTimeZones(tzN, Number(args.seed) + 1);
    hardFails += printLayer(tz).fail;
    result.timeZones = { name: tz.name, rows: tz.rows };
  }

  const outFile = args.out ?? join(tmpdir(), `astro-consistency-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`\nTam rapor (yorum metinleri dahil): ${outFile}`);
  console.log(hardFails === 0 ? '\nSONUÇ: hesap, saat dilimi ve gizlilik katmanları uyumlu.' : `\nSONUÇ: ${hardFails} uyumsuzluk var.`);
  process.exit(hardFails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
