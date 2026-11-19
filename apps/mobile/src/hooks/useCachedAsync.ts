import { useCallback, useEffect, useRef, useState } from "react";
import { cachedCall, hydrateInterpretationCache, peekCache, peekSaved } from "../services/interpretationCache";
import { isConnectionError } from "../services/httpAstrologyApi";
import { isAiFallback } from "../services/aiFallback";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** The last failure was the phone not reaching the server (no connection), not a server error. */
  offline: boolean;
  reload: () => void;
}

/**
 * Like `useAsync`, but backed by the shared `interpretationCache`. Results
 * persist across mounts and are deduped across components, so a value warmed by
 * a background preload renders instantly (no loading flash) on first paint.
 *
 * Stale-while-revalidate: when only the on-disk copy of a reading exists (a
 * cold start), it shows at once and the fresh one replaces it when it lands.
 * While a saved copy is on screen, a failed refresh or a stub answer leaves it
 * in place instead of showing an error or the generic text.
 *
 * The `key` fully identifies the request (it encodes the dto + params), so it —
 * not `factory` — is the dependency. Pass `key === null` to stay idle (e.g.
 * before the birth dto is available).
 */
export function useCachedAsync<T>(
  key: string | null,
  factory: () => Promise<T>,
): AsyncState<T> {
  // A real reading in memory first, then the saved copy, then a stub in memory.
  const inMemory = key ? peekCache<T>(key) : undefined;
  const warm =
    key && (inMemory === undefined || isAiFallback(inMemory)) ? (peekSaved<T>(key) ?? inMemory) : inMemory;

  const [data, setData] = useState<T | null>(warm ?? null);
  const [loading, setLoading] = useState(key !== null && warm === undefined);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
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
    // A warm stub still goes through below, so a saved real copy can win.
    if (cached !== undefined && nonce === 0 && !isAiFallback(cached)) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    let fresh = false;
    /** A saved copy is on screen while the fresh one loads. */
    let showingSaved = false;
    const showSaved = () => {
      if (nonce > 0 || fresh) return;
      const copy = peekSaved<T>(key);
      if (copy === undefined) return;
      showingSaved = true;
      setData(copy);
      setLoading(false);
      setError(null);
    };

    showSaved();
    if (!showingSaved) setLoading(true);
    setError(null);
    // On a cold start the disk copy may still be loading: show it once it is.
    hydrateInterpretationCache().then(() => {
      if (active) showSaved();
    });

    cachedCall<T>(key, () => factoryRef.current(), nonce > 0)
      .then((result) => {
        if (!active) return;
        fresh = true;
        // Keep the real (saved) reading over a stub.
        if (!(showingSaved && isAiFallback(result))) setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        fresh = true;
        setLoading(false);
        if (showingSaved) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setOffline(isConnectionError(err));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return { data, loading, error, offline, reload };
}
