import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { localToday } from '../../common/context/request-context';
import { DeviceSkyService } from './device-sky.service';
import * as Eph from '../astrology/sky/sky-ephemeris';
import {
  detectMoments,
  momentStatus,
  natalInputFromChart,
  type SkyData,
  type SkyMoment,
} from '../astrology/sky/sky-moments';

const DAY = 86_400_000;
const YEAR = 365 * DAY;
const MAX_RANGE_DAYS = 3 * 366;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface SkyMomentsPayload {
  from: string;
  to: string;
  unknownTime: boolean;
  moments: (SkyMoment & { status: 'upcoming' | 'active' | 'past' })[];
}

/**
 * The user's key sky moments (returns, stations on natal points, eclipses on
 * the chart, slow transits, double-retrograde notes), ranked. No AI, no
 * storage: the sky is the same for everyone and is computed once per range
 * and kept in memory; only the natal points differ.
 */
@Injectable()
export class SkyMomentsService {
  private readonly cache = new Map<string, SkyData>();

  constructor(private readonly sky: DeviceSkyService) {}

  async forDevice(deviceId: string, from?: string, to?: string): Promise<SkyMomentsPayload> {
    const today = localToday();
    const fromDay = from ?? addDays(today, -30);
    const toDay = to ?? addDays(today, 365);
    for (const d of [fromDay, toDay]) {
      if (!ISO_DAY.test(d) || Number.isNaN(Date.parse(d))) throw new BadRequestException('Dates must be YYYY-MM-DD');
    }
    const fromMs = Date.parse(`${fromDay}T00:00:00Z`);
    const toMs = Date.parse(`${toDay}T23:59:59Z`);
    if (toMs < fromMs) throw new BadRequestException('`to` must not be before `from`');
    if ((toMs - fromMs) / DAY > MAX_RANGE_DAYS) throw new BadRequestException('Range is limited to 3 years');

    const [birth, natal] = await Promise.all([this.sky.birth(deviceId), this.sky.natal(deviceId)]);
    if (!birth || !natal) throw new NotFoundException('No chart for this device yet');

    // Age only needs the day, so the local birth time read as UTC is close enough.
    const birthMs = Date.parse(`${birth.birthDate}T${birth.birthTime || '12:00'}:00Z`);
    const input = natalInputFromChart(natal.chart, birthMs, natal.unknownTime);
    const data = this.skyData(fromDay, toDay, fromMs, toMs);
    const nowMs = Date.now();
    const moments = detectMoments(input, data, Eph, { fromMs, toMs }).map((m) => ({
      ...m,
      status: momentStatus(m, nowMs),
    }));
    return { from: fromDay, to: toDay, unknownTime: natal.unknownTime, moments };
  }

  /** Person-independent sky for a range; a handful of ranges cover every user on a given day. */
  private skyData(fromDay: string, toDay: string, fromMs: number, toMs: number): SkyData {
    const key = `${fromDay}|${toDay}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    // Slow cycles need context on both sides: a Saturn season lasts ~3 years.
    const scanStart = fromMs - 3 * YEAR;
    const scanEnd = toMs + 3 * YEAR;
    const series: SkyData['series'] = {};
    for (const body of ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const) {
      series[body] = Eph.sampleLongitudes(body, scanStart, scanEnd);
    }
    const data: SkyData = {
      series,
      node: Eph.sampleFunction(Eph.meanNorthNodeAt, scanStart, scanEnd),
      // Stations a little outside the range pair up into retrograde periods that overlap it.
      stations: Eph.findStations(fromMs - 200 * DAY, toMs + 200 * DAY),
      // An eclipse stays active ~6 months after it happens.
      eclipses: Eph.findEclipses(fromMs - 200 * DAY, toMs + 40 * DAY),
      lunations: Eph.findLunations(fromMs - 5 * DAY, toMs + 5 * DAY),
    };
    if (this.cache.size >= 8) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, data);
    return data;
  }
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
