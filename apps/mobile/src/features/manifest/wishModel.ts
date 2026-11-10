import type { Ionicons } from "@expo/vector-icons";
import type { Locale, TFunction, TranslationKey } from "../../i18n";
import type {
  AffirmationCategory,
  DailyPlan,
  Intention,
  LifeArea,
  StarState,
} from "../../services/types";
import { daysBetween, lunarProgress, lunarWindow, nextLunarPeak, type LunarWindow } from "../../lib/mascotRules";
import { LIFE_AREA_HOUSES } from "../../lib/intentionRules";
import { localDay } from "../../store/useAffirmationStore";
import { useMascotStore } from "../../store/useMascotStore";
import { moonPhaseKey, type MoonPhaseKey } from "../../components/MoonPhase";
import { houseLabel } from "../../lib/astroLanguage";
import { areaTone, type Tone } from "../../lib/design-system";

/**
 * Pure helpers behind the Wish Stars screens: how a wish looks in the sky,
 * where the Moon is in its cycle, and the wording that ties both to the
 * user's chart. No React here except the tiny celebration helper at the end.
 */

export const LIFE_AREAS: LifeArea[] = ["love", "career", "money", "energy"];

export const AREA_ICON: Record<LifeArea, keyof typeof Ionicons.glyphMap> = {
  love: "heart",
  career: "briefcase",
  money: "cash",
  energy: "flash",
};

export function isLifeArea(v: unknown): v is LifeArea {
  return typeof v === "string" && (LIFE_AREAS as string[]).includes(v);
}

export function toneOf(it: Pick<Intention, "lifeArea" | "category">): Tone {
  return areaTone[it.lifeArea] ?? areaTone[it.category] ?? "primary";
}

/** Life area → the affirmation category that fits it best. */
export const AREA_AFFIRMATION: Record<LifeArea, AffirmationCategory> = {
  love: "love",
  career: "career",
  money: "money",
  energy: "health",
};

// ─── Star look ───────────────────────────────────────────────────────────────

/** What the sky draws for one wish: never dimmer when resting, only softer. */
export type StarLook = StarState | "resting" | "waiting";

export function starLook(it: Pick<Intention, "star">): StarLook {
  const s = it.star;
  if (!s) return "seed";
  if (s.waiting) return "waiting";
  if (s.resting) return "resting";
  return s.state;
}

/** Relative glyph size per look (1 = the biggest star). */
export const LOOK_SCALE: Record<StarLook, number> = {
  waiting: 0.5,
  seed: 0.55,
  spark: 0.7,
  resting: 0.72,
  glowing: 0.86,
  radiant: 1,
};

export function stateLabel(t: TFunction, look: StarLook): string {
  return t(`wish.states.${look}` as TranslationKey);
}

// ─── Deterministic placement ─────────────────────────────────────────────────

/** FNV-1a — a stable 32-bit hash of the wish id. */
function hash(s: string, seed = 2166136261): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export interface SkyPoint {
  id: string;
  /** 0..1 across the canvas. */
  x: number;
  /** 0..1 down the canvas. */
  y: number;
}

/**
 * Place each wish in the sky from its id alone, so a star never jumps around
 * between visits. Older wishes claim their spot first; a newer one tries a few
 * hashed candidates until it finds room (stars must stay tappable).
 */
export function placeStars(
  ids: string[],
  minGap = 0.2,
  /** Spots already taken (Aster's corner) — kept clear, not returned. */
  avoid: { x: number; y: number }[] = [],
): SkyPoint[] {
  const placed: SkyPoint[] = avoid.map((p, i) => ({ id: `__avoid${i}`, ...p }));
  for (const id of ids) {
    let best: SkyPoint | null = null;
    let bestGap = -1;
    for (let attempt = 0; attempt < 16; attempt++) {
      const h1 = hash(`${id}:${attempt}`);
      const h2 = hash(`${id}:${attempt}`, h1);
      const p = { id, x: 0.12 + ((h1 % 1000) / 1000) * 0.76, y: 0.16 + ((h2 % 1000) / 1000) * 0.68 };
      const gap = placed.reduce((m, q) => Math.min(m, Math.hypot(p.x - q.x, (p.y - q.y) * 0.8)), Infinity);
      if (gap >= minGap) {
        best = p;
        break;
      }
      if (gap > bestGap) {
        bestGap = gap;
        best = p;
      }
    }
    placed.push(best!);
  }
  return placed.slice(avoid.length);
}

// ─── The Moon ────────────────────────────────────────────────────────────────

export interface LunarInfo {
  /** 0 new → 0.5 full → 1 next new. */
  progress: number;
  /** Day of the ~29.5-day cycle, 1-based. */
  day: number;
  phaseKey: MoonPhaseKey;
  waxing: boolean;
  /** Inside a new/full moon window (ritual time). */
  window: LunarWindow | null;
  windowKey: string | null;
  daysToNew: number;
  daysToFull: number;
  nextNew: string;
}

export function lunarInfo(now: Date = new Date()): LunarInfo {
  const progress = lunarProgress(now);
  const window = lunarWindow(now);
  const today = localDay(now);
  const nextNew = nextLunarPeak(now, "new");
  const nextFull = nextLunarPeak(now, "full");
  return {
    progress,
    day: Math.min(30, Math.floor(progress * 29.53) + 1),
    phaseKey: moonPhaseKey(progress),
    waxing: progress < 0.5,
    window,
    windowKey: window ? `${window.phase}:${window.peakDate}` : null,
    daysToNew: Math.max(0, daysBetween(today, nextNew)),
    daysToFull: Math.max(0, daysBetween(today, nextFull)),
    nextNew,
  };
}

/** "today" / "tomorrow" / "in 5 days" (wording from i18n). */
export function whenLabel(t: TFunction, days: number): string {
  if (days <= 0) return t("wish.when.today");
  if (days === 1) return t("wish.when.tomorrow");
  return t("wish.when.days", { n: days });
}

/** Days until a waiting wish opens (its planted new moon). */
export function daysUntilOpen(it: Pick<Intention, "plantedMoon">, now: Date = new Date()): number {
  if (!it.plantedMoon) return 0;
  return Math.max(0, daysBetween(localDay(now), it.plantedMoon));
}

/** The life area whose house the Moon is crossing, or null. */
export function areaForHouse(house: number): LifeArea | null {
  for (const area of LIFE_AREAS) if (LIFE_AREA_HOUSES[area].main === house) return area;
  for (const area of LIFE_AREAS) if (LIFE_AREA_HOUSES[area].related.includes(house)) return area;
  return null;
}

/**
 * The hero's personal line: where the Moon is in the user's chart today and
 * what that asks of the matching wish (act while waxing, release while waning).
 */
export function personalMoonLine(
  t: TFunction,
  locale: Locale,
  plan: DailyPlan | null,
  waxing: boolean,
): string | null {
  if (!plan?.moon) return null;
  const area = areaForHouse(plan.moon.natalHouse) ?? plan.focusArea;
  const params = {
    house: houseLabel(t, locale, plan.moon.natalHouse),
    area: t(`wish.areas.${area}.inline` as TranslationKey),
  };
  return waxing ? t("wish.lunar.personalAct", params) : t("wish.lunar.personalRelease", params);
}

/** The affirmation category today's plan suggests, if any. */
export function planAffirmationCategory(plan: DailyPlan | null): AffirmationCategory | null {
  if (!plan) return null;
  const step = [...plan.steps, ...plan.anchors].find((s) => s.kind === "AFFIRMATION" && s.prefill?.category);
  return step?.prefill?.category ?? AREA_AFFIRMATION[plan.focusArea] ?? null;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** A short local date ("Nov 10" / "10 Kas"); tolerates "YYYY-MM-DD" and ISO stamps. */
export function shortDate(locale: Locale, value: string | null | undefined): string {
  if (!value) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { month: "short", day: "numeric" });
}

export function weekdayShort(locale: Locale, day: string): string {
  const d = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
  return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { weekday: "short" });
}

export function isDoneToday(it: Pick<Intention, "progress">): boolean {
  return it.progress.count >= it.progress.target;
}

// ─── Celebration ─────────────────────────────────────────────────────────────

/**
 * A wish came true: queue the "manifested" celebration (it carries the delta,
 * so it can show the Işık earned). A plain applyDelta would queue a second
 * "reward" pop for the same award, so the delta only goes through applyDelta
 * when it also hatched or levelled Aster up; otherwise the state is refreshed.
 */
export function celebrateManifested(res: Intention, wishText: string): void {
  const store = useMascotStore.getState();
  const delta = res.mascot ?? null;
  store.celebrate({ type: "manifested", delta, wishText });
  store.applyDelta(delta && (delta.leveledUp || delta.hatched) ? delta : null);
}
