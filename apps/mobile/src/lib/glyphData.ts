/**
 * Astrological symbols as plain shape data on a 24×24 grid — the single source
 * for both the in-app <Glyph> (react-native-svg) and the SVG strings in the
 * PDF reports. Stroked line-art; `fill: true` marks the few solid dots.
 * Keyed by canonical English name (Sun…Pluto, Aries…Pisces, aspect names,
 * Ascendant, NorthNode, SouthNode, Retrograde).
 */
export type GlyphShape =
  | { t: "path"; d: string }
  | { t: "circle"; cx: number; cy: number; r: number; fill?: boolean }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number }
  | { t: "rect"; x: number; y: number; w: number; h: number; rx: number };

const P = (d: string): GlyphShape => ({ t: "path", d });
const C = (cx: number, cy: number, r: number, fill = false): GlyphShape => ({ t: "circle", cx, cy, r, fill });
const L = (x1: number, y1: number, x2: number, y2: number): GlyphShape => ({ t: "line", x1, y1, x2, y2 });

export const GLYPH_SHAPES: Record<string, GlyphShape[]> = {
  // ── Planets ──────────────────────────────────────────────────────────────
  Sun: [C(12, 12, 7), C(12, 12, 1.5, true)],
  Moon: [P("M15.5 4.5 A 8.5 8.5 0 1 0 15.5 19.5 A 6.5 6.5 0 0 1 15.5 4.5 Z")],
  Mercury: [P("M8 3.5 A 4 4 0 0 0 16 3.5"), C(12, 10.5, 3.5), L(12, 14, 12, 21), L(8.5, 17.5, 15.5, 17.5)],
  Venus: [C(12, 8.5, 4.5), L(12, 13, 12, 21), L(8.5, 17.5, 15.5, 17.5)],
  Mars: [C(10, 14, 4.5), L(13.2, 10.8, 19, 5), P("M14.5 5 L19 5 L19 9.5")],
  Jupiter: [P("M6.5 8 C 6.5 4.5, 11.5 4.5, 11.5 9 L 11.5 19"), L(8, 16, 17, 16)],
  Saturn: [L(5.5, 8, 11, 8), P("M8.5 4.5 L 8.5 15 C 8.5 19, 14.5 19, 14.5 13.5")],
  Uranus: [L(12, 3, 12, 15), L(6, 9, 18, 9), L(6, 5.5, 6, 12.5), L(18, 5.5, 18, 12.5), C(12, 18.5, 2.2)],
  Neptune: [P("M6.5 8.5 A 5.5 5.5 0 0 1 17.5 8.5"), L(6.5, 5, 6.5, 9), L(17.5, 5, 17.5, 9), L(12, 3, 12, 20), L(8, 16.5, 16, 16.5)],
  Pluto: [P("M6.5 8 A 5.5 5.5 0 0 0 17.5 8"), C(12, 7.5, 2.4), L(12, 10.5, 12, 20), L(8, 16.5, 16, 16.5)],

  // ── Zodiac signs ─────────────────────────────────────────────────────────
  Aries: [P("M12 20 L12 9 M12 9 C12 5 8 5 8 8.5 C8 11 10 11 10.5 9.5 M12 9 C12 5 16 5 16 8.5 C16 11 14 11 13.5 9.5")],
  Taurus: [C(12, 15, 5), P("M4.5 6.5 A 8 5 0 0 0 19.5 6.5")],
  Gemini: [P("M6.5 5 A 7 3 0 0 0 17.5 5"), P("M6.5 19 A 7 3 0 0 1 17.5 19"), L(9.5, 5.5, 9.5, 18.5), L(14.5, 5.5, 14.5, 18.5)],
  Cancer: [P("M4 11 A 6 6 0 0 1 16 10.5"), C(7.5, 11.5, 2.1), P("M20 13 A 6 6 0 0 1 8 13.5"), C(16.5, 12.5, 2.1)],
  Leo: [C(8.5, 15.5, 3.2), P("M11 14 C 13 9, 7 5, 11 5 C 15.5 5, 15 11, 18 13")],
  Virgo: [P("M5 7 L5 16 M5 8.5 C5 6.5 8 6.5 8 8.5 L8 16 M8 8.5 C8 6.5 11 6.5 11 8.5 L11 16 C11 19 14 19 15.5 16.5 C17 14 15 11 12.5 13")],
  Libra: [L(4.5, 18, 19.5, 18), P("M5 13.5 L9 13.5 A 3.2 3.2 0 0 1 15 13.5 L19 13.5")],
  Scorpio: [P("M5 7 L5 16 M5 8.5 C5 6.5 8 6.5 8 8.5 L8 16 M8 8.5 C8 6.5 11 6.5 11 8.5 L11 18"), P("M11 18 L16 13 M12.5 13 L16 13 L16 16.5")],
  Sagittarius: [L(5.5, 18.5, 18, 6), P("M13 6 L18 6 L18 11"), L(9, 12, 15, 18)],
  Capricorn: [P("M4.5 8 C 7 5.5, 9 8, 9 11.5 L 10.5 16 C 12 8, 18 10.5, 15.5 16 C 14 19, 11.5 17.5, 13 15.5")],
  Aquarius: [P("M4 10.5 L7 8.5 L10 10.5 L13 8.5 L16 10.5 L19 8.5"), P("M4 15.5 L7 13.5 L10 15.5 L13 13.5 L16 15.5 L19 13.5")],
  Pisces: [P("M7.5 4.5 C 3.5 8, 3.5 16, 7.5 19.5"), P("M16.5 4.5 C 20.5 8, 20.5 16, 16.5 19.5"), L(6, 12, 18, 12)],

  // ── Aspects ──────────────────────────────────────────────────────────────
  Conjunction: [C(9.5, 14.5, 3.5), L(12, 12, 18.5, 5.5)],
  Sextile: [L(12, 4, 12, 20), L(5, 8, 19, 16), L(19, 8, 5, 16)],
  Square: [{ t: "rect", x: 6, y: 6, w: 12, h: 12, rx: 1 }],
  Trine: [P("M12 5 L19 18 L5 18 Z")],
  Opposition: [C(6, 12, 2.5), C(18, 12, 2.5), L(8.5, 12, 15.5, 12)],

  // ── Points ───────────────────────────────────────────────────────────────
  Ascendant: [P("M5 16 L12 8 L19 16")],
  NorthNode: [P("M7 18 C 5 10, 8 5, 12 5 C 16 5, 19 10, 17 18"), C(6.5, 18, 1.6), C(17.5, 18, 1.6)],
  SouthNode: [P("M7 6 C 5 14, 8 19, 12 19 C 16 19, 19 14, 17 6"), C(6.5, 6, 1.6), C(17.5, 6, 1.6)],
  Retrograde: [P("M7 6 L7 18 M7 6 L12 6 C15 6 15 11 12 11 L7 11"), L(11, 11, 16, 18)],
};

/**
 * A glyph as an SVG `<g>` string centred on (x, y) — for HTML/PDF output.
 * `strokeWidth` is in output pixels, kept constant across sizes.
 */
export function glyphSvg(name: string, x: number, y: number, size: number, color: string, strokeWidth = 1.4): string {
  const shapes = GLYPH_SHAPES[name];
  if (!shapes) return "";
  const s = size / 24;
  const sw = (strokeWidth / s).toFixed(2);
  const stroke = `stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const body = shapes
    .map((sh) => {
      switch (sh.t) {
        case "path":
          return `<path d="${sh.d}" ${stroke}/>`;
        case "circle":
          return sh.fill
            ? `<circle cx="${sh.cx}" cy="${sh.cy}" r="${sh.r}" fill="${color}"/>`
            : `<circle cx="${sh.cx}" cy="${sh.cy}" r="${sh.r}" ${stroke}/>`;
        case "line":
          return `<line x1="${sh.x1}" y1="${sh.y1}" x2="${sh.x2}" y2="${sh.y2}" ${stroke}/>`;
        case "rect":
          return `<rect x="${sh.x}" y="${sh.y}" width="${sh.w}" height="${sh.h}" rx="${sh.rx}" ${stroke}/>`;
      }
    })
    .join("");
  return `<g transform="translate(${(x - size / 2).toFixed(2)} ${(y - size / 2).toFixed(2)}) scale(${s.toFixed(4)})">${body}</g>`;
}
