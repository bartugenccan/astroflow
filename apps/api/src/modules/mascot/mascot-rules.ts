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
  'SKY_CHECKIN',
  'JOURNEY_RETURN',
  'MANIFESTED',
  'ACCOUNT_LINKED',
  'SKY_LESSON',
  'SIGN_LOG',
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
  /** Yıldız Tozu per award; defaults to `xp`. */
  stardust?: number;
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
  SKY_CHECKIN: { xp: 10, dailyCap: 1, energy: 25, mode: 'slot' },
  JOURNEY_RETURN: { xp: 30, dailyCap: 1, energy: 0, mode: 'ref' },
  MANIFESTED: { xp: 75, dailyCap: 3, energy: 20, mode: 'once' },
  ACCOUNT_LINKED: { xp: 0, stardust: 50, dailyCap: 1, energy: 0, mode: 'once' },
  // A Harita Yolu lesson finished: once per chapter, at most two paid lessons a day.
  SKY_LESSON: { xp: 20, dailyCap: 2, energy: 15, mode: 'once' },
  // A sign logged on a manifest ("I noticed something").
  SIGN_LOG: { xp: 5, dailyCap: 1, energy: 5, mode: 'slot' },
};

/** Yıldız Tozu one award of `kind` drops. */
export function stardustFor(kind: MascotEventKind): number {
  const rule = EVENT_RULES[kind];
  return rule.stardust ?? rule.xp;
}

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
  { key: 'powerDays', minStage: 3, available: true },
  { key: 'weeklyLetter', minStage: 4, available: true },
  { key: 'novaTheme', minStage: 5, available: true },
] as const;

// ─── Harita Yolu: the chart, chapter by chapter ──────────────────────────────

/**
 * The guided chart lessons, in path order. A chapter opens once the one before
 * it is done AND Aster has reached `minStage` — or early, for `earlyPrice`
 * Yıldız Tozu. The full wheel and placements stay free; only the guided
 * readings sit on the path. Points buy depth, Premium sells volume.
 */
export const SKY_PATH = [
  { key: 'bigThree', minStage: 0, earlyPrice: 0 },
  { key: 'chartMood', minStage: 0, earlyPrice: 0 },
  { key: 'personal', minStage: 0, earlyPrice: 0 },
  { key: 'housesSelf', minStage: 2, earlyPrice: 150 },
  { key: 'housesWorld', minStage: 2, earlyPrice: 150 },
  { key: 'aspects', minStage: 3, earlyPrice: 250 },
  { key: 'jupiterSaturn', minStage: 3, earlyPrice: 250 },
  { key: 'nodes', minStage: 4, earlyPrice: 400 },
] as const;

export type SkyLessonKey = (typeof SKY_PATH)[number]['key'];
export type LessonStatus = 'done' | 'open' | 'lockedPrev' | 'lockedStage';

export function isSkyLessonKey(key: string): key is SkyLessonKey {
  return SKY_PATH.some((c) => c.key === key);
}

export interface LessonProgress {
  stage: number;
  done: readonly string[];
  early: readonly string[];
}

/** Where one chapter stands. Order wins over stage: a chapter never opens before the one above it. */
export function lessonStatus(key: SkyLessonKey, p: LessonProgress): LessonStatus {
  const i = SKY_PATH.findIndex((c) => c.key === key);
  if (p.done.includes(key)) return 'done';
  const prev = i > 0 ? SKY_PATH[i - 1].key : null;
  if (prev && !p.done.includes(prev)) return 'lockedPrev';
  if (p.stage >= SKY_PATH[i].minStage || p.early.includes(key)) return 'open';
  return 'lockedStage';
}

export function skyPathView(p: LessonProgress) {
  return SKY_PATH.map((c) => ({
    key: c.key,
    status: lessonStatus(c.key, p),
    minStage: c.minStage,
    earlyPrice: c.earlyPrice,
    early: p.early.includes(c.key),
  }));
}

/** Can this chapter be bought early right now? Only when stage is the one thing in the way. */
export function canUnlockEarly(key: SkyLessonKey, p: LessonProgress): boolean {
  const c = SKY_PATH.find((x) => x.key === key);
  if (!c || c.earlyPrice <= 0 || p.early.includes(key) || p.done.includes(key)) return false;
  return p.stage < c.minStage;
}

// ─── Tarot spreads unlocked by stage ─────────────────────────────────────────

export const TAROT_SPREAD_STAGE = { three: 0, decision: 3 } as const;
export type TarotSpreadKey = keyof typeof TAROT_SPREAD_STAGE;

export function spreadUnlocked(spread: TarotSpreadKey, stage: number): boolean {
  return stage >= TAROT_SPREAD_STAGE[spread];
}

// ─── What the next stage opens ──────────────────────────────────────────────

export interface StageUnlocks {
  stage: number;
  lessons: SkyLessonKey[];
  spreads: TarotSpreadKey[];
  abilities: string[];
}

/**
 * Everything that opens on reaching `stage` (catalog items are added by the
 * caller, which owns the catalog). Shown as "Sıradaki açılım" so Işık always
 * points at something worth having.
 */
export function unlocksAt(stage: number): StageUnlocks {
  return {
    stage,
    lessons: SKY_PATH.filter((c) => c.minStage === stage && c.minStage > 0).map((c) => c.key),
    spreads: (Object.keys(TAROT_SPREAD_STAGE) as TarotSpreadKey[]).filter(
      (k) => TAROT_SPREAD_STAGE[k] === stage && stage > 0,
    ),
    abilities: ABILITIES.filter((a) => a.minStage === stage && a.available).map((a) => a.key),
  };
}

// ─── Premium tastes bought with stardust ─────────────────────────────────────

/** One-off extra uses of a metered feature, for free users. One of each per local day. */
export const PASSES = { tarot: { amount: 1 }, chat: { amount: 5 } } as const;
export type PassFeature = keyof typeof PASSES;
export const PASS_DAILY_MAX = 1;

/** Today's bought passes from the stored `{ day: { feature: n } }` map; other days are dropped. */
export function passesToday(stored: unknown, today: string): Partial<Record<PassFeature, number>> {
  if (!stored || typeof stored !== 'object') return {};
  const day = (stored as Record<string, unknown>)[today];
  if (!day || typeof day !== 'object') return {};
  const out: Partial<Record<PassFeature, number>> = {};
  for (const f of Object.keys(PASSES) as PassFeature[]) {
    const n = (day as Record<string, unknown>)[f];
    if (typeof n === 'number' && n > 0) out[f] = n;
  }
  return out;
}

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
  pausedDays: ReadonlySet<string> = new Set(),
): StreakPlan {
  if (!stored.lastActiveDate || stored.currentStreak <= 0) {
    return { effectiveStreak: 0, bridgeDays: [], broken: false };
  }
  const gap = daysBetween(stored.lastActiveDate, today);
  if (gap <= 1) return { effectiveStreak: stored.currentStreak, bridgeDays: [], broken: false };
  // Eclipse (rest) days are neither missed nor bridged — they simply don't count.
  const missedDays = Array.from({ length: gap - 1 }, (_, i) => shiftDays(stored.lastActiveDate as string, i + 1)).filter(
    (d) => !pausedDays.has(d),
  );
  if (missedDays.length <= shieldsAvailable) {
    return { effectiveStreak: stored.currentStreak, bridgeDays: missedDays, broken: false };
  }
  return { effectiveStreak: 0, bridgeDays: [], broken: true };
}

// ─── Eclipse: a chosen rest ──────────────────────────────────────────────────

export const ECLIPSE_MAX_DAYS = 14;

export interface Eclipse {
  start: string | null;
  end: string | null;
}

/** Every local day of the eclipse, inclusive. */
export function eclipseDays(e: Eclipse): Set<string> {
  if (!e.start || !e.end) return new Set();
  const n = daysBetween(e.start, e.end);
  if (n < 0) return new Set();
  return new Set(Array.from({ length: n + 1 }, (_, i) => shiftDays(e.start as string, i)));
}

export function eclipseActive(e: Eclipse, today: string): boolean {
  return !!e.start && !!e.end && daysBetween(e.start, today) >= 0 && daysBetween(today, e.end) >= 0;
}

// ─── Orbit: the device-wide "I showed up" streak ─────────────────────────────

export interface OrbitStored {
  streak: number;
  best: number;
  lastDate: string | null;
}

/**
 * The orbit after an award lands today. The first award of a day extends the
 * run (bridging missed days with shields, skipping eclipse days); a broken run
 * starts again at 1. `shieldsUsed` is what the caller must spend.
 */
export function advanceOrbit(
  stored: OrbitStored,
  today: string,
  shields: number,
  pausedDays: ReadonlySet<string> = new Set(),
): OrbitStored & { shieldsUsed: number; changed: boolean } {
  if (stored.lastDate === today) return { ...stored, shieldsUsed: 0, changed: false };
  const plan = planStreak({ currentStreak: stored.streak, lastActiveDate: stored.lastDate }, today, shields, pausedDays);
  const streak = plan.broken || plan.effectiveStreak === 0 ? 1 : plan.effectiveStreak + 1;
  return {
    streak,
    best: Math.max(stored.best, streak),
    lastDate: today,
    shieldsUsed: plan.broken ? 0 : plan.bridgeDays.length,
    changed: true,
  };
}

/**
 * What the orbit looks like on read — never spends anything. `atRisk` means
 * the run is alive but today has not been counted yet.
 */
export function viewOrbit(
  stored: OrbitStored,
  today: string,
  shields: number,
  pausedDays: ReadonlySet<string> = new Set(),
): { streak: number; best: number; countedToday: boolean; atRisk: boolean } {
  const countedToday = stored.lastDate === today;
  const plan = planStreak({ currentStreak: stored.streak, lastActiveDate: stored.lastDate }, today, shields, pausedDays);
  const streak = countedToday ? stored.streak : plan.effectiveStreak;
  return { streak, best: stored.best, countedToday, atRisk: !countedToday && streak > 0 };
}

// ─── Cosmic journey ──────────────────────────────────────────────────────────

/** Energy Aster needs before it can set off. */
export const JOURNEY_MIN_ENERGY = 60;
/** How long Aster is away. */
export const JOURNEY_HOURS = 3;
/** A free streak shield every N completed journeys (Finch's repair saver). */
export const SHIELD_EVERY_JOURNEYS = 3;
/** Stardust a duplicate constellation turns into. */
export const DUPLICATE_STARDUST = 25;

export type JourneyStatus = 'locked' | 'ready' | 'away' | 'returned' | 'claimed';

export interface JourneyRow {
  returnsAt: Date;
  claimedAt: Date | null;
}

/**
 * Where today's journey stands, resolved on read. `locked` = not enough energy
 * yet (or resting in an eclipse), `ready` = can set off now.
 */
export function journeyStatus(
  journey: JourneyRow | null,
  energy: number,
  resting: boolean,
  now: Date,
): JourneyStatus {
  if (journey) {
    if (journey.claimedAt) return 'claimed';
    return now.getTime() >= journey.returnsAt.getTime() ? 'returned' : 'away';
  }
  if (resting || energy < JOURNEY_MIN_ENERGY) return 'locked';
  return 'ready';
}

/** Does finishing journey number `completed` (1-based) earn a free shield? */
export function journeyEarnsShield(completed: number): boolean {
  return completed > 0 && completed % SHIELD_EVERY_JOURNEYS === 0;
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
  orbitStreak: number;
  orbitBest: number;
  orbitLastDate: string | null;
  journeysCompleted: number;
  eclipseStart: string | null;
  eclipseEnd: string | null;
  lessonsDone: string[];
  lessonsEarly: string[];
  novaLook: boolean;
}

/**
 * The account's Aster after an anonymous install's Aster joins it. Işık grows
 * by exactly what the moved events carry (so nothing is counted twice);
 * stardust grows by the same amount but never by more than `from` had left
 * unspent. Purchases are united, the account keeps what it is wearing, and
 * the earliest hatch wins. The orbit whose last counted day is most recent
 * carries on (ties: the longer run); journeys add up; the account's eclipse
 * stays. Finished and early-bought lessons are united. The caller recomputes
 * the stage with `stageFor`.
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
    ...newerOrbit(into, from),
    orbitBest: Math.max(into.orbitBest, from.orbitBest),
    journeysCompleted: into.journeysCompleted + from.journeysCompleted,
    eclipseStart: into.eclipseStart,
    eclipseEnd: into.eclipseEnd,
    lessonsDone: [...new Set([...into.lessonsDone, ...from.lessonsDone])],
    lessonsEarly: [...new Set([...into.lessonsEarly, ...from.lessonsEarly])],
    novaLook: into.novaLook || from.novaLook,
  };
}

function newerOrbit(a: MergeableMascot, b: MergeableMascot): { orbitStreak: number; orbitLastDate: string | null } {
  const pick = (m: MergeableMascot) => ({ orbitStreak: m.orbitStreak, orbitLastDate: m.orbitLastDate });
  if (!b.orbitLastDate) return pick(a);
  if (!a.orbitLastDate) return pick(b);
  if (a.orbitLastDate === b.orbitLastDate) return a.orbitStreak >= b.orbitStreak ? pick(a) : pick(b);
  return a.orbitLastDate > b.orbitLastDate ? pick(a) : pick(b);
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

/**
 * The next exact (mean) new or full moon at or after `now`, as a UTC date —
 * the refKey a wish planted "for the next new moon" waits for.
 */
export function nextLunarPeak(now: Date, phase: 'new' | 'full'): string {
  const days = now.getTime() / 86400000;
  const age = (((days - KNOWN_NEW_MOON_DAYS) % SYNODIC) + SYNODIC) % SYNODIC;
  const target = phase === 'new' ? 0 : SYNODIC / 2;
  let offset = target - age;
  if (offset < 0) offset += SYNODIC;
  return new Date((days + offset) * 86400000).toISOString().slice(0, 10);
}

/** Where the Moon is in its cycle, 0 (new) → 0.5 (full) → 1 (next new). */
export function lunarProgress(now: Date): number {
  const days = now.getTime() / 86400000;
  const age = (((days - KNOWN_NEW_MOON_DAYS) % SYNODIC) + SYNODIC) % SYNODIC;
  return age / SYNODIC;
}
