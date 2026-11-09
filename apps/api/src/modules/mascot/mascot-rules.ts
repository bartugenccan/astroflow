/**
 * Aster growth rules — pure, dependency-free, unit-testable.
 *
 * Işık (xp) never goes down and decides Aster's stage. Every Işık earned also
 * drops the same amount of Yıldız Tozu (stardust), the spendable balance.
 * Daily caps stop farming: repeatable kinds take a numbered slot per day, and
 * the (deviceId, kind, localDate, refKey) unique key makes awards idempotent.
 *
 * The mobile app keeps a mirror of these numbers in src/lib/mascotRules.ts
 * (used by the offline mock API). Change both together.
 */

export const MASCOT_EVENT_KINDS = [
  'INTENTION_CREATE',
  'CHECKIN',
  'DAY_COMPLETE',
  'MILESTONE',
  'SKY_READ',
  'AFFIRMATION',
  'TAROT',
  'MOON_RITUAL',
  'EVENING_REFLECTION',
  'BREATH',
] as const;

export type MascotEventKind = (typeof MASCOT_EVENT_KINDS)[number];

/** Kinds the app reports itself (the action happens on the device). */
export const CLIENT_EVENT_KINDS: readonly MascotEventKind[] = [
  'AFFIRMATION',
  'TAROT',
  'MOON_RITUAL',
  'EVENING_REFLECTION',
  'BREATH',
];

interface EventRule {
  /** Işık per award. */
  xp: number;
  /** Max awards per local day (across refKeys). */
  dailyCap: number;
  /** Contribution to today's energy bar (0–100 total). */
  energy: number;
  /**
   * slot   — repeatable: refKey is the 1-based slot number for the day.
   * ref    — once per (day, refKey) — e.g. one DAY_COMPLETE per intention.
   * once   — once per refKey ever (moon phases, milestones).
   */
  mode: 'slot' | 'ref' | 'once';
}

export const EVENT_RULES: Record<MascotEventKind, EventRule> = {
  INTENTION_CREATE: { xp: 20, dailyCap: 1, energy: 15, mode: 'slot' },
  CHECKIN: { xp: 10, dailyCap: 3, energy: 20, mode: 'slot' },
  DAY_COMPLETE: { xp: 25, dailyCap: 5, energy: 15, mode: 'ref' },
  MILESTONE: { xp: 100, dailyCap: 5, energy: 10, mode: 'once' },
  SKY_READ: { xp: 5, dailyCap: 1, energy: 10, mode: 'slot' },
  AFFIRMATION: { xp: 10, dailyCap: 2, energy: 20, mode: 'slot' },
  TAROT: { xp: 10, dailyCap: 1, energy: 15, mode: 'slot' },
  MOON_RITUAL: { xp: 50, dailyCap: 1, energy: 30, mode: 'once' },
  EVENING_REFLECTION: { xp: 15, dailyCap: 1, energy: 20, mode: 'slot' },
  BREATH: { xp: 10, dailyCap: 1, energy: 15, mode: 'slot' },
};

// ─── Stages ──────────────────────────────────────────────────────────────────

export const STAGES = [
  { key: 'egg', minXp: 0 },
  { key: 'spark', minXp: 0 },
  { key: 'starling', minXp: 150 },
  { key: 'glimmer', minXp: 500 },
  { key: 'constellation', minXp: 1200 },
  { key: 'nova', minXp: 3000 },
] as const;

export type StageKey = (typeof STAGES)[number]['key'];
export const MAX_STAGE = STAGES.length - 1;

/** Stage for a Işık total. The egg (0) only hatches with the first intention. */
export function stageFor(xp: number, hatched: boolean): number {
  if (!hatched) return 0;
  let stage = 1;
  for (let i = 1; i < STAGES.length; i++) {
    if (xp >= STAGES[i].minXp) stage = i;
  }
  return stage;
}

/** Işık bounds of the current stage, for the progress bar. `next` is null at Nova. */
export function stageBounds(stage: number): { floor: number; next: number | null } {
  const floor = STAGES[Math.max(0, Math.min(stage, MAX_STAGE))].minXp;
  const next = stage >= MAX_STAGE ? null : STAGES[Math.max(stage + 1, 2)].minXp;
  return { floor, next };
}

// ─── Abilities unlocked by stage ─────────────────────────────────────────────

export const ABILITIES = [
  { key: 'skyWhisper', minStage: 1, available: true },
  { key: 'streakShield', minStage: 2, available: true },
  { key: 'powerDays', minStage: 3, available: false },
  { key: 'weeklyLetter', minStage: 4, available: false },
  { key: 'novaTheme', minStage: 5, available: false },
] as const;

// ─── Energy & mood ───────────────────────────────────────────────────────────

export type MascotMood = 'sleepy' | 'happy' | 'glowing';

export function energyFor(kinds: MascotEventKind[]): number {
  const total = kinds.reduce((sum, k) => sum + (EVENT_RULES[k]?.energy ?? 0), 0);
  return Math.max(0, Math.min(100, total));
}

export function moodFor(energy: number): MascotMood {
  if (energy < 25) return 'sleepy';
  if (energy < 70) return 'happy';
  return 'glowing';
}

// ─── Streak shields ──────────────────────────────────────────────────────────

export const MAX_SHIELDS = 3;
export const SHIELD_MIN_STAGE = 2;

/** ISO-8601 week id ("2026-W45") of a YYYY-MM-DD date. */
export function isoWeek(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function shiftDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta, 12)).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export interface StreakPlan {
  /** Streak to show / build on today. */
  effectiveStreak: number;
  /** Missed days that would be bridged with shields (empty when none needed or not enough). */
  bridgeDays: string[];
  /** True when the run is broken and should restart. */
  broken: boolean;
}

/**
 * Decide what a stored streak means today. A streak is alive when the last
 * completed day was today or yesterday. Each missed day in between can be
 * bridged by one shield; with too few shields the streak breaks (shields are
 * then kept, not wasted).
 */
export function planStreak(
  stored: { currentStreak: number; lastActiveDate: string | null },
  today: string,
  shieldsAvailable: number,
): StreakPlan {
  if (!stored.lastActiveDate || stored.currentStreak <= 0) {
    return { effectiveStreak: 0, bridgeDays: [], broken: false };
  }
  const gap = daysBetween(stored.lastActiveDate, today);
  if (gap <= 1) return { effectiveStreak: stored.currentStreak, bridgeDays: [], broken: false };
  const missed = gap - 1;
  if (missed <= shieldsAvailable) {
    const bridgeDays = Array.from({ length: missed }, (_, i) => shiftDays(stored.lastActiveDate as string, i + 1));
    return { effectiveStreak: stored.currentStreak, bridgeDays, broken: false };
  }
  return { effectiveStreak: 0, bridgeDays: [], broken: true };
}

// ─── Merging two subjects (sign-in on an existing account) ──────────────────

export interface MergeEvent {
  id: string;
  kind: string;
  localDate: string;
  refKey: string;
  xp: number;
}

/**
 * Which of `from`'s events can join `into` without breaking the ledger. A row
 * is dropped when `into` already holds the same (kind, localDate, refKey) —
 * the unique key — or, for once-ever kinds (moon rituals, milestones), the
 * same (kind, refKey) on any day. `movedXp` is the Işık the moved rows carry.
 */
export function partitionMergeEvents(
  from: MergeEvent[],
  into: MergeEvent[],
): { moveIds: string[]; dropIds: string[]; movedXp: number } {
  const exact = new Set(into.map((e) => `${e.kind}|${e.localDate}|${e.refKey}`));
  const onceKeys = new Set(
    into.filter((e) => EVENT_RULES[e.kind as MascotEventKind]?.mode === 'once').map((e) => `${e.kind}|${e.refKey}`),
  );
  const moveIds: string[] = [];
  const dropIds: string[] = [];
  let movedXp = 0;
  for (const e of from) {
    const once = EVENT_RULES[e.kind as MascotEventKind]?.mode === 'once';
    const clash = exact.has(`${e.kind}|${e.localDate}|${e.refKey}`) || (once && onceKeys.has(`${e.kind}|${e.refKey}`));
    if (clash) {
      dropIds.push(e.id);
    } else {
      moveIds.push(e.id);
      movedXp += e.xp;
      if (once) onceKeys.add(`${e.kind}|${e.refKey}`);
    }
  }
  return { moveIds, dropIds, movedXp };
}

export interface MergeableMascot {
  xp: number;
  stardust: number;
  shields: number;
  equipped: string[];
  owned: string[];
  lastFreeShieldWeek: string | null;
  hatchedAt: Date | null;
}

/**
 * The account's Aster after an anonymous install's Aster joins it. Işık grows
 * by exactly what the moved events carry (so nothing is counted twice);
 * stardust grows by the same amount but never by more than `from` had left
 * unspent. Purchases are united, the account keeps what it is wearing, and
 * the earliest hatch wins. The caller recomputes the stage with `stageFor`.
 */
export function mergeMascotState(
  into: MergeableMascot | null,
  from: MergeableMascot,
  movedXp: number,
): MergeableMascot {
  if (!into) return { ...from };
  const hatches = [into.hatchedAt, from.hatchedAt].filter((d): d is Date => !!d);
  return {
    xp: into.xp + movedXp,
    stardust: into.stardust + Math.max(0, Math.min(movedXp, from.stardust)),
    shields: Math.min(MAX_SHIELDS, Math.max(into.shields, from.shields)),
    equipped: into.equipped.length > 0 ? into.equipped : from.equipped,
    owned: [...new Set([...into.owned, ...from.owned])],
    lastFreeShieldWeek: into.lastFreeShieldWeek ?? from.lastFreeShieldWeek,
    hatchedAt: hatches.length ? new Date(Math.min(...hatches.map((d) => d.getTime()))) : null,
  };
}

// ─── Moon ritual window ──────────────────────────────────────────────────────

const SYNODIC = 29.53058867;
const KNOWN_NEW_MOON_DAYS = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
/** Days either side of the exact new / full moon that count as "the ritual window". */
export const MOON_WINDOW_DAYS = 1.5;

export interface LunarWindow {
  phase: 'new' | 'full';
  /** UTC date of the (mean) exact phase — the ritual's refKey. */
  peakDate: string;
}

/**
 * The new or full moon the given instant falls within ±1.5 days of, if any.
 * Mean synodic cycle — accurate to well under a day, plenty for a ritual
 * window. Matches the mobile MoonPhase component.
 */
export function lunarWindow(now: Date): LunarWindow | null {
  const days = now.getTime() / 86400000;
  const age = (((days - KNOWN_NEW_MOON_DAYS) % SYNODIC) + SYNODIC) % SYNODIC;
  const candidates: { phase: 'new' | 'full'; offset: number }[] = [
    { phase: 'new', offset: -age },
    { phase: 'new', offset: SYNODIC - age },
    { phase: 'full', offset: SYNODIC / 2 - age },
  ];
  for (const c of candidates) {
    if (Math.abs(c.offset) <= MOON_WINDOW_DAYS) {
      const peak = new Date((days + c.offset) * 86400000);
      return { phase: c.phase, peakDate: peak.toISOString().slice(0, 10) };
    }
  }
  return null;
}
