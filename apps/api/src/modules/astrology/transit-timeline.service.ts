import { Injectable } from '@nestjs/common';
import { EphemerisService, RawHoroscope, RawPoint } from './ephemeris.service';
import { ASPECT_NATURE, AspectType, Planet, absToSign } from './astrology.constants';
import * as Eph from './sky/sky-ephemeris';

export type TimelineEventKind = 'aspect' | 'house_ingress' | 'sign_ingress' | 'station' | 'eclipse';

/** One dated happening in the person's sky. All dates are UTC "YYYY-MM-DD". */
export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  planet: string;
  /** Natal point an aspect hits ("Sun", "Ascendant", …). */
  target?: string;
  aspect?: string;
  nature?: AspectType;
  /** Natal house entered (ingress) / where a station or eclipse falls. */
  house?: number;
  sign?: string;
  direction?: 'retrograde' | 'direct';
  eclipse?: 'solar' | 'lunar';
  start: string;
  end: string;
  /** Exact days (an outer-planet transit can perfect up to three times). */
  exact: string[];
  /** Relative significance, for picking spotlights. */
  weight: number;
  /** Localized one-line description, filled in by the report for the PDF table. */
  label?: string;
}

export interface TransitTimeline {
  from: string;
  to: string;
  events: TimelineEvent[];
}

const DAY_MS = 86_400_000;
const SLOW: Eph.SkyBody[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const STATIONING: Eph.SkyBody[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const ASPECTS: [number, string][] = [
  [0, 'Conjunction'],
  [60, 'Sextile'],
  [90, 'Square'],
  [120, 'Trine'],
  [180, 'Opposition'],
];
/** A slow transit counts while within 1° of exact. */
const ORB = 1;
/** Passes of the same transit closer than this (retrograde loops) are one event. */
const MERGE_GAP_DAYS = 150;
/** Slow-planet context sampled on both sides of the range, so a transit already under way keeps its passes together. */
const CONTEXT_DAYS = 400;
/** A turn-around this close to the exact degree is listed as an exact day too. */
const NEAR_EXACT = 0.35;

const PLANET_WEIGHT: Record<string, number> = {
  Pluto: 5, Neptune: 4, Uranus: 4, Saturn: 4, Jupiter: 3, Mars: 1.5, Venus: 1, Mercury: 1,
};
const TARGET_WEIGHT: Record<string, number> = {
  Sun: 5, Moon: 5, Ascendant: 5, Midheaven: 4, Venus: 3, Mars: 3, Mercury: 2,
};
const ASPECT_WEIGHT: Record<string, number> = {
  Conjunction: 1.25, Opposition: 1.1, Square: 1.1, Trine: 0.9, Sextile: 0.75,
};

const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

type Cusp = { house: number; start: number };

/**
 * The long view of someone's transits: every slow-planet aspect to their key
 * natal points (with each exact pass), slow planets changing natal house or
 * sign, retrograde stations, and eclipses — for a date range of up to a few
 * years.
 *
 * Runs on the key-moments sky engine (astronomy-engine, sky/sky-ephemeris.ts):
 * exact passes and stations are refined to the minute and eclipses are real
 * eclipses, not a node-distance guess. The natal chart (points and house
 * cusps) still comes from the chart library. Slow planets are sampled once a
 * day (~5 × 3.5 years of samples ≈ 0.3 s).
 */
@Injectable()
export class TransitTimelineService {
  constructor(private readonly ephemeris: EphemerisService) {}

  build(
    birth: { birthDate: string; birthTime: string; latitude: number; longitude: number; unknownTime?: boolean },
    from: string,
    to: string,
  ): TransitTimeline {
    const natal = this.ephemeris.computeChart({
      birthDate: birth.birthDate,
      birthTime: birth.unknownTime ? '12:00' : birth.birthTime,
      latitude: birth.latitude,
      longitude: birth.longitude,
    });
    const targets: Record<string, number> = {};
    for (const p of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'] as Planet[]) {
      targets[p] = this.body(natal, p).ChartPosition.Ecliptic.DecimalDegrees;
    }
    // Angles move with the birth minute — only meaningful when the time is known.
    if (!birth.unknownTime) {
      targets.Ascendant = natal.Ascendant.ChartPosition.Ecliptic.DecimalDegrees;
      targets.Midheaven = natal.Midheaven.ChartPosition.Ecliptic.DecimalDegrees;
    }
    const cusps: Cusp[] = natal.Houses.map((h) => ({ house: h.id, start: h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees }));

    const fromMs = Date.parse(`${from}T00:00:00Z`);
    const toMs = Date.parse(`${to}T23:59:59Z`);
    const series = new Map<Eph.SkyBody, Eph.LongitudeSeries>();
    for (const planet of SLOW) {
      series.set(planet, Eph.sampleLongitudes(planet, fromMs - CONTEXT_DAYS * DAY_MS, toMs + CONTEXT_DAYS * DAY_MS));
    }
    const range = { fromMs, toMs };

    const events = [
      ...this.aspects(series, targets, range),
      ...(birth.unknownTime ? [] : this.houseIngresses(series, cusps, range)),
      ...this.signIngresses(series, range),
      ...this.stations(range, birth.unknownTime ? null : cusps),
      ...this.eclipses(range, targets, birth.unknownTime ? null : cusps),
    ].sort((a, b) => a.start.localeCompare(b.start) || b.weight - a.weight);

    return { from, to, events };
  }

  // ── Event finders ───────────────────────────────────────────────────────────

  private aspects(
    series: Map<Eph.SkyBody, Eph.LongitudeSeries>,
    targets: Record<string, number>,
    r: { fromMs: number; toMs: number },
  ): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    for (const planet of SLOW) {
      const s = series.get(planet)!;
      for (const [target, natalLon] of Object.entries(targets)) {
        for (const [angle, name] of ASPECTS) {
          for (const w of Eph.aspectWindows(s, natalLon, angle, ORB, MERGE_GAP_DAYS * DAY_MS)) {
            if (w.endMs < r.fromMs || w.startMs > r.toMs) continue;
            const startMs = Math.max(w.startMs, r.fromMs);
            const endMs = Math.min(w.endMs, r.toMs);
            const duration = Math.round((endMs - startMs) / DAY_MS) + 1;
            out.push({
              id: `aspect:${planet}:${name}:${target}:${dayOf(startMs)}:${Math.round(w.target)}`,
              kind: 'aspect',
              planet,
              target,
              aspect: name,
              nature: ASPECT_NATURE[name] ?? 'neutral',
              start: dayOf(startMs),
              end: dayOf(endMs),
              exact: this.exactDays(s, w, r),
              weight: round(
                PLANET_WEIGHT[planet] * (TARGET_WEIGHT[target] ?? 2) * ASPECT_WEIGHT[name] * (1 + Math.min(duration, 365) / 120),
              ),
            });
          }
        }
      }
    }
    return out;
  }

  /**
   * The exact days of a transit inside the range. A slow planet that turns
   * around within NEAR_EXACT of the point without crossing it (a station on
   * the degree) still counts: its closest day is listed.
   */
  private exactDays(s: Eph.LongitudeSeries, w: Eph.AspectWindow, r: { fromMs: number; toMs: number }): string[] {
    const inRange = w.passes.filter((ms) => ms >= r.fromMs && ms <= r.toMs);
    if (inRange.length || w.passes.length || w.minOrb > NEAR_EXACT) return inRange.map(dayOf);
    let bestMs = NaN;
    let best = Infinity;
    const first = Math.max(0, Math.floor((Math.max(w.startMs, r.fromMs) - s.startMs) / s.stepMs));
    const last = Math.min(s.lon.length - 1, Math.ceil((Math.min(w.endMs, r.toMs) - s.startMs) / s.stepMs));
    for (let i = first; i <= last; i++) {
      const d = Math.abs(Eph.signedDiff(s.lon[i] - w.target));
      if (d < best) {
        best = d;
        bestMs = s.startMs + i * s.stepMs;
      }
    }
    return best <= NEAR_EXACT ? [dayOf(bestMs)] : [];
  }

  /** Day-by-day changes of a discrete function of longitude (house, sign), each refined to its day. */
  private changes(
    s: Eph.LongitudeSeries,
    r: { fromMs: number; toMs: number },
    classify: (lon: number) => number,
  ): { ms: number; value: number }[] {
    const out: { ms: number; value: number }[] = [];
    const first = Math.max(0, Math.floor((r.fromMs - s.startMs) / s.stepMs));
    const last = Math.min(s.lon.length - 1, Math.ceil((r.toMs - s.startMs) / s.stepMs));
    let prev = classify(s.lon[first]);
    for (let i = first + 1; i <= last; i++) {
      const value = classify(s.lon[i]);
      if (value === prev) continue;
      // Bisect between the two samples for the day of the change.
      let lo = s.startMs + (i - 1) * s.stepMs;
      let hi = s.startMs + i * s.stepMs;
      while (hi - lo > 60 * 60_000) {
        const mid = (lo + hi) / 2;
        if (classify(s.fn(mid)) === prev) lo = mid;
        else hi = mid;
      }
      if (hi >= r.fromMs && hi <= r.toMs) out.push({ ms: hi, value });
      prev = value;
    }
    return out;
  }

  private houseIngresses(
    series: Map<Eph.SkyBody, Eph.LongitudeSeries>,
    cusps: Cusp[],
    r: { fromMs: number; toMs: number },
  ): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    for (const planet of SLOW) {
      const s = series.get(planet)!;
      for (const c of this.changes(s, r, (lon) => this.houseOf(lon, cusps))) {
        const reentry = out.some((e) => e.planet === planet && e.house === c.value);
        const date = dayOf(c.ms);
        out.push({
          id: `house:${planet}:${c.value}:${date}`,
          kind: 'house_ingress',
          planet,
          house: c.value,
          sign: absToSign(s.fn(c.ms)).sign,
          start: date,
          end: date,
          exact: [date],
          weight: round(PLANET_WEIGHT[planet] * (reentry ? 1.5 : 4)),
        });
      }
    }
    return out;
  }

  private signIngresses(series: Map<Eph.SkyBody, Eph.LongitudeSeries>, r: { fromMs: number; toMs: number }): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    for (const planet of SLOW) {
      const s = series.get(planet)!;
      for (const c of this.changes(s, r, (lon) => Math.floor(Eph.norm360(lon) / 30))) {
        const sign = absToSign(c.value * 30 + 0.5).sign;
        const date = dayOf(c.ms);
        out.push({
          id: `sign:${planet}:${sign}:${date}`,
          kind: 'sign_ingress',
          planet,
          sign,
          start: date,
          end: date,
          exact: [date],
          weight: round(PLANET_WEIGHT[planet] * 2.5),
        });
      }
    }
    return out;
  }

  private stations(r: { fromMs: number; toMs: number }, cusps: Cusp[] | null): TimelineEvent[] {
    return Eph.findStations(r.fromMs, r.toMs, STATIONING).map((st) => {
      const date = dayOf(st.ms);
      return {
        id: `station:${st.body}:${st.kind}:${date}`,
        kind: 'station' as const,
        planet: st.body,
        direction: st.kind,
        sign: absToSign(st.longitude).sign,
        house: cusps ? this.houseOf(st.longitude, cusps) : undefined,
        start: date,
        end: date,
        exact: [date],
        weight: round((PLANET_WEIGHT[st.body] ?? 1) * (st.body === 'Mercury' ? 2 : 1.5)),
      };
    });
  }

  private eclipses(r: { fromMs: number; toMs: number }, targets: Record<string, number>, cusps: Cusp[] | null): TimelineEvent[] {
    return Eph.findEclipses(r.fromMs, r.toMs).map((e) => {
      const date = dayOf(e.ms);
      // The eclipse degree (the Sun/Moon conjunction, or the Moon at a lunar eclipse) on a key natal point.
      const touches = Object.values(targets).some((t) => Math.abs(Eph.signedDiff(e.longitude - t)) <= 5);
      return {
        id: `eclipse:${e.kind}:${date}`,
        kind: 'eclipse' as const,
        planet: e.kind === 'solar' ? 'Sun' : 'Moon',
        eclipse: e.kind,
        sign: absToSign(e.longitude).sign,
        house: cusps ? this.houseOf(e.longitude, cusps) : undefined,
        start: date,
        end: date,
        exact: [date],
        weight: touches ? 12 : 8,
      };
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Natal house a longitude falls in, from the house cusps. */
  private houseOf(lon: number, cusps: Cusp[]): number {
    for (let i = 0; i < cusps.length; i++) {
      const start = cusps[i].start;
      const end = cusps[(i + 1) % cusps.length].start;
      const width = Eph.norm360(end - start);
      if (Eph.norm360(lon - start) < width) return cusps[i].house;
    }
    return 1;
  }

  private body(h: RawHoroscope, name: string): RawPoint {
    return h.CelestialBodies[name.toLowerCase()] as RawPoint;
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
