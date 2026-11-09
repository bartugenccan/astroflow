/**
 * Defer non-urgent work (prefetching, warm-up) until the JS thread is idle.
 *
 * React Native 0.88 removed `InteractionManager`; `requestIdleCallback` is
 * its recommended replacement. Falls back to a macrotask where idle callbacks
 * are unavailable. Same `{ cancel }` shape the old API returned.
 */
export function runAfterInteractions(task: () => void): { cancel: () => void } {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => task());
    return { cancel: () => cancelIdleCallback(id) };
  }
  const id = setTimeout(task, 0);
  return { cancel: () => clearTimeout(id) };
}
