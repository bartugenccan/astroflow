import { useCallback, useEffect, useState } from "react";
import { isConnectionError } from "../services/httpAstrologyApi";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** The last failure was the phone not reaching the server (no connection), not a server error. */
  offline: boolean;
  reload: () => void;
}

function sameJson(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Runs an async factory on mount and whenever `deps` change, exposing
 * loading/error state and a manual `reload`. Ignores stale results.
 */
export function useAsync<T>(
  factory: () => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    factory()
      .then((result) => {
        if (active) {
          // A reload that brings back the same data keeps the old reference,
          // so nothing downstream re-renders or re-memoises for it.
          setData((prev) => (prev !== null && sameJson(prev, result) ? prev : result));
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setOffline(isConnectionError(err));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, offline, reload };
}
