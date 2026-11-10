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

/** Long enough for a tab's focus ease-in or a stack push to finish. */
const TRANSITION_MS = 320;

/**
 * Run work that a screen does on focus — a quiet re-fetch, say — once the
 * transition that brought it into view is over, so its re-render never lands
 * on the frames of the animation. Returns a cancel, ready to be a
 * `useFocusEffect` cleanup.
 */
export function runAfterTransition(task: () => void): () => void {
  const id = setTimeout(task, TRANSITION_MS);
  return () => clearTimeout(id);
}
