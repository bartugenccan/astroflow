/**
 * Wish-star rules — pure, unit-tested (npm test --workspace @astroflow/api).
 * A wish shines with the care it gets (check-ins and conviction), never with
 * the days that pass, and a quiet spell only makes it "rest" — it never dims.
 * The mobile app mirrors these in src/lib/intentionRules.ts. Change both.
 */

// Kept dependency-free (like mascot-rules.ts) so the tests import it as-is.
/** Days either side of an exact new/full moon that count as its window (= mascot-rules MOON_WINDOW_DAYS). */
const MOON_WINDOW_DAYS = 1.5;

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export type LifeArea = 'love' | 'career' | 'money' | 'energy';

/** The natal house each life area lives in, plus the houses that colour it. */
export const LIFE_AREA_HOUSES: Record<LifeArea, { main: number; related: number[] }> = {
  love: { main: 7, related: [5] },
  career: { main: 10, related: [6] },
  money: { main: 2, related: [8] },
  energy: { main: 1, related: [6] },
};

export type StarState = 'seed' | 'spark' | 'glowing' | 'radiant';

export const STAR_THRESHOLDS = {
  glowing: { checkIns: 7, conviction: 3 },
  radiant: { checkIns: 21, conviction: 3.5 },
} as const;

/** Days without a check-in after which a wish is shown as resting. */
export const REST_AFTER_DAYS = 3;

export interface StarInput {
  totalCheckIns: number;
  avgConviction: number | null;
  lastActiveDate: string | null;
  plantedMoon: string | null;
}

export interface StarView {
  state: StarState;
  resting: boolean;
  /** Planted for a new moon that hasn't come yet. */
  waiting: boolean;
}

/** A planted-for-the-new-moon wish opens once today is inside that moon's window. */
export function isWaitingForMoon(plantedMoon: string | null, today: string): boolean {
  if (!plantedMoon) return false;
  return daysBetween(today, plantedMoon) > Math.floor(MOON_WINDOW_DAYS);
}

export function starState(input: StarInput, today: string): StarView {
  const waiting = isWaitingForMoon(input.plantedMoon, today);
  const conviction = input.avgConviction ?? 0;
  let state: StarState = 'seed';
  if (!waiting && input.totalCheckIns > 0) {
    state = 'spark';
    const g = STAR_THRESHOLDS.glowing;
    const r = STAR_THRESHOLDS.radiant;
    if (input.totalCheckIns >= g.checkIns && conviction >= g.conviction) state = 'glowing';
    if (input.totalCheckIns >= r.checkIns && conviction >= r.conviction) state = 'radiant';
  }
  const resting =
    !waiting && !!input.lastActiveDate && daysBetween(input.lastActiveDate, today) >= REST_AFTER_DAYS;
  return { state, resting, waiting };
}

/** How many power days a stage may see; the rest stay behind Aster's lock. */
export const POWER_DAYS_PREVIEW = 3;
export const POWER_DAYS_MIN_STAGE = 3;

export function visiblePowerDays(stage: number, total: number): number {
  return stage >= POWER_DAYS_MIN_STAGE ? total : Math.min(total, POWER_DAYS_PREVIEW);
}
