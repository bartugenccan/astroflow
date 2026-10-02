import { Injectable } from '@nestjs/common';
import { EphemerisService, RawHoroscope, RawPoint } from './ephemeris.service';
import { ASPECT_NATURE, AspectType, PLANETS, Planet, absToSign } from './astrology.constants';
import { addDays, norm, sep, signed } from './sky-scan';

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

interface DaySky {
  date: string;
  lon: Record<Planet, number>;
  retro: Record<Planet, boolean>;
  node: number;
}

const SLOW: Planet[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const STATIONING: Planet[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
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
const ECLIPSE_NODE_ORB = 17;

const PLANET_WEIGHT: Record<string, number> = {
  Pluto: 5, Neptune: 4, Uranus: 4, Saturn: 4, Jupiter: 3, Mars: 1.5, Venus: 1, Mercury: 1,
};
const TARGET_WEIGHT: Record<string, number> = {
  Sun: 5, Moon: 5, Ascendant: 5, Midheaven: 4, Venus: 3, Mars: 3, Mercury: 2,
};
const ASPECT_WEIGHT: Record<string, number> = {
  Conjunction: 1.25, Opposition: 1.1, Square: 1.1, Trine: 0.9, Sextile: 0.75,
};

/**
 * The long view of someone's transits: every slow-planet aspect to their key
 * natal points (with each exact pass), slow planets changing natal house or
 * sign, retrograde stations, and eclipses — for a date range of up to a few
 * years. Pure ephemeris; the sky is cast once a day at 12:00 UTC (~2.5 ms each,
 * so 24 months ≈ 2 s).
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
    const cusps = natal.Houses.map((h) => ({ house: h.id, start: h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees }));

    const days: DaySky[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) days.push(this.sky(d, birth.latitude, birth.longitude));

    const events = [
      ...this.aspects(days, targets),
      ...(birth.unknownTime ? [] : this.houseIngresses(days, cusps)),
      ...this.signIngresses(days),
      ...this.stations(days, birth.unknownTime ? null : cusps),
      ...this.eclipses(days, targets, birth.unknownTime ? null : cusps),
    ].sort((a, b) => a.start.localeCompare(b.start) || b.weight - a.weight);

    return { from, to, events };
  }

  // ── Event finders ───────────────────────────────────────────────────────────

  private aspects(days: DaySky[], targets: Record<string, number>): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    for (const planet of SLOW) {
      for (const [target, natalLon] of Object.entries(targets)) {
        for (const [angle, name] of ASPECTS) {
          const orbs = days.map((d) => Math.abs(sep(d.lon[planet], natalLon) - angle));
          const passes: { start: number; end: number }[] = [];
          let i = 0;
          while (i < orbs.length) {
            if (orbs[i] > ORB) {
              i++;
              continue;
            }
            const start = i;
            while (i < orbs.length && orbs[i] <= ORB) i++;
            passes.push({ start, end: i - 1 });
          }
          if (!passes.length) continue;

          // Retrograde loops make one transit touch exact up to three times — merge them.
          const merged: { start: number; end: number }[] = [];
          for (const p of passes) {
            const last = merged[merged.length - 1];
            if (last && p.start - last.end <= MERGE_GAP_DAYS) last.end = p.end;
            else merged.push({ ...p });
          }

          for (const m of merged) {
            const exact: string[] = [];
            for (let k = m.start; k <= m.end; k++) {
              const prev = orbs[k - 1] ?? Infinity;
              const next = orbs[k + 1] ?? Infinity;
              if (orbs[k] <= 0.35 && orbs[k] <= prev && orbs[k] <= next) exact.push(days[k].date);
            }
            const duration = m.end - m.start + 1;
            out.push({
              id: `aspect:${planet}:${name}:${target}:${days[m.start].date}`,
              kind: 'aspect',
              planet,
              target,
              aspect: name,
              nature: ASPECT_NATURE[name] ?? 'neutral',
              start: days[m.start].date,
              end: days[m.end].date,
              exact,
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

  private houseIngresses(days: DaySky[], cusps: { house: number; start: number }[]): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    for (const planet of SLOW) {
      let prev = this.houseOf(days[0].lon[planet], cusps);
      for (let i = 1; i < days.length; i++) {
        const house = this.houseOf(days[i].lon[planet], cusps);
        if (house === prev) continue;
        const reentry = out.some((e) => e.planet === planet && e.house === house);
        out.push({
          id: `house:${planet}:${house}:${days[i].date}`,
          kind: 'house_ingress',
          planet,
          house,
          sign: absToSign(days[i].lon[planet]).sign,
          start: days[i].date,
          end: days[i].date,
          exact: [days[i].date],
          weight: round(PLANET_WEIGHT[planet] * (reentry ? 1.5 : 4)),
        });
        prev = house;
      }
    }
    return out;
  }

  private signIngresses(days: DaySky[]): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    for (const planet of SLOW) {
      let prev = absToSign(days[0].lon[planet]).sign;
      for (let i = 1; i < days.length; i++) {
        const sign = absToSign(days[i].lon[planet]).sign;
        if (sign === prev) continue;
        out.push({
          id: `sign:${planet}:${sign}:${days[i].date}`,
          kind: 'sign_ingress',
          planet,
          sign,
          start: days[i].date,
          end: days[i].date,
          exact: [days[i].date],
          weight: round(PLANET_WEIGHT[planet] * 2.5),
        });
        prev = sign;
      }
    }
    return out;
  }

  private stations(days: DaySky[], cusps: { house: number; start: number }[] | null): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    for (const planet of STATIONING) {
      for (let i = 1; i < days.length; i++) {
        if (days[i].retro[planet] === days[i - 1].retro[planet]) continue;
        const direction = days[i].retro[planet] ? 'retrograde' : 'direct';
        const lon = days[i].lon[planet];
        out.push({
          id: `station:${planet}:${direction}:${days[i].date}`,
          kind: 'station',
          planet,
          direction,
          sign: absToSign(lon).sign,
          house: cusps ? this.houseOf(lon, cusps) : undefined,
          start: days[i].date,
          end: days[i].date,
          exact: [days[i].date],
          weight: round((PLANET_WEIGHT[planet] ?? 1) * (planet === 'Mercury' ? 2 : 1.5)),
        });
      }
    }
    return out;
  }

  private eclipses(
    days: DaySky[],
    targets: Record<string, number>,
    cusps: { house: number; start: number }[] | null,
  ): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    for (let i = 1; i < days.length; i++) {
      const a = days[i - 1];
      const b = days[i];
      const e0 = norm(a.lon.Moon - a.lon.Sun);
      const e1 = norm(b.lon.Moon - b.lon.Sun);
      const solar = e1 < e0; // elongation wrapped past 0° → new Moon
      const lunar = e0 < 180 && e1 >= 180; // → full Moon
      if (!solar && !lunar) continue;
      const span = solar ? e1 + 360 - e0 : e1 - e0;
      const f = ((solar ? 360 : 180) - e0) / span;
      const moon = norm(a.lon.Moon + f * signed(b.lon.Moon - a.lon.Moon));
      const node = norm(a.node + f * signed(b.node - a.node));
      if (Math.min(sep(moon, node), sep(moon, node + 180)) > ECLIPSE_NODE_ORB) continue;
      // The Moon marks the eclipse degree: on the Sun at a solar eclipse, opposite it at a lunar one.
      const point = moon;
      const touches = Object.values(targets).some((t) => sep(point, t) <= 5);
      const date = f < 0.5 ? a.date : b.date;
      out.push({
        id: `eclipse:${solar ? 'solar' : 'lunar'}:${date}`,
        kind: 'eclipse',
        planet: solar ? 'Sun' : 'Moon',
        eclipse: solar ? 'solar' : 'lunar',
        sign: absToSign(point).sign,
        house: cusps ? this.houseOf(point, cusps) : undefined,
        start: date,
        end: date,
        exact: [date],
        weight: touches ? 12 : 8,
      });
    }
    return out;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private sky(date: string, latitude: number, longitude: number): DaySky {
    const [y, m, d] = date.split('-').map(Number);
    const h = this.ephemeris.bodiesAtUtc(new Date(Date.UTC(y, m - 1, d, 12)), latitude, longitude);
    const lon = {} as Record<Planet, number>;
    const retro = {} as Record<Planet, boolean>;
    for (const p of PLANETS) {
      const b = this.body(h, p);
      lon[p] = b.ChartPosition.Ecliptic.DecimalDegrees;
      retro[p] = !!b.isRetrograde;
    }
    return { date, lon, retro, node: h.CelestialPoints.northnode.ChartPosition.Ecliptic.DecimalDegrees };
  }

  /** Natal house a longitude falls in, from the house cusps. */
  private houseOf(lon: number, cusps: { house: number; start: number }[]): number {
    for (let i = 0; i < cusps.length; i++) {
      const start = cusps[i].start;
      const end = cusps[(i + 1) % cusps.length].start;
      const width = norm(end - start);
      if (norm(lon - start) < width) return cusps[i].house;
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
