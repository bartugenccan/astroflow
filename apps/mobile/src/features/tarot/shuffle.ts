import { getRandomValues } from "expo-crypto";
import type { TarotDrawnCard } from "../../services/types";
import { REVERSED_CHANCE, TAROT_DECK } from "./deck";

/** The deck as it sits on the table: order + which way each card faces. */
export interface DeckState {
  order: string[];
  reversed: Record<string, boolean>;
}

/** Uniform float in [0, 1) from the OS CSPRNG. */
function random(): number {
  return getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000;
}

export function freshDeck(): DeckState {
  return shufflePass({
    order: TAROT_DECK.map((c) => c.id),
    reversed: {},
  });
}

/**
 * One pass of the shuffle: Fisher–Yates over the whole deck, and every card
 * gets a fresh chance to turn upside down. Called on each riffle while the
 * user shuffles, so the moment they press Stop decides the draw.
 */
export function shufflePass(deck: DeckState): DeckState {
  const order = [...deck.order];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const reversed: Record<string, boolean> = {};
  for (const id of order) reversed[id] = random() < REVERSED_CHANCE;
  return { order, reversed };
}

/** The whole deck, in shuffled order, as it is spread into the fan. */
export function dealAll(deck: DeckState): TarotDrawnCard[] {
  return deck.order.map((cardId) => ({ cardId, reversed: deck.reversed[cardId] }));
}
