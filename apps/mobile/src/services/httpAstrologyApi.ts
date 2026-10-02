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
  TarotCardReading,
  TarotSynthesis,
  ElectionCheck,
  ElectionCheckReading,
  ElectionQuery,
  ElectionSearch,
  ElectionSearchReading,
  ReportData,
  ReportMeta,
  TransitData,
  TransitReport,
  TransitDetail,
  TransitOverview,
  YearAhead,
} from "./types";
import type { AstrologyApi } from "./astrologyApi";
import { Locale } from "../i18n";
import { API_URL } from "./config";
import { getDeviceToken, resetDeviceToken } from "./deviceAuth";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The server caps one AI generation (retries included) at ~50s and then falls
 * back to templated text, so anything past this is a dead connection — e.g. a
 * stale LAN IP in EXPO_PUBLIC_API_URL. Without a limit, fetch on a phone can
 * hang for minutes and screens sit on their loading state forever.
 */
const REQUEST_TIMEOUT_MS = 60_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError(`Request timed out: ${url}`, 0);
    }
    throw new ApiError(`Network error: ${(err as Error).message}`, 0);
  } finally {
    clearTimeout(timer);
  }
}

/** Astrology endpoints take the birth DTO as the body and options as query params. */
function post<T>(
  path: string,
  dto: CreateBirthProfileDto,
  locale?: Locale,
  extraQuery?: Record<string, string | number>,
): Promise<T> {
  return request<T>("POST", `astrology/${path}`, dto, {
    ...(locale ? { locale } : {}),
    ...extraQuery,
  });
}

/**
 * Every API call. `path` is relative to `/api/v1/` and includes the module
 * prefix (e.g. "astrology/compatibility", "companion/message", "intentions").
 * Carries the device token; a 401 means it was revoked or expired, so the
 * token is dropped, re-registered once, and the call retried.
 */
async function request<T>(
  method: "GET" | "POST" | "DELETE" | "PATCH",
  path: string,
  body?: unknown,
  query?: Record<string, string | number>,
): Promise<T> {
  const params = new URLSearchParams();
  if (query) for (const [k, v] of Object.entries(query)) params.set(k, String(v));
  const qs = params.toString();
  const url = `${API_URL}/api/v1/${path}${qs ? `?${qs}` : ""}`;
  const send = async () =>
    fetchWithTimeout(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getDeviceToken()}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let res = await send();
  if (res.status === 401) {
    await resetDeviceToken();
    res = await send();
  }
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }
  // DELETE / unlock may return empty-ish bodies; tolerate non-JSON.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
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

  getTransitReport: (dto) => post<TransitReport>("transits/report", dto),

  getTransitDetail: (dto, planet, locale) =>
    post<TransitDetail>("interpretation/transit", dto, locale, { planet }),

  getTransitOverview: (dto, locale) =>
    post<TransitOverview>("interpretation/transit-overview", dto, locale),

  getBestDays: (dto, days, locale, start) =>
    post<BestDaysResponse>("best-days", dto, locale, start ? { days, start } : { days }),

  getForecast: (dto, period, locale, start) =>
    post<Forecast>(`forecast/${period}`, dto, locale, start ? { start } : undefined),

  getYearAhead: (dto, locale) => post<YearAhead>("year-ahead", dto, locale),

  getCompatibility: (self, other) =>
    request<CompatibilityScore>("POST", "astrology/compatibility", { self, other }),

  getCompatibilityReading: (self, other, locale) =>
    request<CompatibilityReading>(
      "POST",
      "astrology/compatibility/interpretation",
      { self, other },
      { locale },
    ),

  savePerson: (input) => request<SavedPerson>("POST", "astrology/people", input),

  listPeople: () => request<SavedPerson[]>("GET", "astrology/people"),

  deletePerson: (id) => request<void>("DELETE", `astrology/people/${encodeURIComponent(id)}`),

  async unlockFeature(feature) {
    await request<{ unlocked: boolean }>("POST", "astrology/unlock", undefined, { feature });
  },

  async getEntitlements() {
    const res = await request<{ features: string[] }>("GET", "astrology/entitlements");
    return res?.features ?? [];
  },

  // Companion
  getGuidance: (dto, topic, locale) =>
    request<GuidanceAnswer>("POST", "companion/guidance", dto, { topic, locale }),

  sendMessage: (dto, message, locale) =>
    request<ChatReply>("POST", "companion/message", { ...dto, message }, { locale }),

  getChatHistory: () => request<ChatMessage[]>("GET", "companion/history"),

  // Intentions
  createIntention: (dto, input, locale) =>
    request<Intention>("POST", "intentions", { ...dto, ...input }, { locale }),

  listIntentions: () => request<Intention[]>("GET", "intentions"),

  getIntention: (id) => request<Intention>("GET", `intentions/${encodeURIComponent(id)}`),

  deleteIntention: (id) => request<void>("DELETE", `intentions/${encodeURIComponent(id)}`),

  async getIntentionSuggestions(dto, locale) {
    const res = await request<{ suggestions: IntentionSuggestion[] }>(
      "POST",
      "intentions/suggestions",
      dto,
      { locale },
    );
    return res?.suggestions ?? [];
  },

  checkInIntention: (id, input, locale) =>
    request<CheckInResult>("POST", `intentions/${encodeURIComponent(id)}/checkin`, input, { locale }),

  getIntentionHistory: (id) =>
    request<IntentionCheckInHistory[]>("GET", `intentions/${encodeURIComponent(id)}/history`),

  // Tarot
  getTarotCard: (dto, spread, index, locale) =>
    request<TarotCardReading>("POST", "tarot/card", { ...dto, ...spread, index }, { locale }),

  getTarotSynthesis: (dto, spread, locale) =>
    request<TarotSynthesis>("POST", "tarot/synthesis", { ...dto, ...spread }, { locale }),

  async deleteMyData() {
    await request<unknown>("DELETE", "me/data");
  },

  createReport: (dto, input, locale) => request<ReportMeta>("POST", "reports", { ...dto, ...input }, { locale }),

  listReports: () => request<ReportMeta[]>("GET", "reports"),

  getReport: (id) => request<ReportMeta & { data: ReportData | null }>("GET", `reports/${encodeURIComponent(id)}`),

  async deleteReport(id) {
    await request<unknown>("DELETE", `reports/${encodeURIComponent(id)}`);
  },

  // Election
  electionCheck: (dto, query, locale) =>
    request<ElectionCheck>("POST", "election/check", electionBody(dto, query), { locale }),

  electionCheckReading: (dto, query, locale) =>
    request<ElectionCheckReading>("POST", "election/check/reading", electionBody(dto, query), { locale }),

  electionSearch: (dto, query, locale) =>
    request<ElectionSearch>("POST", "election/search", electionBody(dto, query), { locale }),

  electionSearchReading: (dto, query, locale) =>
    request<ElectionSearchReading>("POST", "election/search/reading", electionBody(dto, query), { locale }),
};

/** The API whitelists body fields, so the client-only `mode` stays out. */
function electionBody(dto: CreateBirthProfileDto, query: ElectionQuery) {
  const { mode: _mode, ...rest } = query;
  return { ...dto, ...rest };
}
