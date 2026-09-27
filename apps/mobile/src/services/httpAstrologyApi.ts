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
  YearAhead,
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
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId,
    },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Generic request for endpoints whose body/method differs from the birth-dto
 * POST. `path` is relative to `/api/v1/` and includes the module prefix
 * (e.g. "astrology/compatibility", "companion/message", "intentions").
 */
async function request<T>(
  method: "GET" | "POST" | "DELETE" | "PATCH",
  path: string,
  body?: unknown,
  query?: Record<string, string | number>,
): Promise<T> {
  const deviceId = await getDeviceId();
  const params = new URLSearchParams();
  if (query) for (const [k, v] of Object.entries(query)) params.set(k, String(v));
  const qs = params.toString();
  const url = `${API_URL}/api/v1/${path}${qs ? `?${qs}` : ""}`;
  const res = await fetchWithTimeout(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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

  deletePerson: (id) => request<void>("DELETE", `astrology/people/${id}`),

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

  getIntention: (id) => request<Intention>("GET", `intentions/${id}`),

  deleteIntention: (id) => request<void>("DELETE", `intentions/${id}`),

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
    request<CheckInResult>("POST", `intentions/${id}/checkin`, input, { locale }),

  getIntentionHistory: (id) =>
    request<IntentionCheckInHistory[]>("GET", `intentions/${id}/history`),
};
