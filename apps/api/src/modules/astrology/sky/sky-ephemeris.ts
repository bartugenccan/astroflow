/**
 * Time-search astronomy for the "key sky moments" engine, on astronomy-engine
 * (MIT, pure JS, VSOP87/NOVAS, ±1′ claimed; ≤10″ against JPL in our checks).
 *
 * circular-natal-horoscope-js stays the source for natal charts, houses and
 * angles. This module only answers *when* questions: stations, exact passes
 * of a transiting planet over a degree, New/Full Moons and eclipses.
 *
 * Longitudes are geocentric, apparent (aberration on), tropical ecliptic of
 * date, in degrees [0, 360). Times are JS epoch milliseconds (UTC).
 *
 * Self-contained on purpose: no relative runtime imports, so the unit tests
 * (node --experimental-strip-types) can load it directly.
 */
import * as Astronomy from 'astronomy-engine';

export type SkyBody =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto';

/** Planets that can station (the Sun and Moon never go retrograde). */
export const STATIONING_BODIES = [
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const satisfies readonly SkyBody[];

const DAY_MS = 86_400_000;

/** Wrap to [0, 360). */
export const norm360 = (d: number): number => ((d % 360) + 360) % 360;
/** Wrap to (-180, 180]: the signed shortest step from b to a is `signedDiff(a - b)`. */
export const signedDiff = (d: number): number => {
  const x = norm360(d + 180) - 180;
  return x === -180 ? 180 : x;
};

const toTime = (ms: number) => Astronomy.MakeTime(new Date(ms));
const fromTime = (t: Astronomy.AstroTime) => t.date.getTime();

/** Apparent geocentric ecliptic longitude of a body at an instant. */
export function longitudeAt(body: SkyBody, ms: number): number {
  const vec = Astronomy.GeoVector(body as Astronomy.Body, new Date(ms), true);
  return norm360(Astronomy.Ecliptic(vec).elon);
}

/** Longitudinal speed in degrees/day (negative = retrograde), central difference. */
export function speedAt(body: SkyBody, ms: number): number {
  const h = body === 'Moon' ? 0.02 : 0.25; // days
  const a = longitudeAt(body, ms - h * DAY_MS);
  const b = longitudeAt(body, ms + h * DAY_MS);
  return signedDiff(b - a) / (2 * h);
}

/**
 * Root of a smooth function between two instants that bracket a sign change.
 * Handles both directions (astronomy-engine's Search only finds ascending
 * crossings) and stops at one-minute precision.
 */
function rootBetween(f: (ms: number) => number, t1: number, t2: number): number | null {
  const f1 = f(t1);
  const f2 = f(t2);
  if (f1 === 0) return t1;
  if (f2 === 0) return t2;
  if (Math.sign(f1) === Math.sign(f2)) return null;
  const g = f1 < 0 ? f : (ms: number) => -f(ms);
  const hit = Astronomy.Search((t) => g(fromTime(t)), toTime(t1), toTime(t2), {
    dt_tolerance_seconds: 60,
  });
  return hit ? fromTime(hit) : null;
}

export interface Station {
  body: SkyBody;
  /** retrograde = the planet stops and turns backwards; direct = it resumes. */
  kind: 'retrograde' | 'direct';
  ms: number;
  longitude: number;
}

/**
 * Every station of the given planets in [fromMs, toMs]. Scans the speed daily
 * (the shortest retrograde, Mercury's, lasts ~3 weeks) and refines each sign
 * change to the minute.
 */
export function findStations(
  fromMs: number,
  toMs: number,
  bodies: readonly SkyBody[] = STATIONING_BODIES,
): Station[] {
  const out: Station[] = [];
  for (const body of bodies) {
    const speed = (ms: number) => speedAt(body, ms);
    let prevMs = fromMs;
    let prev = speed(prevMs);
    for (let ms = fromMs + DAY_MS; ms <= toMs + DAY_MS; ms += DAY_MS) {
      const cur = speed(ms);
      if (prev !== 0 && Math.sign(prev) !== Math.sign(cur)) {
        const at = rootBetween(speed, prevMs, ms);
        if (at !== null && at >= fromMs && at <= toMs) {
          out.push({
            body,
            kind: prev > 0 ? 'retrograde' : 'direct',
            ms: at,
            longitude: longitudeAt(body, at),
          });
        }
      }
      prevMs = ms;
      prev = cur;
    }
  }
  return out.sort((a, b) => a.ms - b.ms);
}

/** True when the planet is moving backwards at that instant. */
export const isRetrogradeAt = (body: SkyBody, ms: number): boolean => speedAt(body, ms) < 0;

export interface Lunation {
  kind: 'new' | 'full';
  ms: number;
  /** The Moon's longitude at the exact syzygy (the degree astrologers use). */
  longitude: number;
}

/** Every New and Full Moon in [fromMs, toMs]. */
export function findLunations(fromMs: number, toMs: number): Lunation[] {
  const out: Lunation[] = [];
  for (const [kind, phase] of [
    ['new', 0],
    ['full', 180],
  ] as const) {
    let start = fromMs;
    while (start <= toMs) {
      const t = Astronomy.SearchMoonPhase(phase, new Date(start), 40);
      if (!t) break;
      const ms = fromTime(t);
      if (ms > toMs) break;
      out.push({ kind, ms, longitude: longitudeAt('Moon', ms) });
      start = ms + DAY_MS;
    }
  }
  return out.sort((a, b) => a.ms - b.ms);
}

export interface Eclipse {
  kind: 'solar' | 'lunar';
  /** penumbral | partial | annular | total */
  type: string;
  /** Peak of the eclipse. */
  ms: number;
  /** Time of the exact New/Full Moon nearest the peak (differs by minutes). */
  syzygyMs: number;
  /**
   * The eclipse degree: for a solar eclipse the Sun/Moon conjunction degree,
   * for a lunar eclipse the Moon's degree at the Full Moon. Taken at the
   * syzygy, not the peak, as astrologers do.
   */
  longitude: number;
}

function syzygyNear(peakMs: number, phase: 0 | 180): number {
  const t = Astronomy.SearchMoonPhase(phase, new Date(peakMs - 2 * DAY_MS), 4);
  return t ? fromTime(t) : peakMs;
}

/** Every solar and lunar eclipse whose peak falls in [fromMs, toMs]. */
export function findEclipses(fromMs: number, toMs: number): Eclipse[] {
  const out: Eclipse[] = [];
  for (let e = Astronomy.SearchLunarEclipse(new Date(fromMs)); fromTime(e.peak) <= toMs; e = Astronomy.NextLunarEclipse(e.peak)) {
    const peak = fromTime(e.peak);
    const syzygyMs = syzygyNear(peak, 180);
    out.push({ kind: 'lunar', type: e.kind, ms: peak, syzygyMs, longitude: longitudeAt('Moon', syzygyMs) });
  }
  for (let e = Astronomy.SearchGlobalSolarEclipse(new Date(fromMs)); fromTime(e.peak) <= toMs; e = Astronomy.NextGlobalSolarEclipse(e.peak)) {
    const peak = fromTime(e.peak);
    const syzygyMs = syzygyNear(peak, 0);
    out.push({ kind: 'solar', type: e.kind, ms: peak, syzygyMs, longitude: longitudeAt('Sun', syzygyMs) });
  }
  return out.filter((e) => e.ms >= fromMs).sort((a, b) => a.ms - b.ms);
}

/** A sampled longitude series, computed once and shared by every detector. */
export interface LongitudeSeries {
  /** Exact longitude at any instant (used to refine passes to the minute). */
  fn: (ms: number) => number;
  startMs: number;
  stepMs: number;
  lon: Float64Array;
}

export function sampleFunction(fn: (ms: number) => number, fromMs: number, toMs: number, stepMs = DAY_MS): LongitudeSeries {
  const n = Math.max(2, Math.floor((toMs - fromMs) / stepMs) + 1);
  const lon = new Float64Array(n);
  for (let i = 0; i < n; i++) lon[i] = fn(fromMs + i * stepMs);
  return { fn, startMs: fromMs, stepMs, lon };
}

export const sampleLongitudes = (body: SkyBody, fromMs: number, toMs: number, stepMs = DAY_MS): LongitudeSeries =>
  sampleFunction((ms) => longitudeAt(body, ms), fromMs, toMs, stepMs);

export interface AspectWindow {
  /** The exact longitude the transiting body has to reach (point ± angle). */
  target: number;
  /** First instant (to the sampling step) the body is within `orb` of the target. */
  startMs: number;
  /** Last instant it is within `orb`. */
  endMs: number;
  /** Exact hits, to the minute. Empty when the body came within orb but turned back. */
  passes: number[];
  /** Tightest separation from the exact aspect inside the window, degrees. */
  minOrb: number;
  /** True when the window touches the edge of the sampled range (its real start/end lies outside). */
  clipped: boolean;
}

/**
 * Windows where the sampled body is within `orb` degrees of making `angle`
 * (0, 90, 180…) to the fixed longitude `point`. Both sides of a square count
 * (point ± angle).
 *
 * - Exact crossings are found on the whole series, independently of the orb
 *   test, so a fast body that jumps over a narrow orb between two samples is
 *   still caught (its window is then the pass itself).
 * - A retrograde loop can carry a slow planet out of orb between passes; any
 *   windows on the same target closer than `mergeGapMs` are merged into one
 *   moment with several passes.
 */
export function aspectWindows(
  series: LongitudeSeries,
  point: number,
  angle: number,
  orb: number,
  mergeGapMs = 0,
): AspectWindow[] {
  const n = series.lon.length;
  const lastMs = series.startMs + (n - 1) * series.stepMs;
  const targets = angle === 0 || angle === 180 ? [norm360(point + angle)] : [norm360(point + angle), norm360(point - angle)];
  const windows: AspectWindow[] = [];

  for (const target of targets) {
    const d = (i: number) => signedDiff(series.lon[i] - target);
    const exact = (t: number) => signedDiff(series.fn(t) - target);
    const found: AspectWindow[] = [];

    // 1. Orb intervals on the samples.
    let open: AspectWindow | null = null;
    for (let i = 0; i < n; i++) {
      const di = Math.abs(d(i));
      const ms = series.startMs + i * series.stepMs;
      if (di <= orb) {
        if (!open) open = { target, startMs: ms, endMs: ms, passes: [], minOrb: di, clipped: i === 0 };
        open.endMs = ms;
        open.minOrb = Math.min(open.minOrb, di);
        if (i === n - 1) open.clipped = true;
      } else if (open) {
        found.push(open);
        open = null;
      }
    }
    if (open) found.push(open);

    // 2. Exact crossings anywhere in the series (the |d| < 10 guard skips the
    //    ±180° wrap, which is a sign change but not a crossing).
    for (let i = 1; i < n; i++) {
      const a = d(i - 1);
      const b = d(i);
      if (Math.abs(a) >= 10 || Math.abs(b) >= 10 || Math.sign(a) === Math.sign(b) || a === 0) continue;
      const ms = series.startMs + i * series.stepMs;
      const hit = rootBetween(exact, ms - series.stepMs, ms);
      if (hit === null) continue;
      const home = found.find((w) => hit >= w.startMs - series.stepMs && hit <= w.endMs + series.stepMs);
      if (home) {
        home.passes.push(hit);
        home.minOrb = 0;
      } else {
        found.push({ target, startMs: hit, endMs: hit, passes: [hit], minOrb: 0, clipped: false });
      }
    }

    // 3. Merge windows a retrograde loop split apart.
    found.sort((x, y) => x.startMs - y.startMs);
    for (const w of found) {
      const prev = windows.length ? windows[windows.length - 1] : null;
      if (prev && prev.target === w.target && w.startMs - prev.endMs <= mergeGapMs) {
        prev.endMs = Math.max(prev.endMs, w.endMs);
        prev.passes.push(...w.passes);
        prev.minOrb = Math.min(prev.minOrb, w.minOrb);
        prev.clipped = prev.clipped || w.clipped;
      } else {
        windows.push({ ...w, passes: [...w.passes] });
      }
    }
  }
  for (const w of windows) {
    w.passes.sort((a, b) => a - b);
    if (w.startMs <= series.startMs || w.endMs >= lastMs) w.clipped = true;
  }
  return windows.sort((a, b) => a.startMs - b.startMs);
}

export interface SignSeason {
  startMs: number;
  endMs: number;
  /** Every entry into the sign (a retrograde at the border gives in → out → in). */
  entries: number[];
  clipped: boolean;
}

/**
 * Seasons in which the body is in the given sign (0 = Aries … 11 = Pisces).
 * Stays closer than `mergeGapMs` (a retrograde dip back over the border) are
 * one season with several entries.
 */
export function signSeasons(series: LongitudeSeries, signIndex: number, mergeGapMs = 0): SignSeason[] {
  const n = series.lon.length;
  const lastMs = series.startMs + (n - 1) * series.stepMs;
  const out: SignSeason[] = [];
  let open: SignSeason | null = null;
  for (let i = 0; i < n; i++) {
    const ms = series.startMs + i * series.stepMs;
    const inSign = Math.floor(series.lon[i] / 30) === signIndex;
    if (inSign && !open) {
      const prev = out.length ? out[out.length - 1] : null;
      if (prev && ms - prev.endMs <= mergeGapMs) {
        open = out.pop()!;
        open.entries.push(ms);
      } else {
        open = { startMs: ms, endMs: ms, entries: i === 0 ? [] : [ms], clipped: i === 0 };
      }
    }
    if (open && inSign) open.endMs = ms;
    if (open && !inSign) {
      out.push(open);
      open = null;
    }
  }
  if (open) out.push(open);
  for (const s of out) if (s.endMs >= lastMs) s.clipped = true;
  return out;
}

/** Mean lunar node (Meeus, Astronomical Algorithms 47.7), tropical degrees. */
export function meanNorthNodeAt(ms: number): number {
  const jd = ms / DAY_MS + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000);
}
