import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { safeError } from '../../common/logging/safe-error';
import { fillMissingHouses } from './house-fill';
import { utcFromWall, wallFromUtc } from './time-zone';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Origin, Horoscope } = require('circular-natal-horoscope-js');
// The maintained fork: the original tz-lookup's zone borders stopped in 2020
// (it put Ciudad Juárez, split off in 2022, in Ojinaga's zone).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tzlookup: (latitude: number, longitude: number) => string = require('@photostructure/tz-lookup');

export interface EphemerisInput {
  birthDate: string; // "YYYY-MM-DD"
  birthTime: string; // "HH:mm"
  latitude: number;
  longitude: number;
}

/** Minimal shape of a celestial body / angle from circular-natal-horoscope-js. */
export interface RawPoint {
  label: string;
  Sign: { label: string };
  ChartPosition: { Ecliptic: { DecimalDegrees: number } };
  House?: { id: number };
  isRetrograde?: boolean;
}

export interface RawAspect {
  point1Label: string;
  point2Label: string;
  label: string; // capitalized aspect name, e.g. "Trine"
  orb: number;
}

export interface RawHoroscope {
  CelestialBodies: { all: RawPoint[]; [key: string]: RawPoint | RawPoint[] };
  CelestialPoints: {
    all: RawPoint[];
    northnode: RawPoint;
    southnode: RawPoint;
    lilith: RawPoint;
  };
  Houses: Array<{
    id: number;
    Sign: { label: string };
    ChartPosition: { StartPosition: { Ecliptic: { DecimalDegrees: number } } };
  }>;
  Ascendant: RawPoint;
  Midheaven: RawPoint;
  Aspects: { all: RawAspect[] };
}

/** Mean motion of the Sun in degrees per day — the step size for the return solve. */
const SUN_DEG_PER_DAY = 0.9856473;

/** Sidereal time advances 360° per sidereal day (86 164.0905 s). */
const SIDEREAL_DEG_PER_SECOND = 360 / 86_164.0905;

/**
 * Thin wrapper around circular-natal-horoscope-js.
 * House system: Placidus. Zodiac: tropical. Labels are already English.
 *
 * Time zones: the library derives zone + DST from lat/lon with tz data frozen
 * in 2019. We resolve every local time to UTC ourselves (@photostructure/tz-lookup for the
 * zone, the runtime's ICU database for the offset — see time-zone.ts) and
 * only hand the library a wall clock that it maps back to that exact instant.
 */
@Injectable()
export class EphemerisService {
  private readonly logger = new Logger(EphemerisService.name);

  /** IANA zone per location; coordinates never move between calls. */
  private readonly zoneCache = new Map<string, string>();

  computeChart(input: EphemerisInput): RawHoroscope {
    const { year, month, day } = this.parseDate(input.birthDate);
    const { hour, minute } = this.parseTime(input.birthTime);

    try {
      const zone = this.zoneAt(input.latitude, input.longitude);
      const when = new Date(utcFromWall(zone, Date.UTC(year, month - 1, day, hour, minute)));
      const origin = this.originAtUtc(when, input.latitude, input.longitude);

      return fillMissingHouses(
        new Horoscope({
          origin,
          houseSystem: 'placidus',
          zodiac: 'tropical',
          aspectPoints: ['bodies', 'angles'],
          aspectWithPoints: ['bodies', 'angles'],
          aspectTypes: ['major'],
          language: 'en',
        }) as RawHoroscope,
      );
    } catch (err) {
      // The library's message stays in the log; the client gets a generic one.
      this.logger.warn(`compute chart failed: ${safeError(err)}`);
      throw new BadRequestException('Unable to compute chart for these inputs');
    }
  }

  /** A chart cast for the current instant at the same location — used for transits. */
  computeNow(latitude: number, longitude: number): RawHoroscope {
    return this.computeAt(new Date(), latitude, longitude);
  }

  /**
   * A chart cast for an explicit UTC instant at the given location. Used for
   * transits and — by differencing two instants a day apart — for estimating
   * each planet's current daily motion (speed) to derive transit durations.
   */
  computeAt(when: Date, latitude: number, longitude: number): RawHoroscope {
    try {
      return new Horoscope({
        origin: this.originAtUtc(when, latitude, longitude),
        houseSystem: 'placidus',
        zodiac: 'tropical',
        aspectPoints: ['bodies'],
        aspectWithPoints: ['bodies'],
        aspectTypes: ['major'],
        language: 'en',
      }) as RawHoroscope;
    } catch (err) {
      // The library's message stays in the log; the client gets a generic one.
      this.logger.warn(`compute transits failed: ${safeError(err)}`);
      throw new BadRequestException('Unable to compute transits for these inputs');
    }
  }

  /**
   * A full chart — angles and houses included — cast for an explicit UTC
   * instant. This is what a return chart needs: `computeAt` leaves the angles
   * out because transit work only reads planet longitudes.
   */
  computeChartAtUtc(
    when: Date,
    latitude: number,
    longitude: number,
  ): RawHoroscope {
    try {
      return fillMissingHouses(
        new Horoscope({
          origin: this.originAtUtc(when, latitude, longitude),
          houseSystem: 'placidus',
          zodiac: 'tropical',
          aspectPoints: ['bodies', 'angles'],
          aspectWithPoints: ['bodies', 'angles'],
          aspectTypes: ['major'],
          language: 'en',
        }) as RawHoroscope,
      );
    } catch (err) {
      // The library's message stays in the log; the client gets a generic one.
      this.logger.warn(`compute return chart failed: ${safeError(err)}`);
      throw new BadRequestException('Unable to compute return chart for these inputs');
    }
  }

  /**
   * Planet and node positions (with retrograde flags) at a UTC instant, no
   * aspect pass — ~40% cheaper than `computeAt`. For long day-by-day scans
   * (electional search) that only read longitudes.
   */
  bodiesAtUtc(when: Date, latitude: number, longitude: number): RawHoroscope {
    try {
      return new Horoscope({
        origin: this.originAtUtc(when, latitude, longitude),
        houseSystem: 'placidus',
        zodiac: 'tropical',
        aspectPoints: [],
        aspectWithPoints: [],
        aspectTypes: [],
        language: 'en',
      }) as RawHoroscope;
    } catch (err) {
      // The library's message stays in the log; the client gets a generic one.
      this.logger.warn(`compute positions failed: ${safeError(err)}`);
      throw new BadRequestException('Unable to compute positions for these inputs');
    }
  }

  /**
   * The UTC instant of a local wall-clock time at a location ("2027-10-30",
   * 14:00 in Istanbul → 11:00Z), with the location's zone and historical DST.
   */
  utcForLocal(
    dateISO: string,
    hour: number,
    minute: number,
    latitude: number,
    longitude: number,
  ): Date {
    const { year, month, day } = this.parseDate(dateISO);
    const zone = this.zoneAt(latitude, longitude);
    return new Date(utcFromWall(zone, Date.UTC(year, month - 1, day, hour, minute)));
  }

  /** Local wall-clock "HH:mm" at a location for a UTC instant. */
  localClock(when: Date, latitude: number, longitude: number): string {
    const wall = new Date(wallFromUtc(this.zoneAt(latitude, longitude), when.getTime()));
    return `${String(wall.getUTCHours()).padStart(2, '0')}:${String(wall.getUTCMinutes()).padStart(2, '0')}`;
  }

  /** The Sun's ecliptic longitude at a UTC instant. Cheap: no aspects, no angles. */
  sunLongitudeAtUtc(when: Date, latitude: number, longitude: number): number {
    const h = new Horoscope({
      origin: this.originAtUtc(when, latitude, longitude),
      houseSystem: 'placidus',
      zodiac: 'tropical',
      aspectPoints: [],
      aspectWithPoints: [],
      aspectTypes: [],
      language: 'en',
    }) as RawHoroscope;
    return (h.CelestialBodies.sun as RawPoint).ChartPosition.Ecliptic
      .DecimalDegrees;
  }

  /**
   * Solve for the UTC instant at which the Sun sits exactly on
   * `targetLongitude` near `seed` — the solar return moment.
   *
   * Newton-style: solar motion is near-uniform, so stepping by
   * `angularError / meanMotion` converges in about three iterations. The
   * library quantises longitudes at roughly 1e-4 deg, which bounds the
   * achievable residual; the 5e-4 deg cutoff is ~45 seconds of time, well
   * inside the precision the rest of the chart is built on.
   */
  solveSolarReturn(
    targetLongitude: number,
    seed: Date,
    latitude: number,
    longitude: number,
  ): Date {
    let t = seed;
    for (let i = 0; i < 25; i++) {
      const delta = this.normalizeSigned(
        targetLongitude - this.sunLongitudeAtUtc(t, latitude, longitude),
      );
      if (Math.abs(delta) < 5e-4) break;
      t = new Date(t.getTime() + (delta / SUN_DEG_PER_DAY) * 86400000);
    }
    return t;
  }

  /**
   * An `Origin` for an exact UTC instant. `Origin` reads its fields as LOCAL
   * time and converts with its own (2019) tz data, so we hand it the wall
   * clock it maps back to `when`: start from the true local time and correct
   * by whatever the library's conversion is off by. Where both databases
   * agree (nearly always) the first guess is exact.
   */
  private originAtUtc(when: Date, latitude: number, longitude: number) {
    const target = Math.floor(when.getTime() / 1000) * 1000;
    // The library keeps whole minutes only: aim at the nearest whole minute.
    const targetMinute = Math.round(target / 60_000) * 60_000;
    let wall = wallFromUtc(this.zoneAt(latitude, longitude), targetMinute);
    let best = this.buildOrigin(wall, latitude, longitude);
    let missMinute = Date.parse(best.utcTimeFormatted) - targetMinute;
    // Off by whole hours only where the library's 2019 tz data disagrees.
    for (let i = 0; i < 2 && missMinute !== 0; i++) {
      const nextWall = wall - missMinute;
      const next = this.buildOrigin(nextWall, latitude, longitude);
      const nextMiss = Date.parse(next.utcTimeFormatted) - targetMinute;
      if (Math.abs(nextMiss) >= Math.abs(missMinute)) break;
      wall = nextWall;
      best = next;
      missMinute = nextMiss;
    }
    const miss = Date.parse(best.utcTimeFormatted) - target;
    if (Math.abs(miss) >= 60_000) {
      // Only inside an hour the library's old tz data repeats (clocks going
      // back) can an instant have no wall clock that maps onto it.
      this.logger.warn(`origin off by ${miss / 60_000} min at ${when.toISOString()}`);
      return best;
    }
    if (miss !== 0) {
      // The library works in whole minutes and drops seconds. Planets barely
      // move in < 1 min (the Moon ~0.5′), but the angles turn 15′ per minute:
      // carry the leftover seconds as the equivalent turn of sidereal time,
      // i.e. a matching shift east in the longitude the houses are cast from.
      let lon = longitude - (miss / 1000) * SIDEREAL_DEG_PER_SECOND;
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;
      try {
        const shifted = this.buildOrigin(wall, latitude, lon);
        // Across the date line the shifted longitude may fall in another zone;
        // keep the shift only if the library still reads the same instant.
        if (Date.parse(shifted.utcTimeFormatted) === Date.parse(best.utcTimeFormatted)) return shifted;
      } catch {
        // The unshifted origin is still right to within the minute.
      }
    }
    return best;
  }

  private zoneAt(latitude: number, longitude: number): string {
    const key = `${latitude}|${longitude}`;
    let zone = this.zoneCache.get(key);
    if (!zone) {
      zone = tzlookup(latitude, longitude);
      this.zoneCache.set(key, zone);
    }
    return zone;
  }

  /** Construct an Origin from wall ms (UTC fields carry the local wall clock). */
  private buildOrigin(wallMs: number, latitude: number, longitude: number) {
    const local = new Date(wallMs);
    return new Origin({
      year: local.getUTCFullYear(),
      month: local.getUTCMonth(),
      date: local.getUTCDate(),
      hour: local.getUTCHours(),
      minute: local.getUTCMinutes(),
      second: local.getUTCSeconds(),
      latitude,
      longitude,
    });
  }

  private normalizeSigned(deg: number): number {
    return ((((deg + 180) % 360) + 360) % 360) - 180;
  }

  private parseDate(s: string): { year: number; month: number; day: number } {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw new BadRequestException('Invalid date (expected YYYY-MM-DD)');
    return { year: +m[1], month: +m[2], day: +m[3] };
  }

  private parseTime(s: string): { hour: number; minute: number } {
    const m = /^(\d{2}):(\d{2})$/.exec(s);
    if (!m) throw new BadRequestException('Invalid time (expected HH:mm)');
    return { hour: +m[1], minute: +m[2] };
  }
}
