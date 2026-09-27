/** Mirrored in apps/mobile/src/services/types.ts — keep both in sync. */

export const TAROT_CATEGORIES = ['general', 'love', 'career', 'money', 'health', 'spiritual'] as const;
export type TarotCategory = (typeof TAROT_CATEGORIES)[number];

/** One drawn card; its index in the spread is its position (0..2). */
export interface TarotDrawnCard {
  cardId: string;
  reversed: boolean;
}

export interface TarotCardReading {
  cardId: string;
  position: number;
  positionName: string;
  reversed: boolean;
  headline: string;
  keywords: string[];
  /** The card's imagery and archetype, upright or reversed. */
  essence: string;
  /** What the card says in this position of the spread. */
  inPosition: string;
  /** Personal reading: category + question + chart + the day's sky. */
  forYou: string;
  /** The shadow side / what to watch for. */
  shadow: string;
  /** Concrete steps. */
  advice: string;
  /** Golden Dawn astrological correspondence (from the deck data, not the model). */
  astro: string;
}

export interface TarotSynthesis {
  title: string;
  story: string;
  guidance: string[];
  affirmation: string;
}

/** Chart + context the prompts personalise with. */
export interface TarotContext {
  sun: string;
  moon: string;
  rising: string | null;
  transits: string[];
  memory: string;
}
