import { createHash } from 'crypto';

/**
 * Free-tier daily allowances, enforced on the server. Mirrors
 * apps/mobile/src/store/useAppStore.ts (FREE_DAILY_MESSAGES, FREE_DAILY_TAROT);
 * change both together. Bought Stardust passes add their units on top.
 */
export const FREE_DAILY = { companion: 5, tarot: 1 } as const;
export type MeteredFeature = keyof typeof FREE_DAILY;

/**
 * Premium fair use: "unlimited" Aster chat still stops at this many messages
 * a day, so one account cannot run up an unbounded AI bill. Mirrors
 * apps/mobile/src/store/useAppStore.ts (PREMIUM_DAILY_MESSAGES); the paywall
 * and the terms state it.
 */
export const PREMIUM_DAILY = { companion: 100 } as const;

/**
 * Which daily counter one Aster message draws from, its cap, and how a
 * refusal is answered: free users hit their allowance (402 FREE_LIMIT →
 * paywall), Premium users the fair-use cap (429 FAIR_USE → "see you tomorrow").
 */
export function companionAllowance(
  premium: boolean,
  freeLimit: number,
): { quotaKey: string; limit: number; refusal: 'FREE_LIMIT' | 'FAIR_USE' } {
  return premium
    ? { quotaKey: 'premium_companion', limit: PREMIUM_DAILY.companion, refusal: 'FAIR_USE' }
    : { quotaKey: 'free_companion', limit: freeLimit, refusal: 'FREE_LIMIT' };
}

/** Body of the 402 the app turns into its limit card / paywall. */
export interface FreeLimitBody {
  code: 'FREE_LIMIT';
  feature: MeteredFeature;
}

/**
 * Body of the 429 a Premium user gets past `PREMIUM_DAILY`: a friendly
 * "see you tomorrow", never the paywall (they already pay).
 */
export interface FairUseBody {
  code: 'FAIR_USE';
  feature: keyof typeof PREMIUM_DAILY;
}

/**
 * One tarot reading = one spread (its cards, their orientation, category and
 * layout). Every /tarot/card and /tarot/synthesis call for the same spread
 * carries the same key, so a reading is counted once however many calls it takes
 * and reopening today's reading is free.
 */
export function tarotReadingKey(input: {
  spread?: string;
  category: string;
  cards: { cardId: string; reversed?: boolean }[];
}): string {
  const cards = input.cards.map((c) => `${c.cardId}:${c.reversed ? 1 : 0}`).join(',');
  return createHash('sha256')
    .update(`${input.spread ?? 'three'}|${input.category}|${cards}`)
    .digest('hex')
    .slice(0, 24);
}
