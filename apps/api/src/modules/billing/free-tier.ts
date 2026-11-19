import { createHash } from 'crypto';

/**
 * Free-tier daily allowances, enforced on the server. Mirrors
 * apps/mobile/src/store/useAppStore.ts (FREE_DAILY_MESSAGES, FREE_DAILY_TAROT);
 * change both together. Bought Stardust passes add their units on top.
 */
export const FREE_DAILY = { companion: 5, tarot: 1 } as const;
export type MeteredFeature = keyof typeof FREE_DAILY;

/** Body of the 402 the app turns into its limit card / paywall. */
export interface FreeLimitBody {
  code: 'FREE_LIMIT';
  feature: MeteredFeature;
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
