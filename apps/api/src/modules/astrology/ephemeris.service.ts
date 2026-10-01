import { BadRequestException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Origin, Horoscope } = require('circular-natal-horoscope-js');

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

/**
 * Thin wrapper around circular-natal-horoscope-js.
 * `Origin` auto-derives timezone + historical DST from lat/lon.
 * House system: Placidus. Zodiac: tropical. Labels are already English.
 */
@Injectable()
export class EphemerisService {
  /**
   * Zone offset (ms to add to a local wall-clock to get UTC) for a location on a
   * given day. Memoised per location+day: the offset only moves at DST
   * boundaries, and the N-day scans in best-days/forecast would otherwise pay
   * for an extra Origin construction on every iteration.
   */
  private readonly offsetCache = new Map<string, number>();

  computeChart(input: EphemerisInput): RawHoroscope {
    const { year, month, day } = this.parseDate(input.birthDate);
    const { hour, minute } = this.parseTime(input.birthTime);

    try {
      const origin = new Origin({
        year,
        month: month - 1, // library expects 0-indexed month
        date: day,
        hour,
        minute,
        latitude: input.latitude,
        longitude: input.longitude,
      });

      return new Horoscope({
        origin,
        houseSystem: 'placidus',
        zodiac: 'tropical',
        aspectPoints: ['bodies', 'angles'],
        aspectWithPoints: ['bodies', 'angles'],
        aspectTypes: ['major'],
        language: 'en',
      }) as RawHoroscope;
    } catch (err) {
      throw new BadRequestException(
        `Unable to compute chart: ${(err as Error).message}`,
      );
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
      throw new BadRequestException(
        `Unable to compute transits: ${(err as Error).message}`,
      );
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
      return new Horoscope({
        origin: this.originAtUtc(when, latitude, longitude),
        houseSystem: 'placidus',
        zodiac: 'tropical',
        aspectPoints: ['bodies', 'angles'],
        aspectWithPoints: ['bodies', 'angles'],
        aspectTypes: ['major'],
        language: 'en',
      }) as RawHoroscope;
    } catch (err) {
      throw new BadRequestException(
        `Unable to compute return chart: ${(err as Error).message}`,
      );
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
      throw new BadRequestException(
        `Unable to compute positions: ${(err as Error).message}`,
      );
    }
  }

  /**
   * The UTC instant of a local wall-clock time at a location ("2027-10-30",
   * 14:00 in Istanbul → 11:00Z), with the zone + DST the library derives.
   */
  utcForLocal(
    dateISO: string,
    hour: number,
    minute: number,
    latitude: number,
    longitude: number,
  ): Date {
    const { year, month, day } = this.parseDate(dateISO);
    const wall = new Date(Date.UTC(year, month - 1, day, hour, minute));
    return new Date(wall.getTime() + this.zoneOffsetMs(wall, latitude, longitude));
  }

  /** Local wall-clock "HH:mm" at a location for a UTC instant. */
  localClock(when: Date, latitude: number, longitude: number): string {
    const wall = new Date(when.getTime() - this.zoneOffsetMs(when, latitude, longitude));
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
   * `Origin` reads its date/time fields as LOCAL time at the supplied lat/lon —
   * it derives the zone and historical DST itself. So a UTC instant has to be
   * converted to that local wall-clock before construction. Passing UTC fields
   * straight through offsets the chart by the zone offset, which merely nudges
   * planet longitudes but rotates the house cusps by 15 deg per hour.
   */
  private originAtUtc(when: Date, latitude: number, longitude: number) {
    const local = new Date(
      when.getTime() - this.zoneOffsetMs(when, latitude, longitude),
    );
    return this.buildOrigin(local, latitude, longitude);
  }

  private zoneOffsetMs(when: Date, latitude: number, longitude: number): number {
    const key = `${latitude.toFixed(4)}|${longitude.toFixed(4)}|${when
      .toISOString()
      .slice(0, 10)}`;
    const hit = this.offsetCache.get(key);
    if (hit !== undefined) return hit;

    // Probe: interpret the UTC wall-clock as if it were local, then read back
    // which UTC the library thinks that is. The difference is the zone offset.
    const probe = this.buildOrigin(when, latitude, longitude);
    const offset = Date.parse(probe.utcTimeFormatted) - when.getTime();
    this.offsetCache.set(key, offset);
    return offset;
  }

  /** Construct an Origin from a Date whose UTC accessors carry local wall-clock. */
  private buildOrigin(local: Date, latitude: number, longitude: number) {
    return new Origin({
      year: local.getUTCFullYear(),
      month: local.getUTCMonth(),
      date: local.getUTCDate(),
      hour: local.getUTCHours(),
      minute: local.getUTCMinutes(),
      latitude,
      longitude,
    });
  }

  private normalizeSigned(deg: number): number {
    return ((((deg + 180) % 360) + 360) % 360) - 180;
  }

  private parseDate(s: string): { year: number; month: number; day: number } {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw new BadRequestException(`Invalid birthDate: ${s}`);
    return { year: +m[1], month: +m[2], day: +m[3] };
  }

  private parseTime(s: string): { hour: number; minute: number } {
    const m = /^(\d{2}):(\d{2})$/.exec(s);
    if (!m) throw new BadRequestException(`Invalid birthTime: ${s}`);
    return { hour: +m[1], minute: +m[2] };
  }
}
