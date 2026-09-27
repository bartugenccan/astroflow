import type { Locale, TFunction, TranslationKey } from "../i18n";
import type { BirthProfileResponse, NatalChartData } from "../services/types";
import { aspectPhrase, houseLabel } from "./astroLanguage";

/**
 * The app's astrology vocabulary. Every term a newcomer might trip over has an
 * entry, and every entry is explained in layers:
 *   short   — one sentence, always visible
 *   what    — what it actually is
 *   how     — how it's worked out (the "detail" people coming for depth want)
 *   life    — what it says about a person's life
 *   example — one concrete illustration
 * plus, where the user's own chart can fill it in, a "yours" line.
 *
 * Copy lives in `i18n/translations/glossary.{en,tr}.ts` under
 * `glossary.terms.<id>`; this file only owns structure and personalization.
 */
export type GlossaryTermId =
  | "natalChart"
  | "bigThree"
  | "sun"
  | "moon"
  | "rising"
  | "planet"
  | "sign"
  | "house"
  | "aspect"
  | "orb"
  | "transit"
  | "retrograde"
  | "midheaven"
  | "northNode"
  | "saturnReturn"
  | "dayNightChart"
  | "solarReturn"
  | "synastry";

/**
 * The mark shown beside a term: an astro `Glyph` name (drawn as SVG — Unicode
 * astro symbols render as colour emoji on some OSes) or an Ionicon.
 */
export type GlossaryMark = { glyph: string } | { icon: string };

export interface GlossaryEntry {
  id: GlossaryTermId;
  mark: GlossaryMark;
  related: GlossaryTermId[];
}

/** Display order — foundations first, timing techniques last. */
export const GLOSSARY: GlossaryEntry[] = [
  { id: "natalChart", mark: { icon: "planet-outline" }, related: ["planet", "sign", "house", "bigThree"] },
  { id: "bigThree", mark: { glyph: "Sun" }, related: ["sun", "moon", "rising"] },
  { id: "sun", mark: { glyph: "Sun" }, related: ["moon", "rising", "sign"] },
  { id: "moon", mark: { glyph: "Moon" }, related: ["sun", "rising", "house"] },
  { id: "rising", mark: { glyph: "Ascendant" }, related: ["house", "midheaven", "natalChart"] },
  { id: "planet", mark: { glyph: "Jupiter" }, related: ["sign", "house", "aspect"] },
  { id: "sign", mark: { glyph: "Aries" }, related: ["planet", "house", "sun"] },
  { id: "house", mark: { icon: "home-outline" }, related: ["rising", "sign", "planet"] },
  { id: "aspect", mark: { glyph: "Trine" }, related: ["orb", "planet", "transit"] },
  { id: "orb", mark: { icon: "locate-outline" }, related: ["aspect", "transit"] },
  { id: "transit", mark: { icon: "sync-outline" }, related: ["aspect", "retrograde", "natalChart"] },
  { id: "retrograde", mark: { glyph: "Retrograde" }, related: ["transit", "planet"] },
  { id: "midheaven", mark: { icon: "arrow-up-circle-outline" }, related: ["rising", "house"] },
  { id: "northNode", mark: { glyph: "NorthNode" }, related: ["house", "sign"] },
  { id: "saturnReturn", mark: { glyph: "Saturn" }, related: ["transit", "solarReturn"] },
  { id: "dayNightChart", mark: { icon: "partly-sunny-outline" }, related: ["sun", "house"] },
  { id: "solarReturn", mark: { icon: "sunny-outline" }, related: ["sun", "rising", "transit"] },
  { id: "synastry", mark: { icon: "people-outline" }, related: ["aspect", "planet"] },
];

export const GLOSSARY_BY_ID: Record<GlossaryTermId, GlossaryEntry> =
  Object.fromEntries(GLOSSARY.map((e) => [e.id, e])) as Record<
    GlossaryTermId,
    GlossaryEntry
  >;

export type GlossaryField = "title" | "short" | "what" | "how" | "life" | "example";

export function termText(t: TFunction, id: GlossaryTermId, field: GlossaryField): string {
  return t(`glossary.terms.${id}.${field}` as TranslationKey);
}

function planetName(t: TFunction, name: string): string {
  const key = `planets.${name}` as TranslationKey;
  const v = t(key);
  return v === key ? name : v;
}

function signName(t: TFunction, sign: string): string {
  const key = `signs.${sign}` as TranslationKey;
  const v = t(key);
  return v === key ? sign : v;
}

function degrees(deg: number, minute?: number): string {
  const d = Math.floor(deg);
  const m = minute ?? Math.round((deg - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}′`;
}

/**
 * "In your chart" line for a term, built from the user's own chart. Returns
 * null when the term has nothing personal to show (or data isn't loaded yet).
 */
export function personalLine(
  id: GlossaryTermId,
  t: TFunction,
  locale: Locale,
  chart: NatalChartData | null,
  profile: BirthProfileResponse | null,
): string | null {
  const y = (key: string, params?: Record<string, string | number>) =>
    t(`glossary.yours.${key}` as TranslationKey, params);

  if (id === "natalChart" && profile) {
    return y("natalChart", {
      date: profile.birthDate,
      time: profile.unknownTime ? "12:00" : profile.birthTime,
      place: profile.placeName ?? `${profile.latitude.toFixed(2)}, ${profile.longitude.toFixed(2)}`,
    });
  }
  if (!chart) return null;

  const planet = (name: string) => chart.planets.find((p) => p.name === name);

  switch (id) {
    case "bigThree":
      return y("bigThree", {
        sun: signName(t, chart.summary.sunSign),
        moon: signName(t, chart.summary.moonSign),
        rising: signName(t, chart.summary.risingSign),
      });
    case "sun":
    case "moon": {
      const p = planet(id === "sun" ? "Sun" : "Moon");
      if (!p) return null;
      return y(id, {
        sign: signName(t, p.sign),
        house: houseLabel(t, locale, p.house),
        deg: degrees(p.degree, p.minute),
      });
    }
    case "rising":
      return y("rising", {
        sign: signName(t, chart.angles.ascendant.sign),
        deg: degrees(chart.angles.ascendant.degree),
      });
    case "midheaven":
      return y("midheaven", { sign: signName(t, chart.angles.midheaven.sign) });
    case "planet":
      return y("planet", { planet: planetName(t, chart.summary.dominantPlanet) });
    case "house": {
      const counts = new Map<number, number>();
      chart.planets.forEach((p) => counts.set(p.house, (counts.get(p.house) ?? 0) + 1));
      const [house, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
      if (!house) return null;
      return y("house", { house: houseLabel(t, locale, house), n: n ?? 0 });
    }
    case "aspect":
    case "orb": {
      if (!chart.aspects.length) return null;
      const closest = [...chart.aspects].sort((a, b) => a.orb - b.orb)[0];
      return y(id, {
        n: chart.aspects.length,
        phrase: aspectPhrase(
          t,
          closest.aspect,
          planetName(t, closest.planet1),
          planetName(t, closest.planet2),
          false,
        ),
        orb: closest.orb.toFixed(1),
      });
    }
    case "retrograde": {
      const rx = chart.planets.filter((p) => p.retrograde).map((p) => planetName(t, p.name));
      return rx.length ? y("retrograde", { list: rx.join(", ") }) : y("retrogradeNone");
    }
    case "northNode":
      return y("northNode", {
        sign: signName(t, chart.nodes.north.sign),
        house: houseLabel(t, locale, chart.nodes.north.house),
      });
    case "saturnReturn":
      return y("saturnReturn", { age: chart.saturn.returnAge });
    case "dayNightChart":
      return y(chart.sect === "day" ? "day" : "night");
    default:
      return null;
  }
}
