/**
 * "Your key sky moments": which personal astrological events to surface, how
 * to rank them and when they are active.
 *
 * Pure rules. The sky itself (sampled longitudes, stations, eclipses, New/Full
 * Moons) is computed by sky-ephemeris.ts and passed in, so this file has only
 * type imports and the unit tests can load it directly.
 *
 * Research: vault `arastirma/astroloji-kilit-anlar.md` (2026-11-16).
 * - The catalog, orbs and windows follow practitioner sources (Brennan, Brady,
 *   Astrotheme, NCGR code), where they agree.
 * - The 0–100 weights are OUR product synthesis, not an astrological standard.
 *   Tests pin the ordering and the hiding rules, not the numbers.
 * - "Double retrograde" is not an established technique; it is kept as a soft,
 *   reflective note at the bottom of the ranking.
 */
import type {
  AspectWindow,
  Eclipse,
  Lunation,
  LongitudeSeries,
  SignSeason,
  SkyBody,
  Station,
} from './sky-ephemeris';

// ─── Natal input ────────────────────────────────────────────────────────────

export type NatalTarget = SkyBody | 'Ascendant' | 'Midheaven' | 'NorthNode' | 'SouthNode';

export interface NatalPoint {
  id: NatalTarget;
  longitude: number;
  retrograde: boolean;
}

export interface NatalInput {
  /** Birth instant (UTC ms), for ages ("first Saturn return"). */
  birthMs: number;
  unknownTime: boolean;
  points: NatalPoint[];
  /** Traditional ruler of the rising sign; null without a birth time. */
  chartRuler: SkyBody | null;
  /** House cusp longitudes 1–12 (index 0 = 1st house); null without a birth time. */
  cusps: number[] | null;
}

/** The subset of NatalChartData this module reads (kept structural to avoid a runtime import). */
export interface NatalChartLike {
  planets: { name: string; sign: string; degree: number; minute: number; retrograde: boolean }[];
  angles: {
    ascendant: { sign: string; degree: number; minute: number };
    midheaven: { sign: string; degree: number; minute: number };
  };
  nodes: { north: { sign: string; degree: number; minute: number } };
  houses: { house: number; sign: string; degree: number; minute: number; ruler: string }[];
}

const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
const BODY_NAMES: readonly SkyBody[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

const norm360 = (d: number) => ((d % 360) + 360) % 360;
const sep = (a: number, b: number) => {
  const d = Math.abs(norm360(a - b));
  return d > 180 ? 360 - d : d;
};

/** "Aries" 18° 07′ → 18.1167. Unknown sign names give NaN (the point is then dropped). */
export function toLongitude(p: { sign: string; degree: number; minute: number }): number {
  const i = SIGN_NAMES.indexOf(p.sign);
  return i < 0 ? NaN : i * 30 + p.degree + p.minute / 60;
}

export function natalInputFromChart(chart: NatalChartLike, birthMs: number, unknownTime: boolean): NatalInput {
  const points: NatalPoint[] = [];
  for (const p of chart.planets) {
    if (!(BODY_NAMES as readonly string[]).includes(p.name)) continue;
    points.push({ id: p.name as SkyBody, longitude: toLongitude(p), retrograde: !!p.retrograde });
  }
  const north = toLongitude(chart.nodes.north);
  points.push({ id: 'NorthNode', longitude: north, retrograde: true });
  points.push({ id: 'SouthNode', longitude: norm360(north + 180), retrograde: true });
  if (!unknownTime) {
    points.push({ id: 'Ascendant', longitude: toLongitude(chart.angles.ascendant), retrograde: false });
    points.push({ id: 'Midheaven', longitude: toLongitude(chart.angles.midheaven), retrograde: false });
  }
  const first = chart.houses.find((h) => h.house === 1);
  const ruler = !unknownTime && first && (BODY_NAMES as readonly string[]).includes(first.ruler) ? (first.ruler as SkyBody) : null;
  const cusps =
    unknownTime || chart.houses.length !== 12
      ? null
      : [...chart.houses].sort((a, b) => a.house - b.house).map((h) => toLongitude(h));
  return {
    birthMs,
    unknownTime,
    points: points.filter((p) => Number.isFinite(p.longitude)),
    chartRuler: ruler,
    cusps: cusps && cusps.every(Number.isFinite) ? cusps : null,
  };
}

/** Natal house (1–12) of a longitude, from the cusps. */
export function houseOf(longitude: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    const span = norm360(end - start);
    if (norm360(longitude - start) < span) return i + 1;
  }
  return 1;
}

// ─── Output ─────────────────────────────────────────────────────────────────

export type SkyMomentKind =
  | 'saturn_return'
  | 'jupiter_return'
  | 'nodal_return'
  | 'nodal_reversal'
  | 'outer_transit'
  | 'generational'
  | 'station_on_natal'
  | 'chart_ruler_station'
  | 'eclipse_on_natal'
  | 'lunation_on_natal'
  | 'retrograde_period'
  | 'double_retrograde';

export type AspectName = 'conjunction' | 'square' | 'opposition';

export interface SkyMoment {
  /** Deterministic: kind:planet:target:aspect:YYYY-MM-DD of the peak. */
  id: string;
  kind: SkyMomentKind;
  /** The moving body ('Sun' for a solar eclipse, 'Moon' for a lunar one / lunation). */
  planet: SkyBody | 'NorthNode';
  target: NatalTarget | null;
  aspect: AspectName | null;
  /** ISO instants. `peak` is the first exact pass, the station, the eclipse or the lunation. */
  start: string;
  peak: string;
  end: string;
  passes: string[];
  /** Tightest orb reached, degrees. */
  orb: number;
  /** 0–100, our synthesis (see header). */
  salience: number;
  /** Touches the person's own chart (false = collective weather). */
  personal: boolean;
  needsBirthTime: boolean;
  /** 'possible' when the natal Moon is involved but the birth time is unknown. */
  certainty: 'exact' | 'possible';
  /** Season/window is longer than the scanned range; start or end is approximate. */
  openEnded: boolean;
  detail: {
    stationKind?: 'retrograde' | 'direct';
    eclipseType?: string;
    lunationKind?: 'new' | 'full';
    /** Sign the event happens in (station, eclipse, lunation, season). */
    sign?: string;
    degree?: number;
    /** Natal house it falls in (birth time known only). */
    house?: number;
    /** Age at the peak, whole years (returns and life-cycle transits). */
    age?: number;
    /** 1 for the first Saturn return, 2 for the second… */
    cycle?: number;
    /** Saturn return: the sign season around the exact hit. */
    seasonStart?: string;
    seasonEnd?: string;
  };
}

// ─── Weights (synthesis; see header) ────────────────────────────────────────

export const WEIGHTS = {
  saturnReturn: 95,
  eclipseOnLightOrAngle: 90,
  slowStationOnLightOrAngle: 90,
  outerToLightOrAngle: 88, // Uranus, Neptune, Pluto
  saturnToLightOrAngle: 78,
  uranusOpposition: 75,
  eclipseOnNodeOrRuler: 75,
  plutoSquare: 72,
  chartRulerStation: 72,
  innerStationOnPersonal: 70, // Venus, Mars
  neptuneSquare: 68,
  saturnCycle: 68, // Saturn square/opposition to natal Saturn
  slowStationOnOther: 60,
  mercuryStationOnPersonal: 55,
  eclipseOnOther: 55,
  nodalReturn: 55,
  jupiterReturn: 50,
  jupiterToLightOrAngle: 50,
  nodalReversal: 45,
  lunationOnLightOrAngle: 38,
  mercuryRetroInHouse: 30,
  collectiveRetro: 15,
  doubleRetro: 15,
} as const;

/** Bonuses (synthesis): a station or ≥3 exact passes; another big moment at the same time. */
const MULTI_PASS_BONUS = 10;
const CLUSTER_BONUS = 5;
const CLUSTER_MIN = 70;

const DAY = 86_400_000;
const LIGHTS_AND_ANGLES: readonly NatalTarget[] = ['Sun', 'Moon', 'Ascendant', 'Midheaven'];
const PERSONAL: readonly NatalTarget[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];
const SLOW: readonly SkyBody[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const ANGLES: readonly NatalTarget[] = ['Ascendant', 'Midheaven'];
const DOUBLE_RETRO_BODIES: readonly SkyBody[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
/** A natal-Moon contact without a birth time (Moon ±~7°) ranks lower and gets no bonus. */
const POSSIBLE_FACTOR = 0.7;

/** Tie-break when salience is equal: the research's headline moments first. */
const KIND_PRIORITY: Record<SkyMomentKind, number> = {
  saturn_return: 12,
  eclipse_on_natal: 11,
  station_on_natal: 10,
  outer_transit: 9,
  generational: 8,
  chart_ruler_station: 7,
  nodal_return: 6,
  jupiter_return: 5,
  nodal_reversal: 4,
  lunation_on_natal: 3,
  retrograde_period: 2,
  double_retrograde: 1,
};

// ─── Sky input ──────────────────────────────────────────────────────────────

/** Precomputed, person-independent sky over the scan range. */
export interface SkyData {
  /** Daily longitude series for Jupiter…Pluto over [scanStart, scanEnd]. */
  series: Partial<Record<SkyBody, LongitudeSeries>>;
  /** Mean north node, daily. */
  node: LongitudeSeries;
  stations: Station[];
  eclipses: Eclipse[];
  lunations: Lunation[];
}

/** The pure helpers from sky-ephemeris.ts, injected so this file stays type-only. */
export interface SkyOps {
  aspectWindows: (series: LongitudeSeries, point: number, angle: number, orb: number, mergeGapMs?: number) => AspectWindow[];
  signSeasons: (series: LongitudeSeries, signIndex: number, mergeGapMs?: number) => SignSeason[];
}

export interface MomentQuery {
  fromMs: number;
  toMs: number;
}

// ─── Detection ──────────────────────────────────────────────────────────────

const iso = (ms: number) => new Date(ms).toISOString();
const day = (ms: number) => iso(ms).slice(0, 10);
const signOf = (lon: number) => SIGN_NAMES[Math.floor(norm360(lon) / 30)];
const degreeOf = (lon: number) => Math.round((norm360(lon) % 30) * 100) / 100;
const ageAt = (birthMs: number, ms: number) => Math.floor((ms - birthMs) / (365.2425 * DAY));
const overlaps = (s: number, e: number, q: MomentQuery) => e >= q.fromMs && s <= q.toMs;

function make(
  m: Omit<SkyMoment, 'id' | 'start' | 'peak' | 'end' | 'passes'> & { startMs: number; peakMs: number; endMs: number; passMs: number[] },
): SkyMoment {
  const { startMs, peakMs, endMs, passMs, ...rest } = m;
  return {
    id: [rest.kind, rest.planet, rest.target ?? '', rest.aspect ?? '', day(peakMs)].join(':'),
    start: iso(startMs),
    peak: iso(peakMs),
    end: iso(endMs),
    passes: passMs.map(iso),
    ...rest,
    orb: Math.round(rest.orb * 100) / 100,
  };
}

const ASPECTS: { name: AspectName; angle: number }[] = [
  { name: 'conjunction', angle: 0 },
  { name: 'square', angle: 90 },
  { name: 'opposition', angle: 180 },
];

/** Window → moment fields shared by transit-type detectors. */
function fromWindow(w: AspectWindow) {
  const peakMs = w.passes.length ? w.passes[0] : (w.startMs + w.endMs) / 2;
  return { startMs: w.startMs, endMs: w.endMs, peakMs, passMs: w.passes, orb: w.minOrb, openEnded: w.clipped };
}

function multiPass(base: number, passes: number) {
  return passes >= 3 ? base + MULTI_PASS_BONUS : base;
}

/** Saturn, Jupiter returns; Saturn's own cycle; the mid-life outer cycles; nodal return. */
function lifeCycles(natal: NatalInput, sky: SkyData, ops: SkyOps, q: MomentQuery): SkyMoment[] {
  const out: SkyMoment[] = [];
  const at = (id: NatalTarget) => natal.points.find((p) => p.id === id);
  const YEAR = 365 * DAY;

  const saturn = at('Saturn');
  const satSeries = sky.series.Saturn;
  if (saturn && satSeries) {
    const seasons = ops.signSeasons(satSeries, Math.floor(saturn.longitude / 30), 2 * YEAR);
    const hits = ops.aspectWindows(satSeries, saturn.longitude, 0, 1, YEAR);
    for (const s of seasons) {
      const inSeason = hits.filter((h) => h.startMs <= s.endMs + DAY && h.endMs >= s.startMs - DAY);
      const passes = inSeason.flatMap((h) => h.passes).sort((a, b) => a - b);
      const peakMs = passes[0] ?? inSeason[0]?.startMs ?? (s.startMs + s.endMs) / 2;
      if (!overlaps(s.startMs, s.endMs, q)) continue;
      const age = ageAt(natal.birthMs, peakMs);
      if (age < 20) continue; // the "return" is the ~29.5-year cycle, not the birth season itself
      out.push(
        make({
          kind: 'saturn_return',
          planet: 'Saturn',
          target: 'Saturn',
          aspect: 'conjunction',
          startMs: s.startMs,
          peakMs,
          endMs: s.endMs,
          passMs: passes,
          orb: Math.min(1, ...inSeason.map((h) => h.minOrb)),
          salience: WEIGHTS.saturnReturn,
          personal: true,
          needsBirthTime: false,
          certainty: 'exact',
          openEnded: s.clipped,
          detail: {
            sign: signOf(saturn.longitude),
            age,
            cycle: Math.max(1, Math.round(age / 29.5)),
            seasonStart: iso(s.startMs),
            seasonEnd: iso(s.endMs),
          },
        }),
      );
    }
    // Saturn's squares and opposition to itself (~7, 14, 21, 36, 44, 51).
    for (const a of ASPECTS.filter((x) => x.angle !== 0)) {
      for (const w of ops.aspectWindows(satSeries, saturn.longitude, a.angle, 1.5, YEAR)) {
        const f = fromWindow(w);
        if (!overlaps(f.startMs, f.endMs, q)) continue;
        out.push(
          make({
            kind: 'generational', planet: 'Saturn', target: 'Saturn', aspect: a.name, ...f,
            salience: multiPass(WEIGHTS.saturnCycle, f.passMs.length),
            personal: true, needsBirthTime: false, certainty: 'exact',
            detail: { age: ageAt(natal.birthMs, f.peakMs) },
          }),
        );
      }
    }
  }

  const jupiter = at('Jupiter');
  if (jupiter && sky.series.Jupiter) {
    for (const w of ops.aspectWindows(sky.series.Jupiter, jupiter.longitude, 0, 2, 200 * DAY)) {
      const f = fromWindow(w);
      if (!overlaps(f.startMs, f.endMs, q) || ageAt(natal.birthMs, f.peakMs) < 10) continue;
      out.push(
        make({
          kind: 'jupiter_return', planet: 'Jupiter', target: 'Jupiter', aspect: 'conjunction', ...f,
          salience: WEIGHTS.jupiterReturn, personal: true, needsBirthTime: false, certainty: 'exact',
          detail: { age: ageAt(natal.birthMs, f.peakMs), sign: signOf(jupiter.longitude) },
        }),
      );
    }
  }

  // The mid-life cluster: each outer planet to its own natal place.
  const cycles: { body: SkyBody; aspect: AspectName; angle: number; weight: number }[] = [
    { body: 'Uranus', aspect: 'opposition', angle: 180, weight: WEIGHTS.uranusOpposition },
    { body: 'Neptune', aspect: 'square', angle: 90, weight: WEIGHTS.neptuneSquare },
    { body: 'Pluto', aspect: 'square', angle: 90, weight: WEIGHTS.plutoSquare },
  ];
  for (const c of cycles) {
    const natalPos = at(c.body);
    const series = sky.series[c.body];
    if (!natalPos || !series) continue;
    for (const w of ops.aspectWindows(series, natalPos.longitude, c.angle, 1.5, 2 * YEAR)) {
      const f = fromWindow(w);
      if (!overlaps(f.startMs, f.endMs, q)) continue;
      out.push(
        make({
          kind: 'generational', planet: c.body, target: c.body, aspect: c.aspect, ...f,
          salience: c.weight, personal: true, needsBirthTime: false, certainty: 'exact',
          detail: { age: ageAt(natal.birthMs, f.peakMs) },
        }),
      );
    }
  }

  // Nodal return (mean node back on the natal north node) and reversal (on the south node).
  const north = at('NorthNode');
  if (north) {
    for (const [kind, point, weight] of [
      ['nodal_return', north.longitude, WEIGHTS.nodalReturn],
      ['nodal_reversal', norm360(north.longitude + 180), WEIGHTS.nodalReversal],
    ] as const) {
      for (const w of ops.aspectWindows(sky.node, point, 0, 1, 60 * DAY)) {
        const f = fromWindow(w);
        if (!overlaps(f.startMs, f.endMs, q) || ageAt(natal.birthMs, f.peakMs) < 5) continue;
        out.push(
          make({
            kind, planet: 'NorthNode', target: kind === 'nodal_return' ? 'NorthNode' : 'SouthNode', aspect: 'conjunction', ...f,
            salience: weight, personal: true, needsBirthTime: false, certainty: 'exact',
            detail: { age: ageAt(natal.birthMs, f.peakMs) },
          }),
        );
      }
    }
  }
  return out;
}

/** Saturn…Pluto (and Jupiter's conjunctions) to the lights, the angles and Saturn to the chart ruler. */
function slowTransits(natal: NatalInput, sky: SkyData, ops: SkyOps, q: MomentQuery): SkyMoment[] {
  const out: SkyMoment[] = [];
  const YEAR = 365 * DAY;
  const targets = natal.points.filter((p) => LIGHTS_AND_ANGLES.includes(p.id));
  const plan: { body: SkyBody; aspects: AspectName[]; weight: number; extra?: NatalTarget[] }[] = [
    { body: 'Jupiter', aspects: ['conjunction'], weight: WEIGHTS.jupiterToLightOrAngle },
    { body: 'Saturn', aspects: ['conjunction', 'square', 'opposition'], weight: WEIGHTS.saturnToLightOrAngle },
    { body: 'Uranus', aspects: ['conjunction', 'square', 'opposition'], weight: WEIGHTS.outerToLightOrAngle },
    { body: 'Neptune', aspects: ['conjunction', 'square', 'opposition'], weight: WEIGHTS.outerToLightOrAngle },
    { body: 'Pluto', aspects: ['conjunction', 'square', 'opposition'], weight: WEIGHTS.outerToLightOrAngle },
  ];
  for (const p of plan) {
    const series = sky.series[p.body];
    if (!series) continue;
    const pts = [...targets];
    // Saturn to the chart ruler counts too (birth time required).
    if (p.body === 'Saturn' && natal.chartRuler && natal.chartRuler !== 'Saturn') {
      const r = natal.points.find((x) => x.id === natal.chartRuler);
      if (r && !pts.includes(r)) pts.push(r);
    }
    for (const t of pts) {
      // Jupiter is skipped on the Moon: a 12-year cycle hit is minor next to the others.
      if (p.body === 'Jupiter' && t.id === 'Moon') continue;
      for (const name of p.aspects) {
        const angle = ASPECTS.find((a) => a.name === name)!.angle;
        for (const w of ops.aspectWindows(series, t.longitude, angle, 2, YEAR)) {
          const f = fromWindow(w);
          if (!overlaps(f.startMs, f.endMs, q)) continue;
          const possible = natal.unknownTime && t.id === 'Moon';
          out.push(
            make({
              kind: 'outer_transit', planet: p.body, target: t.id, aspect: name, ...f,
              passMs: possible ? [] : f.passMs,
              salience: possible ? p.weight : multiPass(p.weight, f.passMs.length),
              personal: true,
              needsBirthTime: ANGLES.includes(t.id) || t.id === natal.chartRuler,
              certainty: possible ? 'possible' : 'exact',
              detail: {},
            }),
          );
        }
      }
    }
  }
  return out;
}

/** A station within 1° (slow planets 0.5°) of a natal point; the chart ruler's own stations. */
function stations(natal: NatalInput, sky: SkyData, q: MomentQuery): SkyMoment[] {
  const out: SkyMoment[] = [];
  for (const s of sky.stations) {
    const slow = SLOW.includes(s.body);
    const halfWindow = (s.body === 'Mercury' ? 3 : s.body === 'Venus' || s.body === 'Mars' ? 7 : 21) * DAY;
    const startMs = s.ms - halfWindow;
    const endMs = s.ms + halfWindow;
    if (!overlaps(startMs, endMs, q)) continue;
    const orbMax = slow ? 0.5 : 1;
    const base = {
      planet: s.body, startMs, peakMs: s.ms, endMs, passMs: [s.ms], openEnded: false,
      detail: {
        stationKind: s.kind,
        sign: signOf(s.longitude),
        degree: degreeOf(s.longitude),
        ...(natal.cusps ? { house: houseOf(s.longitude, natal.cusps) } : {}),
      },
    };
    for (const t of natal.points) {
      if (t.id === 'NorthNode' || t.id === 'SouthNode') continue;
      const orb = sep(s.longitude, t.longitude);
      if (orb > orbMax) continue;
      let weight: number;
      if (slow) weight = LIGHTS_AND_ANGLES.includes(t.id) ? WEIGHTS.slowStationOnLightOrAngle : WEIGHTS.slowStationOnOther;
      else if (s.body === 'Mercury') {
        if (!PERSONAL.includes(t.id) && !ANGLES.includes(t.id)) continue;
        weight = WEIGHTS.mercuryStationOnPersonal;
      } else {
        if (!PERSONAL.includes(t.id) && !ANGLES.includes(t.id)) continue;
        weight = WEIGHTS.innerStationOnPersonal;
      }
      const possible = natal.unknownTime && t.id === 'Moon';
      out.push(
        make({
          kind: 'station_on_natal', target: t.id, aspect: 'conjunction', orb, ...base,
          salience: weight, personal: true,
          needsBirthTime: ANGLES.includes(t.id),
          certainty: possible ? 'possible' : 'exact',
        }),
      );
    }
    if (natal.chartRuler === s.body) {
      out.push(
        make({
          kind: 'chart_ruler_station', target: 'Ascendant', aspect: null, orb: 0, ...base,
          salience: WEIGHTS.chartRulerStation, personal: true, needsBirthTime: true, certainty: 'exact',
        }),
      );
    }
  }
  return out;
}

/** An eclipse within 3° of a natal point; active from a month before to six months after. */
function eclipses(natal: NatalInput, sky: SkyData, q: MomentQuery): SkyMoment[] {
  const out: SkyMoment[] = [];
  for (const e of sky.eclipses) {
    const startMs = e.ms - 30 * DAY;
    const endMs = e.ms + 183 * DAY;
    if (!overlaps(startMs, endMs, q)) continue;
    // A lunar eclipse is a Sun–Moon opposition: both ends of the axis can touch the chart.
    const degrees = e.kind === 'lunar' ? [e.longitude, norm360(e.longitude + 180)] : [e.longitude];
    for (const t of natal.points) {
      const orb = Math.min(...degrees.map((d) => sep(d, t.longitude)));
      if (orb > 3) continue;
      const isNodeOrRuler = t.id === 'NorthNode' || t.id === 'SouthNode' || t.id === natal.chartRuler;
      let weight: number = LIGHTS_AND_ANGLES.includes(t.id)
        ? WEIGHTS.eclipseOnLightOrAngle
        : isNodeOrRuler
          ? WEIGHTS.eclipseOnNodeOrRuler
          : WEIGHTS.eclipseOnOther;
      if (orb <= 1.5) weight += 5; // a "direct hit"
      const possible = natal.unknownTime && t.id === 'Moon';
      out.push(
        make({
          kind: 'eclipse_on_natal', planet: e.kind === 'solar' ? 'Sun' : 'Moon', target: t.id, aspect: null,
          startMs, peakMs: e.ms, endMs, passMs: [e.ms], orb, openEnded: false,
          salience: weight, personal: true,
          needsBirthTime: ANGLES.includes(t.id) || t.id === natal.chartRuler,
          certainty: possible ? 'possible' : 'exact',
          detail: {
            eclipseType: e.type,
            sign: signOf(e.longitude),
            degree: degreeOf(e.longitude),
            ...(natal.cusps ? { house: houseOf(e.longitude, natal.cusps) } : {}),
          },
        }),
      );
    }
  }
  return out;
}

/** New/Full Moons within 3° of the lights, the angles or the chart ruler (eclipses excluded). */
function lunations(natal: NatalInput, sky: SkyData, q: MomentQuery): SkyMoment[] {
  const out: SkyMoment[] = [];
  const targets = natal.points.filter((p) => LIGHTS_AND_ANGLES.includes(p.id) || p.id === natal.chartRuler);
  for (const l of sky.lunations) {
    if (sky.eclipses.some((e) => Math.abs(e.syzygyMs - l.ms) < DAY)) continue;
    const startMs = l.ms - 3 * DAY;
    const endMs = l.ms + 3 * DAY;
    if (!overlaps(startMs, endMs, q)) continue;
    for (const t of targets) {
      const orb = sep(l.longitude, t.longitude);
      if (orb > 3) continue;
      const possible = natal.unknownTime && t.id === 'Moon';
      out.push(
        make({
          kind: 'lunation_on_natal', planet: 'Moon', target: t.id, aspect: 'conjunction',
          startMs, peakMs: l.ms, endMs, passMs: [l.ms], orb, openEnded: false,
          salience: WEIGHTS.lunationOnLightOrAngle, personal: true,
          needsBirthTime: ANGLES.includes(t.id) || t.id === natal.chartRuler,
          certainty: possible ? 'possible' : 'exact',
          detail: {
            lunationKind: l.kind,
            sign: signOf(l.longitude),
            degree: degreeOf(l.longitude),
            ...(natal.cusps ? { house: houseOf(l.longitude, natal.cusps) } : {}),
          },
        }),
      );
    }
  }
  return out;
}

/** Retrograde periods from paired stations: Mercury/Venus/Mars as weather; any natal-retro planet as the soft "double retrograde" note. */
function retrogrades(natal: NatalInput, sky: SkyData, q: MomentQuery): SkyMoment[] {
  const out: SkyMoment[] = [];
  const bySky = new Map<SkyBody, Station[]>();
  for (const s of sky.stations) bySky.set(s.body, [...(bySky.get(s.body) ?? []), s]);
  for (const [body, list] of bySky) {
    for (let i = 0; i < list.length; i++) {
      const sr = list[i];
      if (sr.kind !== 'retrograde') continue;
      const sd = list.slice(i + 1).find((x) => x.kind === 'direct');
      if (!sd || !overlaps(sr.ms, sd.ms, q)) continue;
      const house = natal.cusps ? houseOf(sr.longitude, natal.cusps) : undefined;
      const detail = { sign: signOf(sr.longitude), degree: degreeOf(sr.longitude), ...(house ? { house } : {}) };
      if (body === 'Mercury' || body === 'Venus' || body === 'Mars') {
        out.push(
          make({
            kind: 'retrograde_period', planet: body, target: null, aspect: null,
            startMs: sr.ms, peakMs: sr.ms, endMs: sd.ms, passMs: [sr.ms, sd.ms], orb: 0, openEnded: false,
            salience: house ? WEIGHTS.mercuryRetroInHouse : WEIGHTS.collectiveRetro,
            personal: !!house, needsBirthTime: false, certainty: 'exact', detail,
          }),
        );
      }
      // Uranus–Pluto are retrograde ~5 months every year and in ~40% of charts:
      // a "double retrograde" there is background, not a moment.
      const natalPos = natal.points.find((p) => p.id === body);
      if (natalPos?.retrograde && DOUBLE_RETRO_BODIES.includes(body)) {
        out.push(
          make({
            kind: 'double_retrograde', planet: body, target: body, aspect: null,
            startMs: sr.ms, peakMs: sr.ms, endMs: sd.ms, passMs: [sr.ms, sd.ms], orb: 0, openEnded: false,
            salience: WEIGHTS.doubleRetro, personal: true, needsBirthTime: false, certainty: 'exact', detail,
          }),
        );
      }
    }
  }
  return out;
}

/**
 * All moments for one person whose active window overlaps the query, ranked:
 * highest salience first, then the soonest peak. Birth-time-only moments are
 * dropped (not down-weighted) when the birth time is unknown.
 */
export function detectMoments(natal: NatalInput, sky: SkyData, ops: SkyOps, q: MomentQuery): SkyMoment[] {
  const all = [
    ...lifeCycles(natal, sky, ops, q),
    ...slowTransits(natal, sky, ops, q),
    ...stations(natal, sky, q),
    ...eclipses(natal, sky, q),
    ...lunations(natal, sky, q),
    ...retrogrades(natal, sky, q),
  ].filter((m) => !(natal.unknownTime && m.needsBirthTime));

  // One moment per id (two detectors can meet on the same event).
  const unique = new Map<string, SkyMoment>();
  for (const m of all) {
    const prev = unique.get(m.id);
    if (!prev || m.salience > prev.salience) unique.set(m.id, m);
  }
  const moments = [...unique.values()].map((m) =>
    m.certainty === 'possible' ? { ...m, salience: Math.round(m.salience * POSSIBLE_FACTOR) } : m,
  );
  return rankMoments(applyClusterBonus(moments));
}

/** +5 when another big (≥70), certain moment is active at the same time. */
export function applyClusterBonus(moments: SkyMoment[]): SkyMoment[] {
  const big = (m: SkyMoment) => m.certainty === 'exact' && m.salience >= CLUSTER_MIN;
  return moments.map((m) => {
    const together = big(m) && moments.some((o) => o.id !== m.id && big(o) && o.start <= m.end && o.end >= m.start);
    return together ? { ...m, salience: Math.min(100, m.salience + CLUSTER_BONUS) } : m;
  });
}

export function rankMoments(moments: SkyMoment[]): SkyMoment[] {
  return [...moments].sort(
    (a, b) =>
      b.salience - a.salience || KIND_PRIORITY[b.kind] - KIND_PRIORITY[a.kind] || a.peak.localeCompare(b.peak),
  );
}

// ─── Prompt lines (daily insight) ───────────────────────────────────────────

/** Moments must clear this bar to be mentioned in the daily insight. */
const PROMPT_MIN_SALIENCE = 50;

const targetLabel = (t: NatalTarget | null) =>
  t === 'NorthNode' ? 'North Node' : t === 'SouthNode' ? 'South Node' : (t ?? '');

/** One short, factual English line for the model (the prompt itself is localized). */
export function momentPromptLine(m: SkyMoment, nowMs: number): string {
  const d = (iso: string) => iso.slice(0, 10);
  const next = m.passes.find((p) => Date.parse(p) >= nowMs);
  const exact = next ? `exact ${d(next)}` : m.passes.length ? `exact was ${d(m.passes[m.passes.length - 1])}` : '';
  const target = targetLabel(m.target);
  switch (m.kind) {
    case 'saturn_return':
      return `Saturn return season: Saturn is back in its birth sign ${m.detail.sign ?? ''}${exact ? `, ${exact}` : ''} (a ~29-year life cycle)`;
    case 'jupiter_return':
      return `Jupiter return${exact ? `, ${exact}` : ''} (12-year growth cycle)`;
    case 'nodal_return':
      return `Nodal return${exact ? `, ${exact}` : ''} (~18.6-year direction cycle)`;
    case 'nodal_reversal':
      return `Nodal reversal${exact ? `, ${exact}` : ''}`;
    case 'outer_transit':
      return `Transiting ${m.planet} ${m.aspect} natal ${target}, a months-long transit${exact ? `, ${exact}` : ''}`;
    case 'generational':
      return `${m.planet} ${m.aspect} its natal position, a life-cycle transit at age ${m.detail.age ?? '?'}${exact ? `, ${exact}` : ''}`;
    case 'station_on_natal':
      return `${m.planet} stations ${m.detail.stationKind ?? ''} on natal ${target} (${d(m.peak)})`;
    case 'chart_ruler_station':
      return `Chart ruler ${m.planet} stations ${m.detail.stationKind ?? ''} (${d(m.peak)})`;
    case 'eclipse_on_natal':
      return `${m.detail.eclipseType ?? ''} ${m.planet === 'Sun' ? 'solar' : 'lunar'} eclipse on natal ${target} (${d(m.peak)}; opens a ~6-month chapter)`.trim();
    case 'lunation_on_natal':
      return `${m.detail.lunationKind === 'full' ? 'Full' : 'New'} Moon on natal ${target} (${d(m.peak)})`;
    case 'retrograde_period':
      return `${m.planet} retrograde ${d(m.start)} to ${d(m.end)}${m.detail.house ? ` in the natal ${m.detail.house}th house` : ''}`;
    case 'double_retrograde':
      return `${m.planet} is retrograde now and was retrograde at birth (a soft, reflective note, not a classic technique)`;
  }
}

/**
 * The few moments worth a sentence in today's insight: active today, certain,
 * above the bar, best first, at most `max`. The soft double-retrograde note
 * only fills a slot nothing bigger needs.
 */
export function promptMomentLines(moments: SkyMoment[], nowMs: number, max = 2): string[] {
  const active = moments.filter(
    (m) => m.certainty === 'exact' && Date.parse(m.start) <= nowMs && Date.parse(m.end) >= nowMs,
  );
  const strong = rankMoments(active.filter((m) => m.salience >= PROMPT_MIN_SALIENCE));
  const soft = active.filter((m) => m.kind === 'double_retrograde');
  return [...strong, ...soft].slice(0, max).map((m) => momentPromptLine(m, nowMs));
}

/** Where a moment stands relative to now. */
export function momentStatus(m: SkyMoment, nowMs: number): 'upcoming' | 'active' | 'past' {
  if (nowMs < Date.parse(m.start)) return 'upcoming';
  if (nowMs > Date.parse(m.end)) return 'past';
  return 'active';
}
