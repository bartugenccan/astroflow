import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Locale } from "../i18n";
import { TarotCardReading, TarotSpread, TarotSynthesis } from "../services/types";

/** The day's spread and whatever of its reading has arrived — reopened from the tab. */
export interface SavedTarotReading {
  /** UTC "YYYY-MM-DD", the same day boundary as the free-reading quota. */
  date: string;
  locale: Locale;
  spread: TarotSpread;
  cards: (TarotCardReading | null)[];
  synthesis: TarotSynthesis | null;
}

interface TarotState {
  soundOn: boolean;
  lastReading: SavedTarotReading | null;
  setSoundOn: (v: boolean) => void;
  startReading: (spread: TarotSpread, locale: Locale) => void;
  saveCard: (index: number, reading: TarotCardReading) => void;
  saveSynthesis: (synthesis: TarotSynthesis) => void;
  reset: () => void;
}

export const tarotToday = () => new Date().toISOString().slice(0, 10);

export const useTarotStore = create<TarotState>()(
  persist(
    (set) => ({
      soundOn: true,
      lastReading: null,
      setSoundOn: (soundOn) => set({ soundOn }),
      startReading: (spread, locale) =>
        set({
          lastReading: {
            date: tarotToday(),
            locale,
            spread,
            cards: spread.cards.map(() => null),
            synthesis: null,
          },
        }),
      saveCard: (index, reading) =>
        set((s) => {
          if (!s.lastReading) return s;
          const cards = [...s.lastReading.cards];
          cards[index] = reading;
          return { lastReading: { ...s.lastReading, cards } };
        }),
      saveSynthesis: (synthesis) =>
        set((s) => (s.lastReading ? { lastReading: { ...s.lastReading, synthesis } } : s)),
      reset: () => set({ soundOn: true, lastReading: null }),
    }),
    {
      name: "astroflow-tarot",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ soundOn: s.soundOn, lastReading: s.lastReading }),
    },
  ),
);
