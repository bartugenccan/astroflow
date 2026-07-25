import { useCallback } from "react";
import { getLocales } from "expo-localization";
import { en, TranslationShape } from "./translations/en";
import { tr } from "./translations/tr";
import { useAppStore } from "../store/useAppStore";

export type Locale = "en" | "tr";

const RESOURCES: Record<Locale, TranslationShape> = { en, tr };

/** Recursive dot-path of every leaf string key, e.g. "onboarding.begin". */
type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : `${K}.${DotPaths<T[K]>}`;
}[keyof T & string];

export type TranslationKey = DotPaths<TranslationShape>;

type Params = Record<string, string | number>;

function resolve(locale: Locale, key: string): string {
  const dict = RESOURCES[locale] as Record<string, unknown>;
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : key;
}

function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    name in params ? String(params[name]) : `{{${name}}}`,
  );
}

/** Pure translate — usable outside React (e.g. in services). */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Params,
): string {
  return interpolate(resolve(locale, key), params);
}

/** Device default locale, falling back to English. */
export function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return code === "tr" ? "tr" : "en";
}

export type TFunction = (key: TranslationKey, params?: Params) => string;

/** Hook returning a `t` bound to the current store locale. */
export function useTranslation(): { t: TFunction; locale: Locale } {
  const locale = useAppStore((s) => s.locale);
  const t = useCallback<TFunction>(
    (key, params) => translate(locale, key, params),
    [locale],
  );
  return { t, locale };
}
