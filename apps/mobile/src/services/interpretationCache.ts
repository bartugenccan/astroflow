import AsyncStorage from "@react-native-async-storage/async-storage";
import { CreateBirthProfileDto, DailyInsight, ElectionQuery, TarotSpread } from "./types";
import { astrologyApi } from "./astrologyApi";
import { isAiFallback } from "./aiFallback";
import { Locale } from "../i18n";
import { todayISO } from "../lib/dates";

/**
 * Process-wide, in-memory cache for AI interpretation results. Survives
 * component unmounts (unlike `useAsync`'s local state) and dedupes concurrent
 * requests for the same key, so a background preload and a user tap share one
 * network round-trip. Keys are value-hashes (see `dtoKey`) so identical charts
 * reuse entries, mirroring the backend's chart-derived cache.
 *
 * Behind it sits a small on-disk copy of the last good reading per key (see
 * `peekSaved`), so a cold start shows yesterday's-session text at once while
 * the fresh one loads (stale-while-revalidate, in `useCachedAsync`). Stub
 * answers (`isAiFallback`) are kept in neither.
 */

interface Entry<T> {
  value?: T;
  promise?: Promise<T>;
  /** Stub answers only: when this entry stops counting, so the next call asks again. */
  expiresAt?: number;
}

const cache = new Map<string, Entry<unknown>>();

/**
 * How long a stub answer stays warm in memory. Long enough that reopening a
 * screen during an outage is instant, short enough that the real reading is
 * asked for again soon. Stubs never reach the disk copy.
 */
const STUB_TTL_MS = 2 * 60 * 1000;

/** The live entry for a key, dropping an expired stub. */
function liveEntry<T>(key: string): Entry<T> | undefined {
  const entry = cache.get(key) as Entry<T> | undefined;
  if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

// ---- On-disk copy of the last good readings ----

const SAVED_KEY = "astroflow.readings.v1";
/** Enough for the daily reading, 12 houses, forecasts and a few transits. */
const SAVED_MAX = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Only readings worth showing while their fresh copy loads, each with how long
 * a saved copy stays good enough for that. Keys with the day in them (insight,
 * transit overview) only ever match on that day; the weekly forecast's key has
 * no date, so its copy expires quickly. Best days are not kept: their dates
 * would be wrong on a later day.
 */
const SAVED_MAX_AGE: Record<string, number> = {
  "insight|": 2 * DAY_MS,
  "transitov|": 2 * DAY_MS,
  "forecast|": 2 * DAY_MS,
  "house|": 30 * DAY_MS,
  "yearahead|": 30 * DAY_MS,
};

interface Saved {
  v: unknown;
  at: number;
}

/** Insertion order = recency (re-saving moves a key to the end). */
const saved = new Map<string, Saved>();
let hydration: Promise<void> | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

/** How long a saved copy of this key stays usable, or undefined if the key is never saved. */
function maxAgeOf(key: string): number | undefined {
  for (const prefix in SAVED_MAX_AGE) if (key.startsWith(prefix)) return SAVED_MAX_AGE[prefix];
  return undefined;
}

const persistable = (key: string) => maxAgeOf(key) !== undefined;

/**
 * Loads the on-disk readings once (later calls share the same promise). Never
 * rejects; a broken or missing store just means nothing is warm.
 */
export function hydrateInterpretationCache(): Promise<void> {
  if (!hydration) {
    hydration = AsyncStorage.getItem(SAVED_KEY)
      .then((raw) => {
        if (!raw) return;
        const rows = JSON.parse(raw) as [string, Saved][];
        const now = Date.now();
        for (const [key, row] of rows) {
          const maxAge = maxAgeOf(key);
          if (!row || maxAge === undefined || now - row.at > maxAge) continue;
          // Anything saved this session already is newer than the disk copy.
          if (!saved.has(key)) saved.set(key, row);
        }
      })
      .catch(() => undefined);
  }
  return hydration;
}

/** The last good reading saved on disk for this key (possibly from an earlier day). */
export function peekSaved<T>(key: string): T | undefined {
  return saved.get(key)?.v as T | undefined;
}

function save(key: string, value: unknown): void {
  if (!persistable(key) || isAiFallback(value)) return;
  saved.delete(key);
  saved.set(key, { v: value, at: Date.now() });
  while (saved.size > SAVED_MAX) {
    const oldest = saved.keys().next().value;
    if (oldest === undefined) break;
    saved.delete(oldest);
  }
  if (writeTimer) clearTimeout(writeTimer);
  // Batched: a burst of preloads writes once.
  writeTimer = setTimeout(() => {
    writeTimer = null;
    AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...saved])).catch(() => undefined);
  }, 800);
}

/** Drops every cached interpretation, in memory and on disk (data wipe). */
export function clearInterpretationCache(): void {
  cache.clear();
  saved.clear();
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = null;
  AsyncStorage.removeItem(SAVED_KEY).catch(() => undefined);
}

/** Stable value key for a birth chart — matches the fields the API keys on. */
export function dtoKey(dto: CreateBirthProfileDto): string {
  return `${dto.birthDate}|${dto.birthTime}|${dto.latitude}|${dto.longitude}`;
}

/** Synchronous peek — returns the resolved value if this key is already warm. */
export function peekCache<T>(key: string): T | undefined {
  return liveEntry<T>(key)?.value;
}

/**
 * Returns the cached value, the in-flight promise, or runs `factory` (caching
 * the result). On failure the key is dropped so a later call can retry.
 * Pass `force` to bypass a resolved value and refetch (used by `reload`).
 * A stub answer is kept only for STUB_TTL_MS and never saved to disk.
 */
export function cachedCall<T>(
  key: string,
  factory: () => Promise<T>,
  force = false,
): Promise<T> {
  const existing = liveEntry<T>(key);
  if (!force && existing) {
    if (existing.value !== undefined) return Promise.resolve(existing.value);
    if (existing.promise) return existing.promise;
  }
  const promise = factory()
    .then((value) => {
      if (isAiFallback(value)) {
        cache.set(key, { value, expiresAt: Date.now() + STUB_TTL_MS });
      } else {
        cache.set(key, { value });
        save(key, value);
      }
      return value;
    })
    .catch((err) => {
      // Only clear if this promise is still the current entry (avoid clobbering
      // a newer in-flight request for the same key).
      if (cache.get(key)?.promise === promise) cache.delete(key);
      throw err;
    });
  cache.set(key, { promise });
  return promise;
}

// ---- Key builders (kept next to the fetchers so they stay in sync) ----

export const houseKey = (dto: CreateBirthProfileDto, house: number, locale: Locale) =>
  `house|${dtoKey(dto)}|${house}|${locale}`;

/** Warm all 12 house readings in the background, a few at a time. */
export async function prefetchHouses(
  dto: CreateBirthProfileDto,
  locale: Locale,
  concurrency = 3,
): Promise<void> {
  const houses = Array.from({ length: 12 }, (_, i) => i + 1);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < houses.length) {
      const house = houses[cursor++];
      try {
        await cachedCall(houseKey(dto, house, locale), () =>
          astrologyApi.getHouseInterpretation(dto, house, locale),
        );
      } catch {
        // Preload is best-effort; a failed house just falls back to on-tap fetch.
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, houses.length) }, worker),
  );
}

export const transitKey = (
  dto: CreateBirthProfileDto,
  planet: string,
  date: string,
  locale: Locale,
) => `transit|${dtoKey(dto)}|${date}|${planet}|${locale}`;

export const transitOverviewKey = (
  dto: CreateBirthProfileDto,
  date: string,
  locale: Locale,
) => `transitov|${dtoKey(dto)}|${date}|${locale}`;

/** Warm each planet's transit reading in the background, a few at a time. */
export async function prefetchTransits(
  dto: CreateBirthProfileDto,
  planets: string[],
  date: string,
  locale: Locale,
  concurrency = 3,
): Promise<void> {
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < planets.length) {
      const planet = planets[cursor++];
      try {
        await cachedCall(transitKey(dto, planet, date, locale), () =>
          astrologyApi.getTransitDetail(dto, planet, locale),
        );
      } catch {
        // Best-effort warm; a failed planet falls back to on-tap fetch.
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, planets.length) }, worker),
  );
}

export const bestDaysKey = (dto: CreateBirthProfileDto, days: number, locale: Locale) =>
  `bestdays|${dtoKey(dto)}|${days}|${locale}`;

export const forecastKey = (
  dto: CreateBirthProfileDto,
  period: "weekly" | "monthly",
  locale: Locale,
) => `forecast|${dtoKey(dto)}|${period}|${locale}`;

/** Year-ahead reading — one per chart+locale; the window only rolls on a birthday. */
export const yearAheadKey = (dto: CreateBirthProfileDto, locale: Locale) =>
  `yearahead|${dtoKey(dto)}|${locale}`;

export const compatibilityKey = (
  self: CreateBirthProfileDto,
  other: CreateBirthProfileDto,
) => `compat|${dtoKey(self)}|${dtoKey(other)}`;

export const compatibilityReadingKey = (
  self: CreateBirthProfileDto,
  other: CreateBirthProfileDto,
  locale: Locale,
) => `compatread|${dtoKey(self)}|${dtoKey(other)}|${locale}`;

/** Guidance chip answer — cached per chart+topic+day (mirrors the backend key). */
export const guidanceKey = (
  dto: CreateBirthProfileDto,
  topic: string,
  date: string,
  locale: Locale,
) => `guidance|${dtoKey(dto)}|${topic}|${date}|${locale}`;

/** One spread = category + question + the exact draw (ids + orientation). */
const spreadKey = (s: TarotSpread) =>
  `${s.category}|${(s.question ?? "").trim().toLowerCase()}|${s.cards
    .map((c) => `${c.cardId}${c.reversed ? "R" : ""}`)
    .join(",")}`;

export const tarotCardKey = (
  dto: CreateBirthProfileDto,
  spread: TarotSpread,
  index: number,
  date: string,
  locale: Locale,
) => `tarot-card|${dtoKey(dto)}|${spreadKey(spread)}|${index}|${date}|${locale}`;

export const tarotSynthesisKey = (
  dto: CreateBirthProfileDto,
  spread: TarotSpread,
  date: string,
  locale: Locale,
) => `tarot-synth|${dtoKey(dto)}|${spreadKey(spread)}|${date}|${locale}`;

/** Warm this week's best-days + the weekly forecast after Today settles (in parallel). */
export async function prefetchForecast(
  dto: CreateBirthProfileDto,
  locale: Locale,
): Promise<void> {
  await Promise.all([
    cachedCall(bestDaysKey(dto, 7, locale), () => astrologyApi.getBestDays(dto, 7, locale)).catch(() => undefined),
    cachedCall(forecastKey(dto, "weekly", locale), () => astrologyApi.getForecast(dto, "weekly", locale)).catch(
      () => undefined,
    ),
  ]);
}

/** The day's reading (Today and /sky-today share it), per chart, local day and locale. */
export const dailyInsightKey = (dto: CreateBirthProfileDto, locale: Locale, day = todayISO()) =>
  `insight|${dtoKey(dto)}|${day}|${locale}`;

/** Fetches (or reuses) the day's reading under `dailyInsightKey`. */
export function loadDailyInsight(
  dto: CreateBirthProfileDto,
  locale: Locale,
  force = false,
): Promise<DailyInsight> {
  return cachedCall(dailyInsightKey(dto, locale), () => astrologyApi.getDailyInsight(dto, locale), force);
}

/** Warm the day's reading in the background (after onboarding, on launch). */
export function prefetchDailyInsight(dto: CreateBirthProfileDto, locale: Locale): void {
  loadDailyInsight(dto, locale).catch(() => undefined);
}

/** One election question: the event (picked or typed), the place, and the date or month range. */
export const electionKey = (
  kind: "result" | "reading",
  dto: CreateBirthProfileDto,
  q: ElectionQuery,
  locale: Locale,
) =>
  [
    `election-${kind}`,
    dtoKey(dto),
    q.mode,
    q.eventId ?? "",
    (q.eventText ?? "").trim().toLowerCase(),
    `${q.place.latitude},${q.place.longitude}`,
    q.mode === "check" ? q.date : `${q.from}..${q.to}`,
    locale,
  ].join("|");
