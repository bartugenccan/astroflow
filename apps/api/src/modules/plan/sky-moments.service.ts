import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { localToday } from '../../common/context/request-context';
import { DeviceSkyService } from './device-sky.service';
import { SkyMomentsEngine, type SkyMomentWithStatus } from '../astrology/sky/sky-moments.engine';

const DAY = 86_400_000;
const MAX_RANGE_DAYS = 3 * 366;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface SkyMomentsPayload {
  from: string;
  to: string;
  unknownTime: boolean;
  moments: SkyMomentWithStatus[];
}

/**
 * The user's key sky moments (returns, stations on natal points, eclipses on
 * the chart, slow transits, double-retrograde notes), ranked, from the chart
 * stored at onboarding. No AI, no storage; the computation lives in
 * SkyMomentsEngine (astrology module) so the daily insight can share it.
 */
@Injectable()
export class SkyMomentsService {
  constructor(
    private readonly sky: DeviceSkyService,
    private readonly engine: SkyMomentsEngine,
  ) {}

  async forDevice(deviceId: string, from?: string, to?: string): Promise<SkyMomentsPayload> {
    const range = SkyMomentsEngine.defaultRange(localToday());
    const fromDay = from ?? range.fromDay;
    const toDay = to ?? range.toDay;
    for (const d of [fromDay, toDay]) {
      if (!ISO_DAY.test(d) || Number.isNaN(Date.parse(d))) throw new BadRequestException('Dates must be YYYY-MM-DD');
    }
    const fromMs = Date.parse(`${fromDay}T00:00:00Z`);
    const toMs = Date.parse(`${toDay}T23:59:59Z`);
    if (toMs < fromMs) throw new BadRequestException('`to` must not be before `from`');
    if ((toMs - fromMs) / DAY > MAX_RANGE_DAYS) throw new BadRequestException('Range is limited to 3 years');

    const [birth, natal] = await Promise.all([this.sky.birth(deviceId), this.sky.natal(deviceId)]);
    if (!birth || !natal) throw new NotFoundException('No chart for this device yet');

    const moments = this.engine.moments({
      chart: natal.chart,
      birthDate: birth.birthDate,
      birthTime: birth.birthTime,
      unknownTime: natal.unknownTime,
      fromDay,
      toDay,
    });
    return { from: fromDay, to: toDay, unknownTime: natal.unknownTime, moments };
  }
}
