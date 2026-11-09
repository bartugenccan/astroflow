/* AUTO-MIRRORED from apps/api/src/modules/plan/plan-rules.ts.
 * The server is authoritative (GET /plan/today); this copy lets the offline
 * mock build a realistic plan. Keep both in sync. */

import type { MascotEventKind } from "./mascotRules";
import type { LifeArea } from "./intentionRules";

export type AspectNature = "harmonic" | "challenging" | "neutral";
export type MoodSky = "RADIANT" | "CLEAR" | "PARTLY" | "CLOUDY" | "STORMY";
export type AffirmationCategory = "money" | "love" | "career" | "health" | "confidence" | "calm";

export interface PlanTransit {
  transitPlanet: string;
  transitSign: string;
  natalPlanet: string;
  aspect: string;
  nature: AspectNature;
  orb: number;
}

export interface PlanWhy {
  transitPlanet: string;
  aspect: string;
  natalPoint: string;
  nature: AspectNature;
}

export interface PlanPrefill {
  category?: AffirmationCategory;
  intentionId?: string;
  area?: LifeArea;
  /** Tarot question template key + its params (rendered on the device). */
  questionKey?: string;
  questionParams?: Record<string, string>;
}

export interface PlanStep {
  kind: MascotEventKind;
  /** i18n key for the step's title. */
  titleKey: string;
  why: PlanWhy | null;
  /** i18n key for the "why" line when it isn't a transit (moon, mood, focus). */
  whyKey?: string;
  prefill?: PlanPrefill;
}

export interface PlanInput {
  today: string;
  transits: PlanTransit[];
  moon: { sign: string; natalHouse: number } | null;
  /** Today's 15–95 score per life area (best-days). */
  areaScores: Record<LifeArea, number> | null;
  /** The transit driving each area today, if any. */
  areaReasons: Partial<Record<LifeArea, PlanWhy>>;
  week: { date: string; area: LifeArea; score: number }[];
  /** Active wishes that aren't waiting for a moon, oldest first. */
  intentions: { id: string; lifeArea: LifeArea }[];
  mood: MoodSky | null;
  lunar: { phase: "new" | "full"; peakDate: string } | null;
}

export interface PlanPayload {
  date: string;
  focusArea: LifeArea;
  focusWhy: PlanWhy | null;
  moon: { sign: string; natalHouse: number } | null;
  powerIntentionId: string | null;
  /** Mood asked for a softer day. */
  gentle: boolean;
  /** Always-on daily anchors (check-in, read today's sky). */
  anchors: PlanStep[];
  /** The personal steps, most relevant first. */
  steps: PlanStep[];
  week: { date: string; area: LifeArea; score: number }[];
}

export const MAX_PERSONAL_STEPS = 4;
const AREAS: LifeArea[] = ["love", "career", "money", "energy"];
const AREA_AFFIRMATION: Record<LifeArea, AffirmationCategory> = {
  love: "love",
  career: "career",
  money: "money",
  energy: "confidence",
};
const GENTLE_MOODS: readonly MoodSky[] = ["CLOUDY", "STORMY"];

const asWhy = (t: PlanTransit): PlanWhy => ({
  transitPlanet: t.transitPlanet,
  aspect: t.aspect,
  natalPoint: t.natalPlanet,
  nature: t.nature,
});

/** The life area with the highest score today; ties keep the canonical order. */
export function focusAreaOf(scores: Record<LifeArea, number> | null): LifeArea {
  if (!scores) return "energy";
  return AREAS.reduce((best, a) => (scores[a] > scores[best] ? a : best), AREAS[0]);
}

/** The oldest active wish in the focus area — today's "power wish". */
export function powerIntentionOf(intentions: PlanInput["intentions"], area: LifeArea): string | null {
  return intentions.find((i) => i.lifeArea === area)?.id ?? null;
}

/** Which existing practice a transit points to, if any. */
export function stepForTransit(t: PlanTransit): MascotEventKind | null {
  const p = t.transitPlanet;
  if ((p === "Venus" || p === "Moon") && ["Venus", "Moon"].includes(t.natalPlanet)) return "AFFIRMATION";
  if (p === "Venus" && t.nature === "harmonic") return "AFFIRMATION";
  if (p === "Jupiter" || (p === "Sun" && t.nature === "harmonic")) return "CHECKIN";
  if (p === "Mercury") return "EVENING_REFLECTION";
  if ((p === "Saturn" || p === "Mars" || p === "Pluto") && t.nature === "challenging") return "BREATH";
  return null;
}

export function buildPlan(input: PlanInput): PlanPayload {
  const focusArea = focusAreaOf(input.areaScores);
  const powerIntentionId = powerIntentionOf(input.intentions, focusArea);
  const gentle = !!input.mood && GENTLE_MOODS.includes(input.mood);
  const tight = [...input.transits].sort((a, b) => a.orb - b.orb);
  const focusWhy = input.areaReasons[focusArea] ?? null;

  const steps: PlanStep[] = [];
  const has = (k: MascotEventKind) => steps.some((s) => s.kind === k);
  const push = (s: PlanStep) => {
    if (!has(s.kind) && steps.length < MAX_PERSONAL_STEPS) steps.push(s);
  };

  const checkInStep = (why: PlanWhy | null): PlanStep =>
    powerIntentionId
      ? { kind: "CHECKIN", titleKey: "plan.step.checkin", why, whyKey: why ? undefined : "plan.why.focus", prefill: { intentionId: powerIntentionId, area: focusArea } }
      : { kind: "INTENTION_CREATE", titleKey: "plan.step.createWish", why, whyKey: why ? undefined : "plan.why.focus", prefill: { area: focusArea } };

  // 1. The moon's window outranks everything — it only comes twice a month.
  if (input.lunar) {
    push({ kind: "MOON_RITUAL", titleKey: `plan.step.moon.${input.lunar.phase}`, why: null, whyKey: `plan.why.moon.${input.lunar.phase}` });
  }
  // 2. A heavy sky inside asks for breath first.
  if (gentle) {
    push({ kind: "BREATH", titleKey: "plan.step.breath", why: null, whyKey: "plan.why.gentle" });
  }
  // 3. The tightest transits, each pointing at its practice.
  for (const t of tight) {
    const kind = stepForTransit(t);
    if (!kind) continue;
    const why = asWhy(t);
    if (kind === "CHECKIN") push(checkInStep(why));
    else if (kind === "AFFIRMATION")
      push({ kind, titleKey: "plan.step.affirmation", why, prefill: { category: gentle ? "calm" : "love" } });
    else if (kind === "EVENING_REFLECTION") push({ kind, titleKey: "plan.step.reflection", why });
    else if (kind === "BREATH") push({ kind, titleKey: "plan.step.breath", why });
  }
  // 4. The focus area's wish, then a tarot question from today's tightest aspect.
  push(checkInStep(focusWhy));
  const lead = tight[0];
  push({
    kind: "TAROT",
    titleKey: "plan.step.tarot",
    why: lead ? asWhy(lead) : null,
    whyKey: lead ? undefined : "plan.why.focus",
    prefill: lead
      ? { questionKey: `plan.tarotQ.${lead.nature}`, questionParams: { planet: lead.transitPlanet, natal: lead.natalPlanet, aspect: lead.aspect } }
      : { questionKey: "plan.tarotQ.focus", questionParams: { area: focusArea } },
  });
  push({
    kind: "AFFIRMATION",
    titleKey: "plan.step.affirmation",
    why: focusWhy,
    whyKey: focusWhy ? undefined : "plan.why.focus",
    prefill: { category: gentle ? "calm" : AREA_AFFIRMATION[focusArea] },
  });

  return {
    date: input.today,
    focusArea,
    focusWhy,
    moon: input.moon,
    powerIntentionId,
    gentle,
    anchors: [
      { kind: "SKY_CHECKIN", titleKey: "plan.step.skyCheckin", why: null },
      { kind: "SKY_READ", titleKey: "plan.step.skyRead", why: null },
    ],
    steps,
    week: input.week,
  };
}

/** The strongest life area of each day — the "this week" strip. */
export function weekStrip(scores: ({ date: string } & Record<LifeArea, number>)[]): PlanPayload["week"] {
  return scores.map((s) => {
    const area = focusAreaOf(s);
    return { date: s.date, area, score: s[area] };
  });
}
