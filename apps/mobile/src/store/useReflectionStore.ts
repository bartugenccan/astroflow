import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "../services/secureStorage";
import { localDay } from "./useAffirmationStore";
import type { PracticeDay, PracticeMethod, PracticeSlot } from "../services/types";

/** How many days of evening reflections (and practice / gratitude days) to keep on the device. */
const KEEP_DAYS = 60;
const KEEP_RITUALS = 24;

/** A practice step that happened on a day. */
export type PracticeMark =
  | { method: "script" }
  | { method: "read" }
  | { method: "369"; slot: PracticeSlot }
  | { method: "visualize" };

interface ReflectionStore {
  /** Evening "close the day" notes by local day (YYYY-MM-DD) → three lines. */
  days: Record<string, string[]>;
  /** Moon rituals by phase key ("new:2026-11-20") → what was written. */
  rituals: Record<string, string>;
  /** What was practised, by local day. */
  practice: Record<string, PracticeDay>;
  /** Gratitude lines from the visualize practice, by local day. Never leaves the phone (except the encrypted vault). */
  gratitude: Record<string, string[]>;
  /** Practice methods whose "Why?" card has been read in full (later it folds into a tip). */
  seenWhy: PracticeMethod[];
  closeDay: (items: string[]) => void;
  saveRitual: (key: string, text: string) => void;
  markPractice: (mark: PracticeMark) => void;
  saveGratitude: (items: string[]) => void;
  markWhySeen: (method: PracticeMethod) => void;
  reset: () => void;
}

function trim<T>(rec: Record<string, T>, keep: number): Record<string, T> {
  const keys = Object.keys(rec).sort();
  if (keys.length <= keep) return rec;
  const out: Record<string, T> = {};
  for (const k of keys.slice(-keep)) out[k] = rec[k];
  return out;
}

function applyMark(day: PracticeDay, mark: PracticeMark): PracticeDay {
  switch (mark.method) {
    case "script":
      return { ...day, script: true };
    case "read":
      return { ...day, read: (day.read ?? 0) + 1 };
    case "369":
      return { ...day, s369: { ...day.s369, [mark.slot]: true } };
    case "visualize":
      return { ...day, visualize: true };
  }
}

/**
 * Private journaling for the Manifest tab. These words never leave the phone
 * (Keychain/Keystore) except in the user's own encrypted vault backup — only
 * the fact that a reflection, ritual or practice happened is reported to Aster.
 * Script and 3-6-9 lines are sent as check-in notes by the practice itself;
 * nothing written here is sent to the AI.
 */
export const useReflectionStore = create<ReflectionStore>()(
  persist(
    (set) => ({
      days: {},
      rituals: {},
      practice: {},
      gratitude: {},
      seenWhy: [],
      closeDay: (items) =>
        set((s) => ({ days: trim({ ...s.days, [localDay()]: items.map((x) => x.trim()).slice(0, 3) }, KEEP_DAYS) })),
      saveRitual: (key, text) => set((s) => ({ rituals: trim({ ...s.rituals, [key]: text.trim() }, KEEP_RITUALS) })),
      markPractice: (mark) =>
        set((s) => {
          const day = localDay();
          return { practice: trim({ ...s.practice, [day]: applyMark(s.practice[day] ?? {}, mark) }, KEEP_DAYS) };
        }),
      saveGratitude: (items) =>
        set((s) => ({
          gratitude: trim(
            { ...s.gratitude, [localDay()]: items.map((x) => x.trim()).filter(Boolean).slice(0, 3) },
            KEEP_DAYS,
          ),
        })),
      markWhySeen: (method) =>
        set((s) => (s.seenWhy.includes(method) ? s : { seenWhy: [...s.seenWhy, method] })),
      reset: () => set({ days: {}, rituals: {}, practice: {}, gratitude: {}, seenWhy: [] }),
    }),
    {
      name: "astroflow-reflections",
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({
        days: s.days,
        rituals: s.rituals,
        practice: s.practice,
        gratitude: s.gratitude,
        seenWhy: s.seenWhy,
      }),
    },
  ),
);
