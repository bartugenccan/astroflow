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

/**
 * Thin wrapper around circular-natal-horoscope-js.
 * `Origin` auto-derives timezone + historical DST from lat/lon.
 * House system: Placidus. Zodiac: tropical. Labels are already English.
 */
@Injectable()
export class EphemerisService {
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
   * A chart cast for an explicit instant at the given location. Used for
   * transits and — by differencing two instants a day apart — for estimating
   * each planet's current daily motion (speed) to derive transit durations.
   */
  computeAt(when: Date, latitude: number, longitude: number): RawHoroscope {
    try {
      const origin = new Origin({
        year: when.getUTCFullYear(),
        month: when.getUTCMonth(),
        date: when.getUTCDate(),
        hour: when.getUTCHours(),
        minute: when.getUTCMinutes(),
        latitude,
        longitude,
      });
      return new Horoscope({
        origin,
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
