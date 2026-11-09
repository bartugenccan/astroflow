import type { Locale, TFunction, TranslationKey } from "../../i18n";
import { asterEn } from "../../i18n/translations/aster.en";
import { asterTr } from "../../i18n/translations/aster.tr";
import type { MascotMood, MascotState } from "../../services/types";
import { STAGES } from "../../lib/mascotRules";

const LINES = { en: asterEn.lines, tr: asterTr.lines };

/** A line for Aster's speech bubble — stable for the day, varies across days. */
export function asterLine(locale: Locale, mood: MascotMood, hatched: boolean, salt = 0): string {
  const lines = LINES[locale] ?? LINES.en;
  if (!hatched) return lines.egg;
  const pool = lines[mood];
  const day = Math.floor(Date.now() / 86400000);
  return pool[(day + salt) % pool.length];
}

export function stageName(t: TFunction, stage: number): string {
  const key = STAGES[Math.max(0, Math.min(STAGES.length - 1, stage))].key;
  return t(`aster.stages.${key}` as TranslationKey);
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
