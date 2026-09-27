import type { Locale } from "../../i18n";
import type { TarotCategory } from "../../services/types";

/**
 * The 78-card Rider–Waite–Smith deck, as the app needs it: ids (the contract
 * with the API — see apps/api/src/modules/tarot/tarot.deck.ts) and names.
 * Meanings and correspondences live on the server.
 */

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

export interface TarotCardInfo {
  id: string;
  arcana: "major" | "minor";
  suit?: TarotSuit;
  rank: number;
  name: Record<Locale, string>;
}

const MAJORS: [string, string][] = [
  ["The Fool", "Deli"],
  ["The Magician", "Büyücü"],
  ["The High Priestess", "Başrahibe"],
  ["The Empress", "İmparatoriçe"],
  ["The Emperor", "İmparator"],
  ["The Hierophant", "Başrahip"],
  ["The Lovers", "Aşıklar"],
  ["The Chariot", "Savaş Arabası"],
  ["Strength", "Güç"],
  ["The Hermit", "Ermiş"],
  ["Wheel of Fortune", "Kader Çarkı"],
  ["Justice", "Adalet"],
  ["The Hanged Man", "Asılan Adam"],
  ["Death", "Ölüm"],
  ["Temperance", "Denge"],
  ["The Devil", "Şeytan"],
  ["The Tower", "Kule"],
  ["The Star", "Yıldız"],
  ["The Moon", "Ay"],
  ["The Sun", "Güneş"],
  ["Judgement", "Yargı"],
  ["The World", "Dünya"],
];

const SUITS: Record<TarotSuit, { en: string; tr: string }> = {
  wands: { en: "Wands", tr: "Asaların" },
  cups: { en: "Cups", tr: "Kupaların" },
  swords: { en: "Swords", tr: "Kılıçların" },
  pentacles: { en: "Pentacles", tr: "Tılsımların" },
};

const RANK_EN = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
const RANK_TR = ["Ası", "İkilisi", "Üçlüsü", "Dörtlüsü", "Beşlisi", "Altılısı", "Yedilisi", "Sekizlisi", "Dokuzlusu", "Onlusu", "Uşağı", "Şövalyesi", "Kraliçesi", "Kralı"];

function buildDeck(): TarotCardInfo[] {
  const deck: TarotCardInfo[] = MAJORS.map(([en, tr], i) => ({
    id: `major_${String(i).padStart(2, "0")}`,
    arcana: "major",
    rank: i,
    name: { en, tr },
  }));
  for (const suit of Object.keys(SUITS) as TarotSuit[]) {
    RANK_EN.forEach((rankEn, idx) => {
      deck.push({
        id: `${suit}_${String(idx + 1).padStart(2, "0")}`,
        arcana: "minor",
        suit,
        rank: idx + 1,
        name: { en: `${rankEn} of ${SUITS[suit].en}`, tr: `${SUITS[suit].tr} ${RANK_TR[idx]}` },
      });
    });
  }
  return deck;
}

export const TAROT_DECK: TarotCardInfo[] = buildDeck();
const BY_ID = new Map(TAROT_DECK.map((c) => [c.id, c]));

export function tarotCardInfo(id: string): TarotCardInfo | undefined {
  return BY_ID.get(id);
}

export const TAROT_CATEGORIES: TarotCategory[] = ["general", "love", "career", "money", "health", "spiritual"];

/**
 * The whole deck goes into the hand fan. At this spacing the fan spans ~346°,
 * so only part of it is on screen at once — the reader turns it with a finger.
 */
export const FAN_STEP_DEG = 4.5;
/** Cards within this angle of 12 o'clock are fully visible; they fade out by 90°. */
export const FAN_VISIBLE_DEG = 72;
/** Cards the reader picks. */
export const SPREAD_SIZE = 3;
/** Chance a card lands reversed on each shuffle pass. */
export const REVERSED_CHANCE = 0.35;
