import type { Locale, TFunction, TranslationKey } from "../../i18n";
import { asterEn } from "../../i18n/translations/aster.en";
import { asterTr } from "../../i18n/translations/aster.tr";
import type { Longing, MascotMood, MascotState } from "../../services/types";
import { STAGES } from "../../lib/mascotRules";

const LINES = { en: asterEn.lines, tr: asterTr.lines };

/** A line for Aster's speech bubble — stable for the day, varies across days. */
export function asterLine(
  locale: Locale,
  mood: MascotMood,
  hatched: boolean,
  salt = 0,
  longing: Longing = "content",
): string {
  const lines = LINES[locale] ?? LINES.en;
  if (!hatched) return lines.egg;
  // Back after days away: Aster says it missed you, all through the day of the return.
  const pool = longing === "content" ? lines[mood] : lines[longing];
  const day = Math.floor(Date.now() / 86400000);
  return pool[(day + salt) % pool.length];
}

export function stageName(t: TFunction, stage: number): string {
  const key = STAGES[Math.max(0, Math.min(STAGES.length - 1, stage))].key;
  return t(`aster.stages.${key}` as TranslationKey);
}

/** The Işık a stage starts at, so a lock can say what it needs (F14). */
export function stageXp(stage: number): number {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, stage))].minXp;
}

export function asterA11y(t: TFunction, state: Pick<MascotState, "stage" | "mood"> | null): string {
  const stage = stageName(t, state?.stage ?? 0);
  const mood = t(`aster.moods.${state?.mood ?? "sleepy"}` as TranslationKey);
  return t("aster.a11y", { stage, mood });
}

/** Server milestone ids ("7-Day Flow") → localized name. */
export function milestoneLabel(t: TFunction, name: string): string {
  const key = `aster.milestones.${name}` as TranslationKey;
  const label = t(key);
  return label === key ? name : label;
}

/**
 * Aster's face while you are still away: wistful until today counts (the
 * bubble keeps its welcome all day, the face is glad again once you're back).
 * Resting in an eclipse is a chosen rest, never longing.
 */
export function faceLonging(state: Pick<MascotState, "longing" | "orbit" | "eclipse"> | null): Longing {
  if (!state || state.eclipse?.active || state.orbit?.countedToday) return "content";
  return state.longing?.level ?? "content";
}
