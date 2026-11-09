import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AstrologyAdapterService,
  BestDaysResponse,
  NatalChartData,
  TransitReport,
} from '../astrology/astrology-adapter.service';
import type { PlanTransit } from './plan-rules';

export interface DeviceBirth {
  birthDate: string;
  /** '12:00' when the birth time is unknown, as everywhere else. */
  birthTime: string;
  latitude: number;
  longitude: number;
  sunSign: string;
  risingSign: string;
  unknownTime: boolean;
}

/**
 * The subject's own sky, from the chart stored at onboarding (DeviceChart):
 * today's transits to the natal chart and the life-area scores. Everything
 * personal (plan, journeys, power days) reads the sky through here, so the
 * server never needs the birth data re-sent.
 */
@Injectable()
export class DeviceSkyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: AstrologyAdapterService,
  ) {}

  async birth(deviceId: string): Promise<DeviceBirth | null> {
    const c = await this.prisma.deviceChart.findUnique({ where: { deviceId } });
    if (!c) return null;
    return {
      birthDate: c.birthDate,
      birthTime: c.unknownTime ? '12:00' : c.birthTime,
      latitude: c.latitude,
      longitude: c.longitude,
      sunSign: c.sunSign,
      risingSign: c.risingSign,
      unknownTime: c.unknownTime,
    };
  }

  async requireBirth(deviceId: string): Promise<DeviceBirth> {
    const b = await this.birth(deviceId);
    if (!b) throw new NotFoundException('No chart for this device yet');
    return b;
  }

  /** The natal chart computed at onboarding (houses, rulers, planets per house). */
  async natal(deviceId: string): Promise<{ chart: NatalChartData; unknownTime: boolean } | null> {
    const c = await this.prisma.deviceChart.findUnique({
      where: { deviceId },
      select: { chartData: true, unknownTime: true },
    });
    return c ? { chart: c.chartData as unknown as NatalChartData, unknownTime: c.unknownTime } : null;
  }

  report(b: DeviceBirth): TransitReport {
    return this.adapter.getTransitReport(b.birthDate, b.birthTime, b.latitude, b.longitude);
  }

  bestDays(b: DeviceBirth, days: number, start: string): BestDaysResponse {
    return this.adapter.getBestDays(b.birthDate, b.birthTime, b.latitude, b.longitude, days, start);
  }

  /** Every transit-to-natal aspect in the report, flat and tightest first. */
  static transits(report: TransitReport): PlanTransit[] {
    return report.movements
      .flatMap((m) =>
        m.aspects.map((a) => ({
          transitPlanet: m.planet,
          transitSign: m.sign,
          natalPlanet: a.natalPlanet,
          aspect: a.aspect,
          nature: a.nature,
          orb: a.orb,
        })),
      )
      .sort((a, b) => a.orb - b.orb);
  }

  /** Where the transiting Moon sits in the natal houses today. */
  static moon(report: TransitReport): { sign: string; natalHouse: number } | null {
    const m = report.movements.find((x) => x.planet === 'Moon');
    return m ? { sign: m.sign, natalHouse: m.natalHouse } : null;
  }
}
