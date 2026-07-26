import {
  AspectInterpretation,
  BestDaysResponse,
  BigThreeReading,
  BirthProfileResponse,
  ChartContext,
  ChartOverview,
  ChatMessage,
  ChatReply,
  CheckInInput,
  CheckInResult,
  CompatibilityReading,
  CompatibilityScore,
  CreateBirthProfileDto,
  CreateIntentionInput,
  DailyInsight,
  Forecast,
  ForecastPeriod,
  GuidanceAnswer,
  GuidanceTopic,
  HouseInterpretation,
  Intention,
  IntentionCheckInHistory,
  IntentionSuggestion,
  NatalChartData,
  NodeAnalysis,
  PlacementInterpretation,
  SavedPerson,
  SavePersonInput,
  TransitData,
  TransitReport,
  TransitDetail,
  TransitOverview,
} from "./types";
import { Locale } from "../i18n";
import { generateNatalChart } from "./mock/natalChart";
import { generateTransits, generateTransitReport } from "./mock/transits";
import { insightFromChart } from "./mock/insight";
import {
  mockPlacements,
  mockBigThree,
  mockAspects,
  mockOverview,
  mockHouse,
  mockNodes,
  mockChartContext,
  mockTransitDetail,
  mockTransitOverview,
} from "./mock/interpretations";
import { mockBestDays, mockForecast } from "./mock/forecast";
import { mockCompatibility, mockCompatibilityReading } from "./mock/compatibility";
import {
  mockGuidance,
  mockChatReply,
  mockIntentionSuggestions,
  mockAffirmation,
  mockCheckInReply,
} from "./mock/companion";
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

  getTransitReport(dto: CreateBirthProfileDto): Promise<TransitReport>;
  getTransitDetail(
    dto: CreateBirthProfileDto,
    planet: string,
    locale: Locale,
  ): Promise<TransitDetail>;
  getTransitOverview(
    dto: CreateBirthProfileDto,
    locale: Locale,
  ): Promise<TransitOverview>;

  // Best days + forecast
  getBestDays(
    dto: CreateBirthProfileDto,
    days: number,
    locale: Locale,
    start?: string,
  ): Promise<BestDaysResponse>;
  getForecast(
    dto: CreateBirthProfileDto,
    period: ForecastPeriod,
    locale: Locale,
    start?: string,
  ): Promise<Forecast>;

  // Compatibility / synastry
  getCompatibility(
    self: CreateBirthProfileDto,
    other: CreateBirthProfileDto,
  ): Promise<CompatibilityScore>;
  getCompatibilityReading(
    self: CreateBirthProfileDto,
    other: CreateBirthProfileDto,
    locale: Locale,
  ): Promise<CompatibilityReading>;
  savePerson(input: SavePersonInput): Promise<SavedPerson>;
  listPeople(): Promise<SavedPerson[]>;
  deletePerson(id: string): Promise<void>;

  // Entitlements (device-scoped; unlock is a STUB pending real IAP)
  unlockFeature(feature: string): Promise<void>;
  getEntitlements(): Promise<string[]>;

  // Companion
  getGuidance(
    dto: CreateBirthProfileDto,
    topic: GuidanceTopic,
    locale: Locale,
  ): Promise<GuidanceAnswer>;
  sendMessage(
    dto: CreateBirthProfileDto,
    message: string,
    locale: Locale,
  ): Promise<ChatReply>;
  getChatHistory(): Promise<ChatMessage[]>;

  // Intentions
  createIntention(
    dto: CreateBirthProfileDto,
    input: CreateIntentionInput,
    locale: Locale,
  ): Promise<Intention>;
  listIntentions(): Promise<Intention[]>;
  getIntention(id: string): Promise<Intention>;
  deleteIntention(id: string): Promise<void>;
  getIntentionSuggestions(
    dto: CreateBirthProfileDto,
    locale: Locale,
  ): Promise<IntentionSuggestion[]>;
  checkInIntention(
    id: string,
    input: CheckInInput,
    locale: Locale,
  ): Promise<CheckInResult>;
  getIntentionHistory(id: string): Promise<IntentionCheckInHistory[]>;
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

  async getTransitReport(dto) {
    await delay();
    return generateTransitReport(dto, generateNatalChart(dto));
  },

  async getTransitDetail(dto, planet, locale) {
    await delay();
    const report = generateTransitReport(dto, generateNatalChart(dto));
    const movement =
      report.movements.find((m) => m.planet === planet) ?? report.movements[0];
    return mockTransitDetail(movement, locale);
  },

  async getTransitOverview(dto, locale) {
    await delay();
    const report = generateTransitReport(dto, generateNatalChart(dto));
    return mockTransitOverview(report.date, locale);
  },

  async getBestDays(dto, days, locale, start) {
    await delay();
    return mockBestDays(dto, days, locale, start);
  },

  async getForecast(dto, period, locale, start) {
    await delay();
    return mockForecast(dto, period, locale, start);
  },

  async getCompatibility(self, other) {
    await delay();
    const score = mockCompatibility(self, other);
    const locked = !mockUnlocked.has("COMPATIBILITY");
    return {
      ...score,
      locked,
      topAspects: locked ? score.topAspects.slice(0, 2) : score.topAspects,
    };
  },

  async getCompatibilityReading(self, other, locale) {
    await delay();
    return mockCompatibilityReading(self, other, locale);
  },

  // In-memory saved-people store for the mock/offline path.
  async savePerson(input) {
    await delay();
    const now = new Date().toISOString();
    const chart = generateNatalChart({
      birthDate: input.birthDate,
      birthTime: input.unknownTime ? "12:00" : input.birthTime,
      latitude: input.latitude,
      longitude: input.longitude,
    });
    const person: SavedPerson = {
      id: `${Date.now()}`,
      label: input.label,
      relationship: input.relationship ?? null,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      latitude: input.latitude,
      longitude: input.longitude,
      unknownTime: input.unknownTime ?? false,
      placeName: input.placeName ?? null,
      sunSign: chart.summary.sunSign,
      moonSign: chart.summary.moonSign,
      risingSign: chart.summary.risingSign,
      createdAt: now,
      updatedAt: now,
    };
    mockPeople.unshift(person);
    return person;
  },

  async listPeople() {
    await delay();
    return [...mockPeople];
  },

  async deletePerson(id) {
    await delay();
    const i = mockPeople.findIndex((p) => p.id === id);
    if (i >= 0) mockPeople.splice(i, 1);
  },

  async unlockFeature() {
    await delay();
    mockUnlocked.add("COMPATIBILITY");
  },

  async getEntitlements() {
    await delay();
    return [...mockUnlocked];
  },

  // Companion
  async getGuidance(_dto, topic, locale) {
    await delay();
    return mockGuidance(topic, locale);
  },

  async sendMessage(_dto, message, locale) {
    await delay();
    const reply = mockChatReply(message, locale);
    mockChat.push({
      id: `${Date.now()}-u`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    });
    mockChat.push({
      id: `${Date.now()}-a`,
      role: "assistant",
      content: reply.reply,
      takeaway: reply.takeaway,
      why: reply.why,
      createdAt: new Date().toISOString(),
    });
    return reply;
  },

  async getChatHistory() {
    await delay();
    return [...mockChat];
  },

  // Intentions
  async createIntention(dto, input, locale) {
    await delay();
    const now = new Date().toISOString();
    const intention: Intention = {
      id: `${Date.now()}`,
      goalText: input.goalText,
      category: input.category,
      lifeArea: input.lifeArea ?? "energy",
      affirmation: mockAffirmation(input.goalText, locale),
      dailyTarget: input.dailyTarget,
      status: "active",
      createdAt: now,
      updatedAt: now,
      progress: { count: 0, target: input.dailyTarget },
      streak: { currentStreak: 0, longestStreak: 0 },
    };
    mockIntentions.unshift(intention);
    return intention;
  },

  async listIntentions() {
    await delay();
    return [...mockIntentions];
  },

  async getIntention(id) {
    await delay();
    return mockIntentions.find((i) => i.id === id) ?? mockIntentions[0];
  },

  async deleteIntention(id) {
    await delay();
    const i = mockIntentions.findIndex((x) => x.id === id);
    if (i >= 0) mockIntentions.splice(i, 1);
  },

  async getIntentionSuggestions(_dto, locale) {
    await delay();
    return mockIntentionSuggestions(locale);
  },

  async checkInIntention(id, input, locale) {
    await delay();
    const intention = mockIntentions.find((x) => x.id === id);
    const target = intention?.dailyTarget ?? 1;
    const count = Math.min((intention?.progress.count ?? 0) + 1, target);
    const dayCompleted = count >= target;
    if (intention) {
      intention.progress = { count, target };
      if (dayCompleted && intention.streak.currentStreak === 0) {
        intention.streak = { currentStreak: 1, longestStreak: 1 };
      }
    }
    const reply = mockCheckInReply(input.conviction, input.userText, locale);
    return {
      ...reply,
      progress: { count, target },
      dayCompleted,
      streak: intention?.streak ?? { currentStreak: dayCompleted ? 1 : 0, longestStreak: dayCompleted ? 1 : 0 },
      milestoneName: null,
    };
  },

  async getIntentionHistory() {
    await delay();
    return [];
  },
};

// Mock-only in-memory stores (the mock path has no backend to persist to).
const mockPeople: SavedPerson[] = [];
const mockUnlocked = new Set<string>();
const mockChat: ChatMessage[] = [];
const mockIntentions: Intention[] = [];

/** Real backend when EXPO_PUBLIC_API_URL is set, otherwise local mock data. */
export const astrologyApi: AstrologyApi = USE_HTTP ? httpAstrologyApi : mockAstrologyApi;
