import type { Ionicons } from "@expo/vector-icons";
import type { Intention, PracticeDay, PracticeMethod, PracticeSlot } from "../../services/types";
import type { Tone } from "../../lib/design-system";
import { isDoneToday, starLook, type LunarInfo } from "./wishModel";

/**
 * The guided manifest practice: which method to suggest today, and the small
 * facts each method needs. Pure functions — no stores, no I/O — so the picker
 * reads the same on every screen that shows "today's practice".
 */

export const PRACTICE_METHODS: readonly PracticeMethod[] = ["script", "read", "369", "visualize"];

/** Icon and tone for a method's tile, chip and progress. */
export const METHOD_LOOK: Record<PracticeMethod, { icon: keyof typeof Ionicons.glyphMap; tone: Tone }> = {
  script: { icon: "create", tone: "primary" },
  read: { icon: "megaphone", tone: "candy" },
  "369": { icon: "list", tone: "star" },
  visualize: { icon: "eye", tone: "sky" },
};

/** How many lines each 3-6-9 session asks for. */
export const SLOT_REPS: Record<PracticeSlot, number> = { morning: 3, noon: 6, evening: 9 };
export const SLOTS: readonly PracticeSlot[] = ["morning", "noon", "evening"];

/** Times the affirmation is read aloud in one "read" practice. */
export const READ_REPS = 3;

/** Seconds of guided visualisation before the gratitude page. */
export const VISUALIZE_SECONDS = 60;

/** A scripted page needs at least this many characters to count. */
export const SCRIPT_MIN_CHARS = 20;

/** The 3-6-9 session for a local hour: 05–12 morning, 12–18 noon, otherwise evening. */
export function slotFor(hour: number): PracticeSlot {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "noon";
  return "evening";
}

export function isMethod(v: unknown): v is PracticeMethod {
  return typeof v === "string" && (PRACTICE_METHODS as readonly string[]).includes(v);
}

/** Is this method done for today (for 3-6-9: the current session)? */
export function methodDone(day: PracticeDay | undefined, method: PracticeMethod, slot: PracticeSlot): boolean {
  if (!day) return false;
  switch (method) {
    case "script":
      return !!day.script;
    case "read":
      return (day.read ?? 0) > 0;
    case "369":
      return !!day.s369?.[slot];
    case "visualize":
      return !!day.visualize;
  }
}

/** How many of today's 3-6-9 sessions are done (0–3). */
export function sessionsDone(day: PracticeDay | undefined): number {
  return SLOTS.filter((s) => day?.s369?.[s]).length;
}

/**
 * The manifestation a practice is about: today's power manifestation while it
 * still wants care, then a resting one, then any open one, then the first
 * that isn't waiting for the new moon.
 */
export function pickWish(wishes: Intention[], powerIntentionId: string | null): Intention | null {
  const live = wishes.filter((w) => starLook(w) !== "waiting");
  const open = live.filter((w) => !isDoneToday(w));
  return (
    open.find((w) => w.id === powerIntentionId) ??
    open.find((w) => starLook(w) === "resting") ??
    open[0] ??
    live[0] ??
    null
  );
}

export type PracticeSuggestion =
  | { kind: "moon"; phase: "new" | "full" }
  | { kind: "method"; method: PracticeMethod; wish: Intention | null; slot: PracticeSlot; power: boolean }
  | { kind: "done" };

/**
 * Today's one suggested practice, in priority order:
 *   1. the Moon ritual inside a new/full moon window (until it's done);
 *   2. by time of day — morning: the 3-6-9 session, then scripting;
 *      noon: reading aloud, then the 3-6-9 session;
 *      evening: visualise + gratitude (it closes the day), then the 3-6-9 session;
 *   3. anything still undone today;
 *   4. otherwise "done" (rest is part of it).
 * Returns null when there are no manifestations yet (the empty state leads).
 */
export function pickPractice(input: {
  lunar: LunarInfo;
  ritualDone: boolean;
  hour: number;
  day: PracticeDay | undefined;
  wishes: Intention[];
  powerIntentionId: string | null;
}): PracticeSuggestion | null {
  const { lunar, ritualDone, hour, day, wishes, powerIntentionId } = input;
  if (wishes.length === 0) return null;
  if (lunar.window && !ritualDone) return { kind: "moon", phase: lunar.window.phase };

  const slot = slotFor(hour);
  const wish = pickWish(wishes, powerIntentionId);
  const power = !!wish && wish.id === powerIntentionId;
  const order: PracticeMethod[] =
    slot === "morning"
      ? ["369", "script", "read", "visualize"]
      : slot === "noon"
        ? ["read", "369", "script", "visualize"]
        : ["visualize", "369", "read", "script"];
  const next = order.find((m) => !methodDone(day, m, slot));
  if (!next) return { kind: "done" };
  return { kind: "method", method: next, wish, slot, power };
}
