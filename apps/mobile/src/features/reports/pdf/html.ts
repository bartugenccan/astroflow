import type { Locale, TFunction, TranslationKey } from "../../../i18n";
import { aspectName, houseLabel } from "../../../lib/astroLanguage";
import { formatDayMonthYearLong } from "../../../lib/dates";
import { GLYPH_SHAPES, glyphSvg } from "../../../lib/glyphData";

/**
 * Small, pure helpers shared by the report HTML builders. Nothing here touches
 * React or native modules, so the builders can be rendered (and previewed)
 * anywhere a string can be printed.
 */

export interface PdfContext {
  t: TFunction;
  locale: Locale;
}

export const INK = "#1B1F33";
export const GOLD = "#B08A3E";
export const MUTED = "#6B6A75";
export const HARMONIC = "#3E7C86";
export const CHALLENGING = "#B0553F";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Every piece of data (names, AI text, place names) goes through this. */
export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * AI text → paragraphs. Blank lines split paragraphs, single line breaks fold
 * into spaces, and stray Markdown emphasis or bullets are dropped — the model
 * is asked for plain prose, but the page must never show raw `**`.
 */
export function paras(text: string | undefined | null, cls?: string): string {
  const open = cls ? `<p class="${cls}">` : "<p>";
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.replace(/^\s*(?:#{1,6}\s+|[-*•]\s+)/, "").trim())
        .join(" ")
        .replace(/\*\*|__/g, "")
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .map((block) => `${open}${esc(block)}</p>`)
    .join("");
}

/** Like `paras`, with the first paragraph set as the italic lead. */
export function leadParas(text: string | undefined | null): string {
  return paras(text).replace(/^<p>/, '<p class="lead">');
}

/** A translation that may not exist (dynamic keys); falls back to `fallback`. */
export function lookup(ctx: PdfContext, key: string, fallback: string): string {
  const value = ctx.t(key as TranslationKey);
  return value === key ? fallback : value;
}

export const signName = (ctx: PdfContext, sign: string) => lookup(ctx, `signs.${sign}`, sign);

export const elementName = (ctx: PdfContext, element: string) => lookup(ctx, `elements.${element}`, element);

/** Planets plus the chart points (Ascendant, Midheaven, nodes). */
export function pointName(ctx: PdfContext, name: string): string {
  return lookup(ctx, `planets.${name}`, lookup(ctx, `reports.pdf.points.${name}`, name));
}

export const aspectLabel = (ctx: PdfContext, aspect: string) => aspectName(ctx.t, aspect);

export const houseText = (ctx: PdfContext, house: number) => houseLabel(ctx.t, ctx.locale, house);

/** `14°05′` */
export function degText(degree: number, minute: number): string {
  return `${degree}°${String(minute).padStart(2, "0")}′`;
}

export const longDate = (ctx: PdfContext, iso: string) => formatDayMonthYearLong(ctx.locale, iso.slice(0, 10));

/** Points without a drawn symbol are printed as their usual abbreviation. */
const TEXT_GLYPHS: Record<string, string> = { Midheaven: "MC", MC: "MC" };

/** A glyph as a self-contained inline `<svg>`; unknown names fall back to text. */
export function inlineGlyph(name: string, color = INK, size = 14, cls = "g"): string {
  if (!GLYPH_SHAPES[name]) return `<span class="${cls} gtext" style="color:${color}">${esc(TEXT_GLYPHS[name] ?? name.slice(0, 2))}</span>`;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${glyphSvg(name, 12, 12, 24, color, 1.7)}</svg>`;
}

/** Roman numerals for chapter numbers (I–XX is all a report needs). */
export function roman(n: number): string {
  const table: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  let rest = n;
  for (const [value, symbol] of table) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}

export function natureColor(nature: string | undefined): string {
  if (nature === "harmonic") return HARMONIC;
  if (nature === "challenging") return CHALLENGING;
  return GOLD;
}
