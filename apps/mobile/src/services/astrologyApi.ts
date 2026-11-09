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
  DailyPlan,
  LifeArea,
  LifeAreaContext,
  PowerDays,
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
  TarotCardReading,
  TarotSpread,
  TarotSynthesis,
  ElectionCheck,
  ElectionCheckQuery,
  ElectionCheckReading,
  ElectionSearch,
  ElectionSearchQuery,
  ElectionSearchReading,
  CreateReportInput,
  ReportData,
  ReportMeta,
  TransitData,
  TransitReport,
  TransitDetail,
  TransitOverview,
  YearAhead,
} from "./types";
import { mockAward, mockResetMascot, mockTodayMood } from "./mascotApi";
import { buildPlan, focusAreaOf, weekStrip, type PlanTransit } from "../lib/planRules";
import { LIFE_AREA_HOUSES, starState, visiblePowerDays } from "../lib/intentionRules";
import { lunarWindow, nextLunarPeak } from "../lib/mascotRules";
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
import { mockYearAhead } from "./mock/yearAhead";
import { mockCompatibility, mockCompatibilityReading } from "./mock/compatibility";
import {
  mockGuidance,
  mockChatReply,
  mockIntentionSuggestions,
  mockAffirmation,
  mockCheckInReply,
} from "./mock/companion";
import { mockTarotCard, mockTarotSynthesis } from "./mock/tarot";
import {
  mockElectionCheck,
  mockElectionCheckReading,
  mockElectionSearch,
  mockElectionSearchReading,
} from "./mock/election";
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
  /** Solar Return, read as the year from this birthday to the next. */
  getYearAhead(dto: CreateBirthProfileDto, locale: Locale): Promise<YearAhead>;

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
  /** Active wishes by default; "manifested" is the shelf of wishes that came true. */
  listIntentions(status?: "active" | "manifested"): Promise<Intention[]>;
  getIntention(id: string): Promise<Intention>;
  deleteIntention(id: string): Promise<void>;
  /** A wish came true → the shelf + Aster celebrates. */
  manifestIntention(id: string): Promise<Intention>;
  /** Let a wish go (kept, no longer active). */
  archiveIntention(id: string): Promise<void>;
  /** The wish's power days from the user's transits (locked past 3 until Glimmer). */
  getPowerDays(id: string, dto: CreateBirthProfileDto): Promise<PowerDays>;
  /** Where each life area lives in the natal chart. */
  getLifeAreas(dto: CreateBirthProfileDto): Promise<LifeAreaContext[]>;
  /** The chart-framed affirmation for a wish, before it is planted. */
  previewAffirmation(
    dto: CreateBirthProfileDto,
    goalText: string,
    lifeArea: LifeArea,
    locale: Locale,
  ): Promise<string>;

  // Personal sky plan (built on the server from the stored chart; the dto feeds the mock).
  getTodayPlan(dto: CreateBirthProfileDto): Promise<DailyPlan>;
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

  // Tarot — one detailed reading per card (fetched in parallel) + the whole spread.
  getTarotCard(
    dto: CreateBirthProfileDto,
    spread: TarotSpread,
    index: number,
    locale: Locale,
  ): Promise<TarotCardReading>;
  getTarotSynthesis(
    dto: CreateBirthProfileDto,
    spread: TarotSpread,
    locale: Locale,
  ): Promise<TarotSynthesis>;

  /** Delete everything the server holds for this device (and revoke its token). */
  deleteMyData(): Promise<void>;

  // PDF reports — a background job; poll getReport until status is "ready".
  createReport(dto: CreateBirthProfileDto, input: CreateReportInput, locale: Locale): Promise<ReportMeta>;
  listReports(): Promise<ReportMeta[]>;
  getReport(id: string): Promise<ReportMeta & { data: ReportData | null }>;
  deleteReport(id: string): Promise<void>;

  // Election — the computed result comes back fast; the reading is the AI layer.
  electionCheck(dto: CreateBirthProfileDto, query: ElectionCheckQuery, locale: Locale): Promise<ElectionCheck>;
  electionCheckReading(
    dto: CreateBirthProfileDto,
    query: ElectionCheckQuery,
    locale: Locale,
  ): Promise<ElectionCheckReading>;
  electionSearch(dto: CreateBirthProfileDto, query: ElectionSearchQuery, locale: Locale): Promise<ElectionSearch>;
  electionSearchReading(
    dto: CreateBirthProfileDto,
    query: ElectionSearchQuery,
    locale: Locale,
  ): Promise<ElectionSearchReading>;
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
    mockAward("SKY_READ");
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

  async getYearAhead(dto, locale) {
    await delay();
    return mockYearAhead(dto, locale);
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
    const lifeArea = input.lifeArea ?? "energy";
    const plantedMoon = input.plant === "newMoon" ? nextLunarPeak(new Date(), "new") : null;
    const intention: Intention = {
      id: `${Date.now()}`,
      goalText: input.goalText,
      category: input.category,
      lifeArea,
      affirmation: input.affirmation?.trim() || mockAffirmation(input.goalText, locale),
      dailyTarget: input.dailyTarget,
      status: "active",
      createdAt: now,
      updatedAt: now,
      progress: { count: 0, target: input.dailyTarget },
      streak: { currentStreak: 0, longestStreak: 0 },
      natalHouse: LIFE_AREA_HOUSES[lifeArea].main,
      plantedMoon,
      manifestedAt: null,
      star: starState(
        { totalCheckIns: 0, avgConviction: null, lastActiveDate: null, plantedMoon },
        localDayKey(),
      ),
    };
    mockIntentions.unshift(intention);
    return { ...intention, mascot: mockAward("INTENTION_CREATE", "", { hatch: true }) };
  },

  async listIntentions(status = "active") {
    await delay();
    return mockIntentions.filter((i) => i.status === status);
  },

  async manifestIntention(id) {
    await delay();
    const i = mockIntentions.find((x) => x.id === id);
    if (!i || i.status !== "active") throw new Error("Only an active wish can be manifested");
    i.status = "manifested";
    i.manifestedAt = new Date().toISOString();
    return { ...i, mascot: mockAward("MANIFESTED", id) };
  },

  async archiveIntention(id) {
    await delay();
    const i = mockIntentions.find((x) => x.id === id);
    if (i) i.status = "archived";
  },

  async getPowerDays(id, dto) {
    await delay();
    const i = mockIntentions.find((x) => x.id === id);
    const area: LifeArea = i?.lifeArea ?? "energy";
    const best = mockBestDays(dto, 14, "en");
    const { useMascotStore } = await import("../store/useMascotStore");
    const stage = useMascotStore.getState().state?.stage ?? 0;
    const visible = visiblePowerDays(stage, best.scores.length);
    // The mock's best days carry prose reasons only, so power days show scores without a transit line.
    return {
      area,
      stage,
      visible,
      days: best.scores.map((s, idx) => {
        const locked = idx >= visible;
        return { date: s.date, locked, score: locked ? null : s[area], reason: null };
      }),
    };
  },

  async getLifeAreas(dto) {
    await delay();
    const chart = generateNatalChart(dto);
    return (Object.keys(LIFE_AREA_HOUSES) as LifeArea[]).map((area) => {
      const house = LIFE_AREA_HOUSES[area].main;
      const h = chart.houses.find((x) => x.house === house);
      return {
        area,
        house,
        sign: h?.sign ?? null,
        ruler: h?.ruler ?? null,
        rulerSign: h?.rulerSign ?? null,
        rulerHouse: h?.rulerHouse ?? null,
        planets: h?.planetsInHouse ?? [],
        approximate: false,
      };
    });
  },

  async previewAffirmation(_dto, goalText, _lifeArea, locale) {
    await delay();
    return mockAffirmation(goalText, locale);
  },

  async getTodayPlan(dto) {
    await delay();
    const today = localDayKey();
    const chart = generateNatalChart(dto);
    const report = generateTransitReport(dto, chart);
    const transits: PlanTransit[] = report.movements
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
    const moon = report.movements.find((m) => m.planet === "Moon");
    const best = mockBestDays(dto, 7, "en");
    const s0 = best.scores[0];
    const areaScores = s0 ? { love: s0.love, career: s0.career, money: s0.money, energy: s0.energy } : null;
    const focus = focusAreaOf(areaScores);
    const lead = transits.find((t) => t.nature === "harmonic") ?? transits[0];
    const lunar = lunarWindow(new Date());
    return buildPlan({
      today,
      transits,
      moon: moon ? { sign: moon.sign, natalHouse: moon.natalHouse } : null,
      areaScores,
      areaReasons: lead
        ? { [focus]: { transitPlanet: lead.transitPlanet, aspect: lead.aspect, natalPoint: lead.natalPlanet, nature: lead.nature } }
        : {},
      week: weekStrip(best.scores),
      intentions: mockIntentions
        .filter((i) => i.status === "active" && !i.star?.waiting)
        .slice()
        .reverse()
        .map((i) => ({ id: i.id, lifeArea: i.lifeArea })),
      mood: mockTodayMood(),
      lunar: lunar ? { phase: lunar.phase, peakDate: lunar.peakDate } : null,
    });
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
    const deltas = [mockAward("CHECKIN")];
    if (dayCompleted) deltas.push(mockAward("DAY_COMPLETE", id));
    const last = deltas[deltas.length - 1];
    return {
      ...reply,
      progress: { count, target },
      dayCompleted,
      streak: intention?.streak ?? { currentStreak: dayCompleted ? 1 : 0, longestStreak: dayCompleted ? 1 : 0 },
      milestoneName: null,
      mascot: {
        ...last,
        xpGained: deltas.reduce((n, d) => n + d.xpGained, 0),
        stardustGained: deltas.reduce((n, d) => n + d.stardustGained, 0),
        previousStage: deltas[0].previousStage,
        leveledUp: last.stage > deltas[0].previousStage,
        hatched: deltas.some((d) => d.hatched),
      },
    };
  },

  async getIntentionHistory() {
    await delay();
    return [];
  },

  // Tarot
  async getTarotCard(_dto, spread, index, locale) {
    await delay();
    return mockTarotCard(spread, index, locale);
  },

  async getTarotSynthesis(_dto, spread, locale) {
    await delay();
    return mockTarotSynthesis(spread, locale);
  },

  // Reports need the real backend (dozens of AI sections); the mock says so.
  async createReport(_dto, input) {
    await delay();
    return {
      id: `${Date.now()}`,
      kind: input.kind,
      status: "failed",
      progress: 0,
      total: 0,
      stage: null,
      name: input.name,
      locale: "en",
      createdAt: new Date().toISOString(),
      error: "offline",
    };
  },

  async listReports() {
    await delay();
    return [];
  },

  async getReport() {
    throw new Error("Reports need the API (EXPO_PUBLIC_API_URL)");
  },

  async deleteReport() {
    await delay();
  },

  async deleteMyData() {
    await delay();
    mockPeople.splice(0);
    mockChat.splice(0);
    mockIntentions.splice(0);
    mockUnlocked.clear();
    mockResetMascot();
  },

  // Election
  async electionCheck(_dto, query, locale) {
    await delay();
    return mockElectionCheck(query, locale);
  },

  async electionCheckReading(_dto, query, locale) {
    await delay();
    return mockElectionCheckReading(query, locale);
  },

  async electionSearch(_dto, query, locale) {
    await delay();
    return mockElectionSearch(query, locale);
  },

  async electionSearchReading(_dto, query, locale) {
    await delay();
    return mockElectionSearchReading(query, locale);
  },
};

// Mock-only in-memory stores (the mock path has no backend to persist to).
const mockPeople: SavedPerson[] = [];
const mockUnlocked = new Set<string>();
const mockChat: ChatMessage[] = [];
const mockIntentions: Intention[] = [];

/** The device's local day, YYYY-MM-DD (the mock has no x-tz round trip). */
function localDayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Real backend when EXPO_PUBLIC_API_URL is set, otherwise local mock data. */
export const astrologyApi: AstrologyApi = USE_HTTP ? httpAstrologyApi : mockAstrologyApi;
