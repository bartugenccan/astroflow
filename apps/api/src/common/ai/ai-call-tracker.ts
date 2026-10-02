import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tracks whether any AI call failed while a cacheable result was being built.
 *
 * Every reading falls back to templated "stub" text when the model errors,
 * times out, is over budget or out of balance. That stub must reach the user
 * but must NOT be cached as if it were the real reading — otherwise one bad
 * minute locks the generic text in until the cache version is bumped. Caches
 * wrap their build in `trackAiCalls()`; the AI provider calls
 * `noteAiFailure()`; a failed build is returned but not stored.
 */
const store = new AsyncLocalStorage<{ failed: boolean }>();

export async function trackAiCalls<T>(build: () => Promise<T>): Promise<{ value: T; failed: boolean }> {
  const state = { failed: false };
  const value = await store.run(state, build);
  return { value, failed: state.failed };
}

export function noteAiFailure(): void {
  const state = store.getStore();
  if (state) state.failed = true;
}
