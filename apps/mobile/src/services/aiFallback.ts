/**
 * Answers the server marked as templated stub text (`x-ai-fallback: 1`: the
 * AI call failed or timed out). They are shown, but never kept: not in the
 * in-memory reading cache, not on disk — so the next open asks again instead
 * of locking the generic text in.
 */
const fallbacks = new WeakSet<object>();

export const AI_FALLBACK_HEADER = "x-ai-fallback";

export function markAiFallback(value: unknown): void {
  if (value && typeof value === "object") fallbacks.add(value);
}

export function isAiFallback(value: unknown): boolean {
  return !!value && typeof value === "object" && fallbacks.has(value);
}
