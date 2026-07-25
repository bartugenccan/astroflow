import { useCallback, useEffect, useRef, useState } from "react";
import { cachedCall, peekCache } from "../services/interpretationCache";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Like `useAsync`, but backed by the shared `interpretationCache`. Results
 * persist across mounts and are deduped across components, so a value warmed by
 * a background preload renders instantly (no loading flash) on first paint.
 *
 * The `key` fully identifies the request (it encodes the dto + params), so it —
 * not `factory` — is the dependency. Pass `key === null` to stay idle (e.g.
 * before the birth dto is available).
 */
export function useCachedAsync<T>(
  key: string | null,
  factory: () => Promise<T>,
): AsyncState<T> {
  const warm = key ? peekCache<T>(key) : undefined;

  const [data, setData] = useState<T | null>(warm ?? null);
  const [loading, setLoading] = useState(key !== null && warm === undefined);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Keep the latest factory without making it a dependency — the key already
  // captures every input, so calling the newest closure yields the same result.
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (key === null) {
      setLoading(false);
      return;
    }

    const cached = peekCache<T>(key);
    if (cached !== undefined && nonce === 0) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    cachedCall<T>(key, () => factoryRef.current(), nonce > 0)
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return { data, loading, error, reload };
}
