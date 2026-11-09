import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "../services/secureStorage";
import { localDay } from "./useAffirmationStore";

/** How many days of evening reflections to keep on the device. */
const KEEP_DAYS = 60;
const KEEP_RITUALS = 24;

interface ReflectionStore {
  /** Evening "close the day" notes by local day (YYYY-MM-DD) → three lines. */
  days: Record<string, string[]>;
  /** Moon rituals by phase key ("new:2026-11-20") → what was written. */
  rituals: Record<string, string>;
  closeDay: (items: string[]) => void;
  saveRitual: (key: string, text: string) => void;
  reset: () => void;
}

function trim<T>(rec: Record<string, T>, keep: number): Record<string, T> {
  const keys = Object.keys(rec).sort();
  if (keys.length <= keep) return rec;
  const out: Record<string, T> = {};
  for (const k of keys.slice(-keep)) out[k] = rec[k];
  return out;
}

/**
 * Private journaling for the Manifest tab. These words never leave the phone
 * (Keychain/Keystore) — only the fact that a reflection or ritual happened is
 * reported to Aster, so no new data goes to the server or the AI.
 */
export const useReflectionStore = create<ReflectionStore>()(
  persist(
    (set) => ({
      days: {},
      rituals: {},
      closeDay: (items) =>
        set((s) => ({ days: trim({ ...s.days, [localDay()]: items.map((x) => x.trim()).slice(0, 3) }, KEEP_DAYS) })),
      saveRitual: (key, text) => set((s) => ({ rituals: trim({ ...s.rituals, [key]: text.trim() }, KEEP_RITUALS) })),
      reset: () => set({ days: {}, rituals: {} }),
    }),
    {
      name: "astroflow-reflections",
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ days: s.days, rituals: s.rituals }),
    },
  ),
);
