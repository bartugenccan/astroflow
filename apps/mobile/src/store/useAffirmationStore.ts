import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Affirmation, AffirmationCategory, AffirmationDay } from "../services/types";

export const AFFIRMATION_CATEGORIES: AffirmationCategory[] = [
  "money",
  "love",
  "career",
  "health",
  "confidence",
  "calm",
];

const BUILTIN_SLOTS = ["a1", "a2", "a3", "a4", "a5", "a6"] as const;

/** The shipped library, one entry per i18n slot. Ids are stable ("money.a3"). */
export const BUILTIN_AFFIRMATIONS: Affirmation[] = AFFIRMATION_CATEGORIES.flatMap((category) =>
  BUILTIN_SLOTS.map((slot) => ({
    id: `${category}.${slot}`,
    category,
    builtinKey: `affirmations.items.${category}.${slot}`,
    custom: false,
    createdAt: "1970-01-01T00:00:00.000Z",
  })),
);

/** How many days of history to keep — enough for a year of streaks. */
const HISTORY_DAYS = 400;

/** Local calendar day, "YYYY-MM-DD" (not UTC — a practice belongs to the user's day). */
export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + delta));
}

/**
 * Device-local affirmation practice: the user's own affirmations, what was
 * repeated and ticked each day, and where their voice recordings live.
 * Deliberately not synced to the backend — it's personal, works offline, and
 * the recordings never leave the phone.
 */
interface AffirmationState {
  customs: Affirmation[];
  days: Record<string, AffirmationDay>;
  recordings: Record<string, string>;

  addCustom: (category: AffirmationCategory, text: string) => Affirmation;
  removeCustom: (id: string) => void;
  repeat: (id: string) => void;
  toggleDone: (id: string) => boolean;
  setRecording: (id: string, uri: string | null) => void;
}

function today(days: Record<string, AffirmationDay>): AffirmationDay {
  const date = localDay();
  return days[date] ?? { date, done: [], reps: {} };
}

function prune(days: Record<string, AffirmationDay>): Record<string, AffirmationDay> {
  const keys = Object.keys(days).sort();
  if (keys.length <= HISTORY_DAYS) return days;
  const keep = keys.slice(-HISTORY_DAYS);
  return Object.fromEntries(keep.map((k) => [k, days[k]]));
}

export const useAffirmationStore = create<AffirmationState>()(
  persist(
    (set, get) => ({
      customs: [],
      days: {},
      recordings: {},

      addCustom: (category, text) => {
        const a: Affirmation = {
          id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          category,
          text: text.trim(),
          custom: true,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ customs: [a, ...s.customs] }));
        return a;
      },

      removeCustom: (id) =>
        set((s) => {
          const recordings = { ...s.recordings };
          delete recordings[id];
          return { customs: s.customs.filter((c) => c.id !== id), recordings };
        }),

      repeat: (id) =>
        set((s) => {
          const day = today(s.days);
          const reps = { ...day.reps, [id]: (day.reps[id] ?? 0) + 1 };
          return { days: prune({ ...s.days, [day.date]: { ...day, reps } }) };
        }),

      toggleDone: (id) => {
        const day = today(get().days);
        const nowDone = !day.done.includes(id);
        const done = nowDone ? [...day.done, id] : day.done.filter((x) => x !== id);
        set((s) => ({ days: prune({ ...s.days, [day.date]: { ...day, done } }) }));
        return nowDone;
      },

      setRecording: (id, uri) =>
        set((s) => {
          const recordings = { ...s.recordings };
          if (uri) recordings[id] = uri;
          else delete recordings[id];
          return { recordings };
        }),
    }),
    {
      name: "astroflow-affirmations",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Category an affirmation id belongs to (built-in ids carry it as a prefix). */
function categoryOf(id: string, customs: Affirmation[]): AffirmationCategory | null {
  const custom = customs.find((c) => c.id === id);
  if (custom) return custom.category;
  const prefix = id.split(".")[0] as AffirmationCategory;
  return AFFIRMATION_CATEGORIES.includes(prefix) ? prefix : null;
}

/**
 * Consecutive days (ending today, or yesterday if today isn't done yet) on
 * which at least one affirmation in `category` was ticked.
 */
export function categoryStreak(
  days: Record<string, AffirmationDay>,
  customs: Affirmation[],
  category: AffirmationCategory,
): number {
  const hit = (key: string) =>
    (days[key]?.done ?? []).some((id) => categoryOf(id, customs) === category);
  let key = localDay();
  if (!hit(key)) key = shiftDay(key, -1);
  let n = 0;
  while (hit(key)) {
    n += 1;
    key = shiftDay(key, -1);
  }
  return n;
}

/** Today's featured affirmation for a category — rotates daily, same all day. */
export function affirmationOfTheDay(list: Affirmation[], date: string = localDay()): Affirmation | null {
  if (!list.length) return null;
  const seed = date.split("-").reduce((acc, part) => acc * 31 + Number(part), 7);
  return list[seed % list.length];
}
