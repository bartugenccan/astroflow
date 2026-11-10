import type { Href } from "expo-router";
import type { Ionicons } from "@expo/vector-icons";
import type { Locale, TFunction, TranslationKey } from "../../i18n";
import { aspectName, aspectPhrase, ordinal } from "../../lib/astroLanguage";
import { areaTone, Tone } from "../../lib/design-system";
import type { AspectNature, LifeArea, MascotEventKind, PlanStep, PlanWhy } from "../../services/types";

type IconName = keyof typeof Ionicons.glyphMap;

/** A planet or natal point in the reader's language; unknown names pass through. */
export function planetName(t: TFunction, name: string): string {
  const key = `planets.${name}` as TranslationKey;
  const label = t(key);
  return label === key ? name : label;
}

export function signName(t: TFunction, sign: string): string {
  const key = `signs.${sign}` as TranslationKey;
  const label = t(key);
  return label === key ? sign : label;
}

export function areaName(t: TFunction, area: LifeArea): string {
  return t(`lifeAreas.${area}` as TranslationKey);
}

/** "Moon in your 10th house" / "Ay 10. evinde". */
export function moonLine(t: TFunction, locale: Locale, moon: { natalHouse: number } | null): string | null {
  if (!moon || !moon.natalHouse) return null;
  return t("plan.moonLine", { n: ordinal(locale, moon.natalHouse) });
}

/** A transit as a sentence: "Venus flows with your Moon". */
export function whyPhrase(t: TFunction, why: PlanWhy): string {
  return aspectPhrase(t, why.aspect, planetName(t, why.transitPlanet), planetName(t, why.natalPoint));
}

export const NATURE_TONE: Record<AspectNature, Tone> = {
  harmonic: "mint",
  challenging: "candy",
  neutral: "sky",
};

/** The small "why" chip of a plan step: its text and tone, or null when there's nothing to say. */
export function stepWhy(
  t: TFunction,
  step: PlanStep,
  focusArea: LifeArea,
): { text: string; tone: Tone; icon: IconName } | null {
  if (step.why) {
    return { text: whyPhrase(t, step.why), tone: NATURE_TONE[step.why.nature] ?? "sky", icon: "planet" };
  }
  if (!step.whyKey) return null;
  const key = step.whyKey as TranslationKey;
  const text = t(key, { area: areaName(t, focusArea) });
  if (text === step.whyKey) return null;
  if (step.whyKey.startsWith("plan.why.moon")) return { text, tone: "star", icon: "moon" };
  if (step.whyKey === "plan.why.gentle") return { text, tone: "mint", icon: "leaf" };
  return { text, tone: areaTone[focusArea] ?? "primary", icon: AREA_ICON[focusArea] };
}

export const AREA_ICON: Record<LifeArea, IconName> = {
  love: "heart",
  career: "briefcase",
  money: "cash",
  energy: "flash",
};

export const STEP_VISUAL: Record<MascotEventKind, { icon: IconName; tone: Tone }> = {
  SKY_CHECKIN: { icon: "partly-sunny", tone: "sky" },
  SKY_READ: { icon: "planet", tone: "sky" },
  CHECKIN: { icon: "checkmark-circle", tone: "candy" },
  INTENTION_CREATE: { icon: "star", tone: "candy" },
  AFFIRMATION: { icon: "heart", tone: "primary" },
  EVENING_REFLECTION: { icon: "moon", tone: "primary" },
  MOON_RITUAL: { icon: "ellipse", tone: "star" },
  TAROT: { icon: "albums", tone: "star" },
  BREATH: { icon: "leaf", tone: "mint" },
  DAY_COMPLETE: { icon: "checkmark-done", tone: "mint" },
  MILESTONE: { icon: "trophy", tone: "star" },
  JOURNEY_RETURN: { icon: "rocket", tone: "primary" },
  MANIFESTED: { icon: "sparkles", tone: "star" },
  ACCOUNT_LINKED: { icon: "shield-checkmark", tone: "mint" },
  SKY_LESSON: { icon: "map", tone: "sky" },
  SIGN_LOG: { icon: "eye", tone: "candy" },
};

/** The tarot question a plan step carries, rendered in the reader's language. */
export function tarotQuestion(t: TFunction, locale: Locale, step: PlanStep, focusArea: LifeArea): string | null {
  const prefill = step.prefill;
  if (!prefill?.questionKey) return null;
  const raw = prefill.questionParams ?? {};
  const lower = (s: string) => s.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US");
  const params: Record<string, string> = {};
  if (raw.planet) params.planet = planetName(t, raw.planet);
  if (raw.natal) params.natal = planetName(t, raw.natal);
  if (raw.aspect) params.aspect = lower(aspectName(t, raw.aspect));
  params.area = lower(areaName(t, (raw.area as LifeArea) ?? focusArea));
  const key = prefill.questionKey as TranslationKey;
  const text = t(key, params);
  return text === prefill.questionKey ? null : text;
}

/**
 * Where tapping a plan step goes — the deep-link contract with the Manifest,
 * Tarot and Aster screens. Null when the step is done right here on Today
 * (the sky check-in, reading the day's sky).
 */
export function stepHref(t: TFunction, locale: Locale, step: PlanStep, focusArea: LifeArea): Href | null {
  const p = step.prefill;
  switch (step.kind) {
    case "CHECKIN":
      // A practice for the plan's manifestation: today's suggested method, on paper.
      return (p?.intentionId ? `/practice?id=${encodeURIComponent(p.intentionId)}` : "/practice") as Href;
    case "INTENTION_CREATE":
      return `/intentions/create?area=${p?.area ?? focusArea}` as Href;
    case "AFFIRMATION":
      return (p?.category ? `/(tabs)/manifest?affirm=${p.category}` : "/(tabs)/manifest") as Href;
    case "EVENING_REFLECTION":
      return "/(tabs)/manifest?ritual=evening" as Href;
    case "MOON_RITUAL":
      return "/(tabs)/manifest?ritual=moon" as Href;
    case "TAROT": {
      const q = tarotQuestion(t, locale, step, focusArea);
      return (q ? `/(tabs)/tarot?q=${encodeURIComponent(q)}` : "/(tabs)/tarot") as Href;
    }
    case "BREATH":
      return "/aster/breathe" as Href;
    default:
      return null;
  }
}

/** "1h 20m" / "12m" / "40s" until `iso`. */
export function countdown(t: TFunction, iso: string | null, now: number): string {
  if (!iso) return "";
  const ms = Math.max(0, Date.parse(iso) - now);
  const s = Math.ceil(ms / 1000);
  if (s < 60) return t("aster.journey.seconds", { s });
  const m = Math.ceil(s / 60);
  if (m < 60) return t("aster.journey.minutes", { m });
  return t("aster.journey.hours", { h: Math.floor(m / 60), m: m % 60 });
}
