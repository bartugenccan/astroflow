import { CreateBirthProfileDto } from "./types";
import { astrologyApi } from "./astrologyApi";
import { Locale } from "../i18n";

/**
 * Process-wide, in-memory cache for AI interpretation results. Survives
 * component unmounts (unlike `useAsync`'s local state) and dedupes concurrent
 * requests for the same key, so a background preload and a user tap share one
 * network round-trip. Keys are value-hashes (see `dtoKey`) so identical charts
 * reuse entries, mirroring the backend's chart-derived cache.
 */

interface Entry<T> {
  value?: T;
  promise?: Promise<T>;
}

const cache = new Map<string, Entry<unknown>>();

/** Stable value key for a birth chart — matches the fields the API keys on. */
export function dtoKey(dto: CreateBirthProfileDto): string {
  return `${dto.birthDate}|${dto.birthTime}|${dto.latitude}|${dto.longitude}`;
}

/** Synchronous peek — returns the resolved value if this key is already warm. */
export function peekCache<T>(key: string): T | undefined {
  return (cache.get(key) as Entry<T> | undefined)?.value;
}

/**
 * Returns the cached value, the in-flight promise, or runs `factory` (caching
 * the result). On failure the key is dropped so a later call can retry.
 * Pass `force` to bypass a resolved value and refetch (used by `reload`).
 */
export function cachedCall<T>(
  key: string,
  factory: () => Promise<T>,
  force = false,
): Promise<T> {
  const existing = cache.get(key) as Entry<T> | undefined;
  if (!force && existing) {
    if (existing.value !== undefined) return Promise.resolve(existing.value);
    if (existing.promise) return existing.promise;
  }
  const promise = factory()
    .then((value) => {
      cache.set(key, { value });
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
