import { Injectable } from '@nestjs/common';
import { EphemerisService, RawHoroscope, RawPoint } from './ephemeris.service';
import {
  PLANETS,
  PLANET_SYMBOLS,
  ELEMENT_BY_SIGN,
  MODALITY_BY_SIGN,
  SIGN_RULER,
  TRADITIONAL_SIGN_RULER,
  ASPECT_NATURE,
  PLANET_WEIGHT,
  ANGULAR_HOUSE_DIGNITY,
  BEST_DAYS_NATAL_TARGETS,
  BEST_DAYS_TRANSIT_SOURCES,
  absToSign,
  matchAspect,
  Sign,
  Planet,
  AspectType,
  LifeArea,
} from './astrology.constants';

// ─── Public contract (mirrored 1:1 by the mobile app's types.ts) ──────────────
export interface NatalChartData {
  houses: {
    house: number;
    sign: string;
    degree: number;
    minute: number;
    ruler: string; // traditional ruler of the cusp sign
    rulerSign: string; // sign the ruler occupies
    rulerHouse: number; // house the ruler occupies
    planetsInHouse: string[]; // names of planets whose house === this
  }[];
  planets: {
    name: string;
    sign: string;
    degree: number;
    minute: number;
    house: number;
    retrograde: boolean;
    symbol: string;
  }[];
  angles: {
    ascendant: { sign: string; degree: number; minute: number };
    midheaven: { sign: string; degree: number; minute: number };
  };
  nodes: {
    north: { sign: string; degree: number; minute: number; house: number };
    south: { sign: string; degree: number; minute: number; house: number };
  };
  sect: 'day' | 'night';
  saturn: { natalSign: string; natalHouse: number; returnAge: number };
  summary: {
    sunSign: string;
    moonSign: string;
    risingSign: string;
    dominantElement: string;
    dominantPlanet: string;
    dominantModality: string;
  };
  aspects: {
    planet1: string;
    planet2: string;
    aspect: string;
    orb: number;
    type: AspectType;
  }[];
  chartMeta: {
    calculatedAt: string;
    julianDay: number;
    siderealTime: number;
  };
}

export interface TransitData {
  date: string;
  transits: {
    transitPlanet: string;
    transitSign: string;
    transitDegree: number;
    natalPlanet: string;
    natalSign: string;
    aspect: string;
    orb: number;
    interpretation: string;
    action: string;
  }[];
  dailyScores: {
    harmony: number;
    tension: number;
    energy: number;
    focus: number;
    creativity: number;
  };
}

// Planet-centric transit report (mirrored 1:1 by the mobile app's types.ts).
export interface TransitMovement {
  planet: string;
  sign: string;
  degree: number;
  minute: number;
  retrograde: boolean;
  natalHouse: number; // natal house the transiting planet currently occupies
  daysInHouse: number; // approx days until it crosses the next natal cusp
  aspects: {
    natalPlanet: string;
    natalSign: string;
    aspect: string;
    nature: AspectType;
    orb: number;
  }[];
}

export interface TransitReport {
  date: string; // YYYY-MM-DD
  movements: TransitMovement[]; // the 10 planets, planet-centric
  skyAspects: {
    // aspects among the currently-transiting planets (the general sky)
    planet1: string;
    planet2: string;
    aspect: string;
    nature: AspectType;
    orb: number;
  }[];
}

export interface BirthInput {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
}

// One planet-to-planet contact between two natal charts (mirrored on mobile).
export interface SynastryAspect {
  planetA: string; // owner ("self") planet
  planetB: string; // other person's planet
  aspect: string;
  nature: AspectType;
  orb: number;
}

export interface BestDayScore {
  date: string; // YYYY-MM-DD
  love: number;
  career: number;
  money: number;
  energy: number;
  overall: number;
}

export interface BestDayTop {
  date: string;
  score: number;
  // The tightest driving aspect, for a deterministic reason line.
  transitPlanet: string;
  natalPlanet: string;
  aspect: string;
  nature: AspectType;
}

export interface BestDaysResponse {
  start: string; // YYYY-MM-DD
  days: number;
  scores: BestDayScore[];
  top: Record<LifeArea, BestDayTop[]>;
}

// Characteristic geocentric daily motion (deg/day) — the planet's *pace*, used
// to estimate how long a transit stays in a house. Instantaneous speed is
// unreliable near stations (it blows up to centuries), so we use the mean pace
// and take direction from the live retrograde flag. These yield the expected
// per-sign dwell times (Moon ~2 days, Venus ~30 days, Saturn ~2.5 years).
const MEAN_MOTION: Record<string, number> = {
  Sun: 0.986,
  Moon: 13.176,
  Mercury: 1.2,
  Venus: 1.0,
  Mars: 0.524,
  Jupiter: 0.083,
  Saturn: 0.034,
  Uranus: 0.0117,
  Neptune: 0.006,
  Pluto: 0.0068,
};

@Injectable()
export class AstrologyAdapterService {
  constructor(private readonly ephemeris: EphemerisService) {}

  getNatalChart(
    birthDate: string,
    birthTime: string,
    latitude: number,
    longitude: number,
  ): NatalChartData {
    const h = this.ephemeris.computeChart({ birthDate, birthTime, latitude, longitude });

    const planets = PLANETS.map((name) => {
      const body = this.body(h, name);
      const pos = absToSign(body.ChartPosition.Ecliptic.DecimalDegrees);
      return {
        name,
        sign: pos.sign,
        degree: pos.degree,
        minute: pos.minute,
        house: body.House?.id ?? 0,
        retrograde: !!body.isRetrograde,
        symbol: PLANET_SYMBOLS[name],
      };
    });

    // Where each planet sits, keyed by name — reused for house rulers.
    const planetHouse: Record<string, number> = {};
    const planetSign: Record<string, string> = {};
    for (const p of planets) {
      planetHouse[p.name] = p.house;
      planetSign[p.name] = p.sign;
    }

    const houses = h.Houses.map((house) => {
      const pos = absToSign(house.ChartPosition.StartPosition.Ecliptic.DecimalDegrees);
      const ruler = TRADITIONAL_SIGN_RULER[pos.sign as Sign];
      return {
        house: house.id,
        sign: pos.sign,
        degree: pos.degree,
        minute: pos.minute,
        ruler,
        rulerSign: planetSign[ruler] ?? pos.sign,
        rulerHouse: planetHouse[ruler] ?? house.id,
        planetsInHouse: planets.filter((p) => p.house === house.id).map((p) => p.name),
      };
    });

    const asc = absToSign(h.Ascendant.ChartPosition.Ecliptic.DecimalDegrees);
    const mc = absToSign(h.Midheaven.ChartPosition.Ecliptic.DecimalDegrees);

    const north = this.pointPlacement(h.CelestialPoints.northnode);
    const south = this.pointPlacement(h.CelestialPoints.southnode);

    const sun = planets[0];
    const saturn = planets.find((p) => p.name === 'Saturn')!;
    const sect: 'day' | 'night' = sun.house >= 7 ? 'day' : 'night';

    const aspects = h.Aspects.all
      .filter(
        (a) =>
          (PLANETS as readonly string[]).includes(a.point1Label) &&
          (PLANETS as readonly string[]).includes(a.point2Label),
      )
      .map((a) => ({
        planet1: a.point1Label,
        planet2: a.point2Label,
        aspect: a.label,
        orb: Math.round(a.orb * 10) / 10,
        type: ASPECT_NATURE[a.label] ?? 'neutral',
      }));

    const moon = planets[1];

    return {
      houses,
      planets,
      angles: { ascendant: asc, midheaven: mc },
      nodes: { north, south },
      sect,
      saturn: {
        natalSign: saturn.sign,
        natalHouse: saturn.house,
        returnAge: 29.5,
      },
      summary: {
        sunSign: sun.sign,
        moonSign: moon.sign,
        risingSign: asc.sign,
        dominantElement: this.dominantElement(planets),
        dominantModality: this.dominantModality(planets),
        dominantPlanet: this.dominantPlanet(planets),
      },
      aspects,
      chartMeta: {
        calculatedAt: new Date().toISOString(),
        julianDay: 0,
        siderealTime: 0,
      },
    };
  }

  private pointPlacement(point: RawPoint) {
    const pos = absToSign(point.ChartPosition.Ecliptic.DecimalDegrees);
    return {
      sign: pos.sign,
      degree: pos.degree,
      minute: pos.minute,
      house: point.House?.id ?? 0,
    };
  }

  getCurrentTransits(
    birthDate: string,
    birthTime: string,
    latitude: number,
    longitude: number,
  ): TransitData {
    const natal = this.ephemeris.computeChart({ birthDate, birthTime, latitude, longitude });
    const now = this.ephemeris.computeNow(latitude, longitude);

    const transits: TransitData['transits'] = [];
    for (const tp of PLANETS) {
      const cur = this.body(now, tp);
      const curAbs = cur.ChartPosition.Ecliptic.DecimalDegrees;
      const curPos = absToSign(curAbs);
      for (const np of PLANETS) {
        const natalBody = this.body(natal, np);
        const natalAbs = natalBody.ChartPosition.Ecliptic.DecimalDegrees;
        const hit = this.matchAspect(curAbs, natalAbs);
        if (!hit) continue;
        transits.push({
          transitPlanet: tp,
          transitSign: curPos.sign,
          transitDegree: curPos.degree,
          natalPlanet: np,
          natalSign: absToSign(natalAbs).sign,
          aspect: hit.name,
          orb: Math.round(hit.orb * 10) / 10,
          interpretation: `${tp} ${hit.name.toLowerCase()} your natal ${np}`,
          action: '',
        });
      }
    }

    // Tightest orbs first, capped so the feed stays readable.
    transits.sort((a, b) => a.orb - b.orb);
    const top = transits.slice(0, 8);

    return {
      date: new Date().toISOString(),
      transits: top,
      dailyScores: this.dailyScores(top),
    };
  }

  /**
   * Planet-centric transit report: for each transiting planet, the natal house
   * it currently moves through, ~how long until it leaves that house (from its
   * live daily motion), and the aspects it makes to natal planets. Plus the
   * aspects among the transiting planets themselves (the general sky).
   */
  getTransitReport(
    birthDate: string,
    birthTime: string,
    latitude: number,
    longitude: number,
  ): TransitReport {
    const natal = this.ephemeris.computeChart({ birthDate, birthTime, latitude, longitude });
    const now = new Date();
    const skyNow = this.ephemeris.computeAt(now, latitude, longitude);

    // Natal house cusps as absolute longitudes, ordered by house id.
    const cusps = natal.Houses.slice()
      .sort((a, b) => a.id - b.id)
      .map((house) => ({
        house: house.id,
        start: house.ChartPosition.StartPosition.Ecliptic.DecimalDegrees,
      }));

    const movements: TransitMovement[] = PLANETS.map((tp) => {
      const cur = this.body(skyNow, tp);
      const curAbs = cur.ChartPosition.Ecliptic.DecimalDegrees;
      const pos = absToSign(curAbs);
      const retrograde = !!cur.isRetrograde;
      const natalHouse = this.houseOfLongitude(curAbs, cusps);

      const aspects = PLANETS.flatMap((np) => {
        const natalAbs = this.body(natal, np).ChartPosition.Ecliptic.DecimalDegrees;
        const hit = this.matchAspect(curAbs, natalAbs);
        if (!hit) return [];
        return [
          {
            natalPlanet: np,
            natalSign: absToSign(natalAbs).sign,
            aspect: hit.name,
            nature: ASPECT_NATURE[hit.name] ?? ('neutral' as AspectType),
            orb: Math.round(hit.orb * 10) / 10,
          },
        ];
      }).sort((a, b) => a.orb - b.orb);

      return {
        planet: tp,
        sign: pos.sign,
        degree: pos.degree,
        minute: pos.minute,
        retrograde,
        natalHouse,
        daysInHouse: this.daysInHouse(
          curAbs,
          natalHouse,
          cusps,
          MEAN_MOTION[tp] ?? 1,
          retrograde,
        ),
        aspects,
      };
    });

    // Aspects among the transiting planets themselves — the general "sky now".
    const skyAspects: TransitReport['skyAspects'] = [];
    for (let i = 0; i < PLANETS.length; i++) {
      for (let j = i + 1; j < PLANETS.length; j++) {
        const a = this.body(skyNow, PLANETS[i]).ChartPosition.Ecliptic.DecimalDegrees;
        const b = this.body(skyNow, PLANETS[j]).ChartPosition.Ecliptic.DecimalDegrees;
        const hit = this.matchAspect(a, b);
        if (!hit) continue;
        skyAspects.push({
          planet1: PLANETS[i],
          planet2: PLANETS[j],
          aspect: hit.name,
          nature: ASPECT_NATURE[hit.name] ?? ('neutral' as AspectType),
          orb: Math.round(hit.orb * 10) / 10,
        });
      }
    }
    skyAspects.sort((a, b) => a.orb - b.orb);

    return {
      date: now.toISOString().slice(0, 10),
      movements,
      skyAspects: skyAspects.slice(0, 8),
    };
  }

  /**
   * Cross-chart aspects between two natal charts (synastry). The same
   * PLANETS × PLANETS aspect loop as transits, but B is a second natal chart
   * rather than the live sky. `planetA` is the owner ("self"), `planetB` the
   * other person — order preserved so downstream copy can speak from the
   * owner's perspective.
   */
  getSynastryAspects(self: BirthInput, other: BirthInput): SynastryAspect[] {
    const lonA = this.planetLongitudes(self);
    const lonB = this.planetLongitudes(other);

    const out: SynastryAspect[] = [];
    for (const pa of PLANETS) {
      for (const pb of PLANETS) {
        const hit = matchAspect(lonA[pa], lonB[pb]);
        if (!hit) continue;
        out.push({
          planetA: pa,
          planetB: pb,
          aspect: hit.name,
          nature: ASPECT_NATURE[hit.name] ?? 'neutral',
          orb: Math.round(hit.orb * 10) / 10,
        });
      }
    }
    return out;
  }

  /**
   * Score each of the next `days` days per life-area by looping the transit ×
   * natal aspect comparison over the window. Pure compute (no AI). Instants are
   * built at noon UTC via component construction to avoid the Hermes/UTC
   * day-shift footgun and to minimise Moon intraday drift.
   */
  getBestDays(
    birthDate: string,
    birthTime: string,
    latitude: number,
    longitude: number,
    days: number,
    startISO?: string,
  ): BestDaysResponse {
    const natal = this.ephemeris.computeChart({ birthDate, birthTime, latitude, longitude });
    const natalLon: Record<string, number> = {};
    for (const p of PLANETS) {
      natalLon[p] = this.body(natal, p).ChartPosition.Ecliptic.DecimalDegrees;
    }

    const start = startISO ? this.parseISO(startISO) : this.todayParts();
    const areas: LifeArea[] = ['love', 'career', 'money', 'energy'];
    const scores: BestDayScore[] = [];
    // Per-area running list of {date, raw, top-aspect} to rank afterwards.
    const perArea: Record<LifeArea, BestDayTop[]> = {
      love: [], career: [], money: [], energy: [],
    };

    for (let i = 0; i < days; i++) {
      const d = new Date(Date.UTC(start.year, start.month - 1, start.day + i, 12, 0, 0));
      const date = d.toISOString().slice(0, 10);
      const sky = this.ephemeris.computeAt(d, latitude, longitude);

      const raw: Record<LifeArea, number> = { love: 0, career: 0, money: 0, energy: 0 };
      const best: Record<LifeArea, { strength: number; hit: BestDayTop } | null> = {
        love: null, career: null, money: null, energy: null,
      };

      for (const tp of PLANETS) {
        const tAbs = this.body(sky, tp).ChartPosition.Ecliptic.DecimalDegrees;
        for (const np of PLANETS) {
          const hit = matchAspect(tAbs, natalLon[np]);
          if (!hit) continue;
          const tightness = Math.max(0, 1 - hit.orb / hit.maxOrb);
          const nature = ASPECT_NATURE[hit.name] ?? 'neutral';
          const polarity = nature === 'harmonic' ? 1 : nature === 'challenging' ? -0.8 : 0.3;

          for (const area of areas) {
            const sourceW = BEST_DAYS_TRANSIT_SOURCES[area].includes(tp) ? 1 : 0.35;
            const targetW = BEST_DAYS_NATAL_TARGETS[area].includes(np) ? 1 : 0;
            if (targetW === 0) continue;
            const contribution = sourceW * targetW * tightness * polarity;
            raw[area] += contribution;
            const strength = sourceW * targetW * tightness;
            if (!best[area] || strength > best[area]!.strength) {
              best[area] = {
                strength,
                hit: {
                  date,
                  score: 0,
                  transitPlanet: tp,
                  natalPlanet: np,
                  aspect: hit.name,
                  nature,
                },
              };
            }
          }
        }
      }

      const clamp = (n: number) => Math.max(15, Math.min(95, Math.round(n)));
      const areaScore: Record<LifeArea, number> = {
        love: clamp(50 + raw.love * 22),
        career: clamp(50 + raw.career * 22),
        money: clamp(50 + raw.money * 22),
        energy: clamp(50 + raw.energy * 22),
      };
      scores.push({
        date,
        ...areaScore,
        overall: Math.round((areaScore.love + areaScore.career + areaScore.money + areaScore.energy) / 4),
      });

      for (const area of areas) {
        if (best[area]) {
          perArea[area].push({ ...best[area]!.hit, score: areaScore[area] });
        }
      }
    }

    const top: Record<LifeArea, BestDayTop[]> = {
      love: this.topDays(perArea.love),
      career: this.topDays(perArea.career),
      money: this.topDays(perArea.money),
      energy: this.topDays(perArea.energy),
    };

    return {
      start: `${start.year}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`,
      days,
      scores,
      top,
    };
  }

  /**
   * Structured, real-transit grounding for a weekly/monthly forecast: the
   * standout natal transits at the window's midpoint, sign ingresses within the
   * window, retrograde stations, and the top best-days as key dates. Returned as
   * English phrase bullets that the AI localizes (consistent with transit prompts).
   */
  getForecastWindow(
    birthDate: string,
    birthTime: string,
    latitude: number,
    longitude: number,
    period: 'weekly' | 'monthly',
    startISO?: string,
  ): {
    start: string;
    end: string;
    sun: string;
    transits: string[];
    ingresses: string[];
    stations: string[];
    keyDates: string[];
  } {
    const startParts = startISO ? this.parseISO(startISO) : this.todayParts();
    const length = period === 'weekly' ? 7 : 30;
    const startDate = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day, 12));
    const endDate = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day + length - 1, 12));
    const midDate = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day + Math.floor(length / 2), 12));

    const natal = this.ephemeris.computeChart({ birthDate, birthTime, latitude, longitude });
    const natalLon: Record<string, number> = {};
    for (const p of PLANETS) natalLon[p] = this.body(natal, p).ChartPosition.Ecliptic.DecimalDegrees;
    const sun = absToSign(natalLon['Sun']).sign;

    const skyStart = this.ephemeris.computeAt(startDate, latitude, longitude);
    const skyEnd = this.ephemeris.computeAt(endDate, latitude, longitude);
    const skyMid = this.ephemeris.computeAt(midDate, latitude, longitude);

    // Standout natal transits at midpoint (tightest orbs).
    const midHits: { s: string; orb: number }[] = [];
    for (const tp of PLANETS) {
      const tAbs = this.body(skyMid, tp).ChartPosition.Ecliptic.DecimalDegrees;
      for (const np of PLANETS) {
        const hit = matchAspect(tAbs, natalLon[np]);
        if (!hit) continue;
        midHits.push({ s: `${tp} ${hit.name.toLowerCase()} your ${np}`, orb: hit.orb });
      }
    }
    const transits = midHits.sort((a, b) => a.orb - b.orb).slice(0, 6).map((h) => h.s);

    // Ingresses + stations: compare each planet start vs end of window.
    const ingresses: string[] = [];
    const stations: string[] = [];
    for (const p of PLANETS) {
      const a = this.body(skyStart, p);
      const b = this.body(skyEnd, p);
      const signA = absToSign(a.ChartPosition.Ecliptic.DecimalDegrees).sign;
      const signB = absToSign(b.ChartPosition.Ecliptic.DecimalDegrees).sign;
      if (signA !== signB) ingresses.push(`${p} enters ${signB}`);
      if (!!a.isRetrograde !== !!b.isRetrograde) {
        stations.push(`${p} turns ${b.isRetrograde ? 'retrograde' : 'direct'}`);
      }
    }

    // Key dates from best-days over the window (top overall days).
    const best = this.getBestDays(birthDate, birthTime, latitude, longitude, length, startISO);
    const keyDates = [...best.scores]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 3)
      .map((d) => `${d.date} — a strong overall day (${d.overall}/100)`);

    return {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
      sun,
      transits,
      ingresses,
      stations,
      keyDates,
    };
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private planetLongitudes(input: BirthInput): Record<string, number> {
    const h = this.ephemeris.computeChart({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      latitude: input.latitude,
      longitude: input.longitude,
    });
    const out: Record<string, number> = {};
    for (const p of PLANETS) {
      out[p] = this.body(h, p).ChartPosition.Ecliptic.DecimalDegrees;
    }
    return out;
  }

  private topDays(list: BestDayTop[]): BestDayTop[] {
    return [...list].sort((a, b) => b.score - a.score).slice(0, 5);
  }

  private todayParts(): { year: number; month: number; day: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }

  private parseISO(s: string): { year: number; month: number; day: number } {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return this.todayParts();
    return { year: +m[1], month: +m[2], day: +m[3] };
  }

  private body(h: RawHoroscope, planet: Planet): RawPoint {
    return h.CelestialBodies[planet.toLowerCase()] as RawPoint;
  }

  /** Which natal house (1-12) an absolute longitude falls in, given ordered cusps. */
  private houseOfLongitude(
    abs: number,
    cusps: { house: number; start: number }[],
  ): number {
    const a = ((abs % 360) + 360) % 360;
    for (let i = 0; i < cusps.length; i++) {
      const start = cusps[i].start;
      const end = cusps[(i + 1) % cusps.length].start;
      if (start < end ? a >= start && a < end : a >= start || a < end) {
        return cusps[i].house;
      }
    }
    return cusps[0].house;
  }

  /**
   * Approx days until the transiting planet crosses out of its current natal
   * house, from its characteristic pace (`meanMotion`). Direction comes from the
   * live retrograde flag: direct motion exits via the next cusp, retrograde via
   * the start cusp.
   */
  private daysInHouse(
    abs: number,
    house: number,
    cusps: { house: number; start: number }[],
    meanMotion: number,
    retrograde: boolean,
  ): number {
    const idx = cusps.findIndex((c) => c.house === house);
    if (idx === -1) return 0;
    const a = ((abs % 360) + 360) % 360;
    const start = cusps[idx].start;
    const end = cusps[(idx + 1) % cusps.length].start;
    const distance = retrograde
      ? (((a - start) % 360) + 360) % 360
      : (((end - a) % 360) + 360) % 360;
    return Math.round((distance / Math.max(meanMotion, 1e-4)) * 10) / 10;
  }

  private matchAspect(a: number, b: number): { name: string; orb: number } | null {
    return matchAspect(a, b);
  }

  private dominantElement(planets: NatalChartData['planets']): string {
    const tally: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    for (const p of planets) {
      tally[ELEMENT_BY_SIGN[p.sign as Sign]] += PLANET_WEIGHT[p.name as Planet];
    }
    return this.maxKey(tally);
  }

  private dominantModality(planets: NatalChartData['planets']): string {
    const tally: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };
    for (const p of planets) {
      tally[MODALITY_BY_SIGN[p.sign as Sign]] += PLANET_WEIGHT[p.name as Planet];
    }
    return this.maxKey(tally);
  }

  private dominantPlanet(planets: NatalChartData['planets']): string {
    let best = planets[0].name;
    let bestScore = -Infinity;
    for (const p of planets) {
      const rulerBonus = SIGN_RULER[p.sign as Sign] === p.name ? 2 : 0;
      const angular = ANGULAR_HOUSE_DIGNITY[p.house] ?? 0;
      const score = PLANET_WEIGHT[p.name as Planet] + rulerBonus + angular;
      if (score > bestScore) {
        bestScore = score;
        best = p.name;
      }
    }
    return best;
  }

  private dailyScores(transits: TransitData['transits']): TransitData['dailyScores'] {
    const harmonic = transits.filter(
      (t) => ASPECT_NATURE[t.aspect] === 'harmonic',
    ).length;
    const challenging = transits.filter(
      (t) => ASPECT_NATURE[t.aspect] === 'challenging',
    ).length;
    const total = transits.length || 1;
    const clamp = (n: number) => Math.max(15, Math.min(95, Math.round(n)));
    return {
      harmony: clamp(50 + (harmonic - challenging) * 12),
      tension: clamp(35 + challenging * 12),
      energy: clamp(45 + transits.length * 6),
      focus: clamp(55 + (harmonic - challenging) * 8),
      creativity: clamp(50 + harmonic * 8),
    };
  }

  private maxKey(tally: Record<string, number>): string {
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
  }
}
