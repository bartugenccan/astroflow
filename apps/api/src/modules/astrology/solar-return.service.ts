import { Injectable } from '@nestjs/common';
import { EphemerisService, RawHoroscope, RawPoint } from './ephemeris.service';
import {
  PLANETS,
  PLANET_SYMBOLS,
  ASPECT_NATURE,
  absToSign,
  matchAspect,
  AspectType,
  LifeArea,
  Planet,
} from './astrology.constants';
import { BirthInput } from './astrology-adapter.service';

/**
 * Which slice of life each house speaks to. Deliberately coarse: this maps the
 * 12 houses onto the same four `LifeArea` buckets the rest of the app already
 * speaks (best-days, forecast themes), so a Solar Return never introduces a
 * fifth vocabulary the UI would have to explain.
 */
const HOUSE_LIFE_AREA: Record<number, LifeArea> = {
  1: 'energy',
  2: 'money',
  3: 'energy',
  4: 'energy',
  5: 'love',
  6: 'career',
  7: 'love',
  8: 'money',
  9: 'energy',
  10: 'career',
  11: 'love',
  12: 'energy',
};

/** The angles. A planet here is the loudest thing in a return chart. */
const ANGULAR_HOUSES = [1, 4, 7, 10];

/** Slow movers whose exact hits are worth calling out as dated turning points. */
const SLOW_PLANETS: Planet[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

/** The personal points a slow transit actually gets felt against. */
const PERSONAL_PLANETS: Planet[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];

export interface YearAheadPlacement {
  name: string;
  sign: string;
  degree: number;
  minute: number;
  house: number;
  retrograde: boolean;
  symbol: string;
}

export interface YearAheadTurningPoint {
  /** `YYYY-MM` — a month, not a day: the underlying scan is monthly. */
  month: string;
  planet: string;
  aspect: string;
  natalPlanet: string;
  type: AspectType;
  area: LifeArea;
}

/**
 * The raw astrology behind a year-ahead reading. This is what the UI reveals
 * under "show me why" — never what it leads with.
 */
export interface YearAheadChart {
  /** Exact moment the Sun regained its birth longitude, ISO-8601 UTC. */
  returnAtUtc: string;
  /** The calendar day the return falls on, at the birth location. */
  returnDateLocal: string;
  /** Age the person turns in this cycle. */
  ageTurning: number;
  windowStart: string; // YYYY-MM-DD
  windowEnd: string; // YYYY-MM-DD
  ascendantSign: string;
  midheavenSign: string;
  sunHouse: number;
  moonSign: string;
  moonHouse: number;
  planets: YearAheadPlacement[];
  /** Planets on an angle — the year's headline actors. */
  angularPlanets: string[];
  /** Houses holding two or more planets, busiest first. */
  houseEmphasis: { house: number; planets: string[] }[];
  aspectsToSun: {
    planet: string;
    aspect: string;
    orb: number;
    type: AspectType;
  }[];
}

export interface YearAheadWindow {
  chart: YearAheadChart;
  /** Life areas the year leans on, strongest first. */
  focusAreas: LifeArea[];
  turningPoints: YearAheadTurningPoint[];
}

/**
 * Solar returns: the chart for the instant the Sun comes back to the exact
 * degree it held at birth, read as the shape of the following twelve months.
 *
 * Cast at the birth location, which is the conventional default. (Relocated
 * returns — casting for wherever the person will actually be on their birthday
 * — are a real technique but need a "where will you be?" input the app does not
 * collect, so they are out of scope here.)
 */
@Injectable()
export class SolarReturnService {
  constructor(private readonly ephemeris: EphemerisService) {}

  /**
   * The year-ahead window covering `onDate` (defaults to today): the solar
   * return that has most recently happened, and the twelve months it governs.
   * Before this year's birthday that is last year's return, not next year's.
   */
  getYearAhead(input: BirthInput, onDate?: string): YearAheadWindow {
    const { latitude, longitude } = input;
    const natal = this.ephemeris.computeChart({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      latitude,
      longitude,
    });
    const natalSunLon = this.body(natal, 'Sun').ChartPosition.Ecliptic
      .DecimalDegrees;

    const birth = this.parseISO(input.birthDate);
    const reference = onDate ? this.parseISO(onDate) : this.todayParts();

    // Solve the return for the reference year, then step back a year if that
    // return has not happened yet — the governing cycle is always the last one.
    let cycleYear = reference.year;
    let returnAt = this.solveFor(
      natalSunLon,
      cycleYear,
      birth,
      latitude,
      longitude,
    );
    const referenceUtc = Date.UTC(
      reference.year,
      reference.month - 1,
      reference.day,
      23,
      59,
    );
    if (returnAt.getTime() > referenceUtc) {
      cycleYear -= 1;
      returnAt = this.solveFor(
        natalSunLon,
        cycleYear,
        birth,
        latitude,
        longitude,
      );
    }
    const nextReturn = this.solveFor(
      natalSunLon,
      cycleYear + 1,
      birth,
      latitude,
      longitude,
    );

    const srChart = this.ephemeris.computeChartAtUtc(
      returnAt,
      latitude,
      longitude,
    );
    const chart = this.describe(
      srChart,
      returnAt,
      nextReturn,
      cycleYear - birth.year,
    );

    return {
      chart,
      focusAreas: this.rankFocusAreas(chart),
      turningPoints: this.findTurningPoints(
        natal,
        returnAt,
        nextReturn,
        latitude,
        longitude,
      ),
    };
  }

  /** Solve the return for a given calendar year, seeded at that year's birthday. */
  private solveFor(
    natalSunLon: number,
    year: number,
    birth: { month: number; day: number },
    latitude: number,
    longitude: number,
  ): Date {
    const seed = new Date(Date.UTC(year, birth.month - 1, birth.day, 12, 0));
    return this.ephemeris.solveSolarReturn(
      natalSunLon,
      seed,
      latitude,
      longitude,
    );
  }

  /** Reduce the raw return horoscope to the handful of facts a reading needs. */
  private describe(
    h: RawHoroscope,
    returnAt: Date,
    nextReturn: Date,
    ageTurning: number,
  ): YearAheadChart {
    const planets: YearAheadPlacement[] = PLANETS.map((p) => {
      const point = this.body(h, p);
      const pos = absToSign(point.ChartPosition.Ecliptic.DecimalDegrees);
      return {
        name: p,
        sign: pos.sign,
        degree: pos.degree,
        minute: pos.minute,
        house: point.House?.id ?? 0,
        retrograde: Boolean(point.isRetrograde),
        symbol: PLANET_SYMBOLS[p],
      };
    });

    const byHouse = new Map<number, string[]>();
    for (const p of planets) {
      if (!p.house) continue;
      const list = byHouse.get(p.house) ?? [];
      list.push(p.name);
      byHouse.set(p.house, list);
    }
    const houseEmphasis = [...byHouse.entries()]
      .filter(([, list]) => list.length >= 2)
      .map(([house, list]) => ({ house, planets: list }))
      .sort((a, b) => b.planets.length - a.planets.length);

    const sun = planets.find((p) => p.name === 'Sun');
    const moon = planets.find((p) => p.name === 'Moon');
    const sunLon = this.body(h, 'Sun').ChartPosition.Ecliptic.DecimalDegrees;

    const aspectsToSun = PLANETS.filter((p) => p !== 'Sun')
      .map((p) => {
        const other = this.body(h, p).ChartPosition.Ecliptic.DecimalDegrees;
        const hit = matchAspect(sunLon, other);
        if (!hit) return null;
        return {
          planet: p as string,
          aspect: hit.name,
          orb: Math.round(hit.orb * 10) / 10,
          type: ASPECT_NATURE[hit.name] ?? ('neutral' as AspectType),
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .sort((a, b) => a.orb - b.orb);

    return {
      returnAtUtc: returnAt.toISOString(),
      returnDateLocal: returnAt.toISOString().slice(0, 10),
      ageTurning,
      windowStart: returnAt.toISOString().slice(0, 10),
      windowEnd: nextReturn.toISOString().slice(0, 10),
      ascendantSign: h.Ascendant.Sign.label,
      midheavenSign: h.Midheaven.Sign.label,
      sunHouse: sun?.house ?? 0,
      moonSign: moon?.sign ?? '',
      moonHouse: moon?.house ?? 0,
      planets,
      angularPlanets: planets
        .filter((p) => ANGULAR_HOUSES.includes(p.house))
        .map((p) => p.name),
      houseEmphasis,
      aspectsToSun,
    };
  }

  /**
   * Rank the four life areas by how loaded the return chart is in their houses.
   * An angular planet counts double — angularity is the strongest single
   * signal a return chart carries.
   */
  private rankFocusAreas(chart: YearAheadChart): LifeArea[] {
    const tally: Record<LifeArea, number> = {
      love: 0,
      career: 0,
      money: 0,
      energy: 0,
    };
    for (const p of chart.planets) {
      const area = HOUSE_LIFE_AREA[p.house];
      if (!area) continue;
      tally[area] += ANGULAR_HOUSES.includes(p.house) ? 2 : 1;
    }
    if (chart.sunHouse && HOUSE_LIFE_AREA[chart.sunHouse]) {
      tally[HOUSE_LIFE_AREA[chart.sunHouse]] += 2;
    }
    return (Object.keys(tally) as LifeArea[]).sort(
      (a, b) => tally[b] - tally[a],
    );
  }

  /**
   * Dated moments worth flagging inside the window. Scans the twelve months and
   * keeps, per month, the tightest aspect a slow planet makes to a natal
   * personal planet — then returns the four sharpest of those.
   *
   * Monthly granularity on purpose: a mid-month sample says "this is a June
   * thing", which is all a plain-language year-ahead should ever claim. Naming
   * an exact day would imply a precision this scan does not have.
   */
  private findTurningPoints(
    natal: RawHoroscope,
    from: Date,
    to: Date,
    latitude: number,
    longitude: number,
  ): YearAheadTurningPoint[] {
    const natalLon: Partial<Record<Planet, number>> = {};
    for (const p of PERSONAL_PLANETS) {
      natalLon[p] = this.body(natal, p).ChartPosition.Ecliptic.DecimalDegrees;
    }

    const found: (YearAheadTurningPoint & { orb: number })[] = [];
    const cursor = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 15, 12, 0),
    );

    while (cursor.getTime() < to.getTime()) {
      const sky = this.ephemeris.computeAt(cursor, latitude, longitude);
      let best: (YearAheadTurningPoint & { orb: number }) | null = null;

      for (const sp of SLOW_PLANETS) {
        const lon = this.body(sky, sp).ChartPosition.Ecliptic.DecimalDegrees;
        for (const np of PERSONAL_PLANETS) {
          const target = natalLon[np];
          if (target === undefined) continue;
          const hit = matchAspect(lon, target);
          if (!hit) continue;
          if (best && hit.orb >= best.orb) continue;
          best = {
            month: cursor.toISOString().slice(0, 7),
            planet: sp,
            aspect: hit.name,
            natalPlanet: np,
            type: ASPECT_NATURE[hit.name] ?? 'neutral',
            area: this.areaForPair(sp, np),
            orb: hit.orb,
          };
        }
      }

      if (best) found.push(best);
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    // A slow planet holds an aspect for months, so neighbouring samples keep
    // re-reporting the same contact. Collapse each contact to the month it is
    // tightest in — otherwise the year reads as if one event happens three
    // separate times.
    const tightest = new Map<string, YearAheadTurningPoint & { orb: number }>();
    for (const hit of found) {
      const id = `${hit.planet}|${hit.aspect}|${hit.natalPlanet}`;
      const prev = tightest.get(id);
      if (!prev || hit.orb < prev.orb) tightest.set(id, hit);
    }

    return [...tightest.values()]
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 4)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(({ orb: _orb, ...rest }) => rest);
  }

  /** Which life area a slow-planet-to-natal-planet contact tends to land in. */
  private areaForPair(slow: Planet, natal: Planet): LifeArea {
    if (natal === 'Venus') return 'love';
    if (natal === 'Mars') return 'energy';
    if (natal === 'Mercury') return 'career';
    if (slow === 'Saturn' || slow === 'Pluto') return 'career';
    if (slow === 'Jupiter') return 'money';
    return 'energy';
  }

  private body(h: RawHoroscope, planet: Planet): RawPoint {
    return h.CelestialBodies[planet.toLowerCase()] as RawPoint;
  }

  private todayParts(): { year: number; month: number; day: number } {
    const now = new Date();
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
    };
  }

  private parseISO(s: string): { year: number; month: number; day: number } {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return this.todayParts();
    return { year: +m[1], month: +m[2], day: +m[3] };
  }
}
