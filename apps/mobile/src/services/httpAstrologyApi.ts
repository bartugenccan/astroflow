import {
  AspectInterpretation,
  BigThreeReading,
  BirthProfileResponse,
  ChartContext,
  ChartOverview,
  CreateBirthProfileDto,
  DailyInsight,
  HouseInterpretation,
  NatalChartData,
  NodeAnalysis,
  PlacementInterpretation,
  TransitData,
} from "./types";
import type { AstrologyApi } from "./astrologyApi";
import { Locale } from "../i18n";
import { API_URL } from "./config";
import { getDeviceId } from "./deviceId";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function post<T>(
  path: string,
  dto: CreateBirthProfileDto,
  locale?: Locale,
  extraQuery?: Record<string, string | number>,
): Promise<T> {
  const deviceId = await getDeviceId();
  const params = new URLSearchParams();
  if (locale) params.set("locale", locale);
  if (extraQuery) {
    for (const [k, v] of Object.entries(extraQuery)) params.set(k, String(v));
  }
  const qs = params.toString();
  const url = `${API_URL}/api/v1/astrology/${path}${qs ? `?${qs}` : ""}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
      },
      body: JSON.stringify(dto),
    });
  } catch (err) {
    throw new ApiError(`Network error: ${(err as Error).message}`, 0);
  }
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

/** HTTP implementation of AstrologyApi against the NestJS backend. */
export const httpAstrologyApi: AstrologyApi = {
  getNatalChart: (dto) => post<NatalChartData>("natal", dto),

  getTransits: (dto) => post<TransitData>("transits", dto),

  getDailyInsight: (dto, locale) => post<DailyInsight>("insight", dto, locale),

  async saveBirthProfile(dto) {
    // POST /natal computes and persists the chart for this device.
    const chart = await post<NatalChartData>("natal", dto);
    return {
      birthDate: dto.birthDate,
      birthTime: dto.birthTime,
      latitude: dto.latitude,
      longitude: dto.longitude,
      sunSign: chart.summary.sunSign,
      moonSign: chart.summary.moonSign,
      risingSign: chart.summary.risingSign,
      risingDegree: chart.angles.ascendant.degree,
      dominantElement: chart.summary.dominantElement,
      dominantPlanet: chart.summary.dominantPlanet,
    };
  },

  getPlacementInterpretations: (dto, locale) =>
    post<PlacementInterpretation[]>("interpretation/placements", dto, locale),

  getBigThree: (dto, locale) =>
    post<BigThreeReading>("interpretation/big-three", dto, locale),

  getAspectInterpretations: (dto, locale) =>
    post<AspectInterpretation[]>("interpretation/aspects", dto, locale),

  getChartOverview: (dto, locale) =>
    post<ChartOverview>("interpretation/overview", dto, locale),

  getHouseInterpretation: (dto, house, locale) =>
    post<HouseInterpretation>("interpretation/house", dto, locale, { house }),

  getNodes: (dto, locale) =>
    post<NodeAnalysis>("interpretation/nodes", dto, locale),

  getChartContext: (dto, locale) =>
    post<ChartContext>("interpretation/chart-context", dto, locale),
};
