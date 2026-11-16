import { Injectable } from '@nestjs/common';
import type { NatalChartData } from '../astrology-adapter.service';
import * as Eph from './sky-ephemeris';
import { detectMoments, momentStatus, natalInputFromChart, type SkyData, type SkyMoment } from './sky-moments';
import { chironLongitudeAt, decodeChironTable, type ChironTable } from './chiron';
import {
  CHIRON_PACKED,
  CHIRON_SAMPLES,
  CHIRON_SCALE,
  CHIRON_START_UTC,
  CHIRON_STEP_DAYS,
} from './chiron-table';

const DAY = 86_400_000;
const YEAR = 365 * DAY;

export type SkyMomentWithStatus = SkyMoment & { status: 'upcoming' | 'active' | 'past' };

export interface MomentsInput {
  chart: NatalChartData;
  birthDate: string;
  /** Local birth time "HH:mm" ('12:00' when unknown). */
  birthTime: string;
  unknownTime: boolean;
  fromDay: string;
  toDay: string;
  nowMs?: number;
}

let chironTable: ChironTable | null = null;

/** The JPL Chiron table, decoded once on first use (~10 ms). */
export function chironTableOnce(): ChironTable {
  chironTable ??= decodeChironTable({
    startUtc: CHIRON_START_UTC,
    stepDays: CHIRON_STEP_DAYS,
    samples: CHIRON_SAMPLES,
    scale: CHIRON_SCALE,
    packed: CHIRON_PACKED,
  });
  return chironTable;
}

/**
 * Computes key sky moments for one chart. The sky part (slow-planet series,
 * stations, eclipses, lunations, Chiron) is the same for everyone and is cached
 * per range, so the plan endpoint and the daily insight share one computation
 * a day (~0.6 s cold, a few ms after). Progressions are per person (~1 ms).
 */
@Injectable()
export class SkyMomentsEngine {
  private readonly cache = new Map<string, SkyData>();

  /** The default window: a month back (still-active moments) to a year ahead. */
  static defaultRange(today: string): { fromDay: string; toDay: string } {
    return { fromDay: addDays(today, -30), toDay: addDays(today, 365) };
  }

  moments(input: MomentsInput): SkyMomentWithStatus[] {
    const fromMs = Date.parse(`${input.fromDay}T00:00:00Z`);
    const toMs = Date.parse(`${input.toDay}T23:59:59Z`);
    // Age only needs the day, so the local birth time read as UTC is close enough.
    const birthMs = Date.parse(`${input.birthDate}T${input.birthTime || '12:00'}:00Z`);
    const natal = natalInputFromChart(input.chart, birthMs, input.unknownTime);
    const moon = natal.points.find((p) => p.id === 'Moon');
    if (moon) natal.birthUtcMs = Eph.birthInstantFromMoon(moon.longitude, birthMs);
    const chiron = chironLongitudeAt(chironTableOnce(), natal.birthUtcMs ?? birthMs);
    if (Number.isFinite(chiron)) natal.chiron = chiron;
    const nowMs = input.nowMs ?? Date.now();
    return detectMoments(natal, this.skyData(input.fromDay, input.toDay, fromMs, toMs), Eph, { fromMs, toMs }).map(
      (m) => ({ ...m, status: momentStatus(m, nowMs) }),
    );
  }

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
    const table = chironTableOnce();
    const chironFn = (ms: number) => chironLongitudeAt(table, ms);
    const data: SkyData = {
      series,
      node: Eph.sampleFunction(Eph.meanNorthNodeAt, scanStart, scanEnd),
      chiron: Number.isFinite(chironFn(scanStart)) && Number.isFinite(chironFn(scanEnd))
        ? Eph.sampleFunction(chironFn, scanStart, scanEnd)
        : undefined,
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

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
