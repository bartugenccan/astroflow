import { Locale, TFunction, TranslationKey } from "../i18n";

/**
 * The one place technical astrology becomes plain English (and Turkish).
 *
 * Aspect names, orbs, retrogrades and house numbers were previously rendered
 * as raw values in half a dozen components — untranslated, so a Turkish reader
 * saw "Square", and unexplained, so nobody without training could read them.
 * Everything user-facing now goes through here; the technical form stays
 * available for the "show me why" layer.
 */

/** English ordinals, plus the Turkish form which is just `n.`. */
export function ordinal(locale: Locale, n: number): string {
  if (locale === "tr") return `${n}.`;
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** "7th house" / "7. ev" — never the bare "7 House" the old key produced. */
export function houseLabel(t: TFunction, locale: Locale, house: number): string {
  return t("astro.houseOrdinal", { n: ordinal(locale, house) });
}

/**
 * A transit or synastry contact as a sentence: "Moon flows with your Venus".
 * `possessive` distinguishes something touching *your* chart from two planets
 * described side by side (a natal aspect, where neither one is "yours").
 */
export function aspectPhrase(
  t: TFunction,
  aspect: string,
  a: string,
  b: string,
  possessive = true,
): string {
  const group = possessive ? "aspectPhrase" : "aspectPair";
  const key = `astro.${group}.${aspect}` as TranslationKey;
  const phrase = t(key, { a, b });
  // An unknown aspect name resolves to the key itself; fall back to something
  // readable rather than printing a dotted path on screen.
  return phrase === key ? `${a} · ${b}` : phrase;
}

/** The technical name, for the detail/why layer only. */
export function aspectName(t: TFunction, aspect: string): string {
  const key = `astro.aspectName.${aspect}` as TranslationKey;
  const name = t(key);
  return name === key ? aspect : name;
}

/**
 * How tight the contact is, in words. The orb is a tolerance in degrees — a
 * number that means nothing without training — so the UI shows the strength it
 * implies and keeps the degrees for the expanded view.
 */
export function aspectStrength(t: TFunction, orb: number): string {
  const abs = Math.abs(orb);
  if (abs < 1) return t("astro.strength.exact");
  if (abs < 3) return t("astro.strength.strong");
  if (abs < 5) return t("astro.strength.clear");
  return t("astro.strength.faint");
}

/** "Flowing" / "Tense" — never the raw `HARMONY` enum. */
export function energyLabel(t: TFunction, state: string): string {
  const key = `astro.energy.${state}` as TranslationKey;
  const label = t(key);
  return label === key ? state : label;
}
