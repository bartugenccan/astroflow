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
import { Locale } from "../i18n";
import { generateNatalChart } from "./mock/natalChart";
import { generateTransits } from "./mock/transits";
import { insightFromChart } from "./mock/insight";
import {
  mockPlacements,
  mockBigThree,
  mockAspects,
  mockOverview,
  mockHouse,
  mockNodes,
  mockChartContext,
} from "./mock/interpretations";
import { delay } from "./delay";
import { httpAstrologyApi } from "./httpAstrologyApi";
import { USE_HTTP } from "./config";

/**
 * The astrology data surface. The app depends only on this interface, so the
 * mock and the real HTTP client are interchangeable (see the export below).
 */
export interface AstrologyApi {
  getNatalChart(dto: CreateBirthProfileDto): Promise<NatalChartData>;
  getTransits(dto: CreateBirthProfileDto): Promise<TransitData>;
  getDailyInsight(dto: CreateBirthProfileDto, locale: Locale): Promise<DailyInsight>;
  saveBirthProfile(dto: CreateBirthProfileDto): Promise<BirthProfileResponse>;

  getPlacementInterpretations(
    dto: CreateBirthProfileDto,
    locale: Locale,
  ): Promise<PlacementInterpretation[]>;
  getBigThree(dto: CreateBirthProfileDto, locale: Locale): Promise<BigThreeReading>;
  getAspectInterpretations(
    dto: CreateBirthProfileDto,
    locale: Locale,
  ): Promise<AspectInterpretation[]>;
  getChartOverview(dto: CreateBirthProfileDto, locale: Locale): Promise<ChartOverview>;
  getHouseInterpretation(
    dto: CreateBirthProfileDto,
    house: number,
    locale: Locale,
  ): Promise<HouseInterpretation>;
  getNodes(dto: CreateBirthProfileDto, locale: Locale): Promise<NodeAnalysis>;
  getChartContext(dto: CreateBirthProfileDto, locale: Locale): Promise<ChartContext>;
}

const mockAstrologyApi: AstrologyApi = {
  async getNatalChart(dto) {
    await delay();
    return generateNatalChart(dto);
  },

  async getTransits(dto) {
    await delay();
    const chart = generateNatalChart(dto);
    return generateTransits(dto, chart);
  },

  async getDailyInsight(dto, locale) {
    await delay();
    const chart = generateNatalChart(dto);
    return insightFromChart(chart, locale);
  },

  async saveBirthProfile(dto) {
    await delay();
    const chart = generateNatalChart(dto);
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

  async getPlacementInterpretations(dto, locale) {
    await delay();
    return mockPlacements(generateNatalChart(dto), locale);
  },

  async getBigThree(dto, locale) {
    await delay();
    return mockBigThree(generateNatalChart(dto), locale);
  },

  async getAspectInterpretations(dto, locale) {
    await delay();
    return mockAspects(generateNatalChart(dto), locale);
  },

  async getChartOverview(dto, locale) {
    await delay();
    return mockOverview(generateNatalChart(dto), locale);
  },

  async getHouseInterpretation(dto, house, locale) {
    await delay();
    return mockHouse(generateNatalChart(dto), house, locale);
  },

  async getNodes(dto, locale) {
    await delay();
    return mockNodes(generateNatalChart(dto), locale);
  },

  async getChartContext(dto, locale) {
    await delay();
    return mockChartContext(generateNatalChart(dto), locale);
  },
};

/** Real backend when EXPO_PUBLIC_API_URL is set, otherwise local mock data. */
export const astrologyApi: AstrologyApi = USE_HTTP ? httpAstrologyApi : mockAstrologyApi;
