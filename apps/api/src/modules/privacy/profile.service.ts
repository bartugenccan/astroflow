import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface ChartSummary {
  angles?: { ascendant?: { degree?: number } };
  summary?: { dominantElement?: string; dominantPlanet?: string };
}

export interface SavedProfile {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  unknownTime: boolean;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  risingDegree: number;
  dominantElement: string;
  dominantPlanet: string;
  displayName: string | null;
  placeName: string | null;
}

/**
 * The subject's saved birth profile. The chart itself is written by
 * POST /astrology/natal; this adds the display fields the app used to keep
 * only on the phone, so a sign-in on a new phone restores everything.
 */
@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /** Same shape the app builds after POST /astrology/natal, plus display fields. */
  async get(deviceId: string): Promise<SavedProfile | null> {
    const c = await this.prisma.deviceChart.findUnique({ where: { deviceId } });
    if (!c) return null;
    const chart = (c.chartData ?? {}) as ChartSummary;
    return {
      birthDate: c.birthDate,
      birthTime: c.birthTime,
      latitude: c.latitude,
      longitude: c.longitude,
      unknownTime: c.unknownTime,
      sunSign: c.sunSign,
      moonSign: c.moonSign,
      risingSign: c.risingSign,
      risingDegree: chart.angles?.ascendant?.degree ?? 0,
      dominantElement: chart.summary?.dominantElement ?? '',
      dominantPlanet: chart.summary?.dominantPlanet ?? '',
      displayName: c.displayName,
      placeName: c.placeName,
    };
  }

  /** No-op until the chart exists (it's created during onboarding, before this is called). */
  async saveMeta(deviceId: string, meta: { displayName?: string; placeName?: string }): Promise<void> {
    const data = {
      ...(meta.displayName !== undefined ? { displayName: meta.displayName.trim() || null } : {}),
      ...(meta.placeName !== undefined ? { placeName: meta.placeName.trim() || null } : {}),
    };
    if (Object.keys(data).length) await this.prisma.deviceChart.updateMany({ where: { deviceId }, data });
  }
}
