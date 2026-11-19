import { AsyncLocalStorage } from 'async_hooks';

/** Tokens a vendor reported for one guarded AI call, summed over its attempts. */
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  /** False until a vendor response carried usage numbers (e.g. every attempt failed before answering). */
  reported: boolean;
}

const store = new AsyncLocalStorage<AiUsage>();

/**
 * Runs one AI call with its own usage slot. The vendor client reports the
 * tokens of every attempt that got an answer through `noteAiUsage`; the
 * caller reads the totals from the returned slot once the call settles.
 * Scoped per call (not per request), so parallel calls never mix.
 */
export function trackAiUsage<T>(call: () => Promise<T>): { usage: AiUsage; result: Promise<T> } {
  const usage: AiUsage = { inputTokens: 0, outputTokens: 0, reported: false };
  return { usage, result: store.run(usage, call) };
}

/** Adds one vendor response's billed tokens to the current call's slot. */
export function noteAiUsage(inputTokens: number | undefined, outputTokens: number | undefined): void {
  const usage = store.getStore();
  if (!usage) return;
  if (typeof inputTokens !== 'number' && typeof outputTokens !== 'number') return;
  usage.reported = true;
  usage.inputTokens += inputTokens ?? 0;
  usage.outputTokens += outputTokens ?? 0;
}
