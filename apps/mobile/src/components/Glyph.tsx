import React from "react";
import Svg, { Path, Circle, Line, G, Rect } from "react-native-svg";
import { colors } from "../lib/design-system";

/**
 * Single source of truth for all astrological symbols, drawn as monochrome
 * vector line-art on a 24×24 grid. Replaces the Unicode glyphs (♈☉ …) that the
 * OS renders as color emoji, which clashes with the gold theme.
 *
 * Keyed by canonical English name (Aries…Pisces, Sun…Pluto, aspect names,
 * Ascendant, Retrograde). Use <Glyph> in RN Text contexts and <GlyphGroup>
 * inside an existing <Svg> (the chart wheel — <Svg> can't nest).
 */

interface Paint {
  c: string; // stroke/fill color
  sw: number; // stroke width in viewBox (24-unit) space
}

const common = (c: string, sw: number) => ({
  stroke: c,
  strokeWidth: sw,
  fill: "none" as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

const GLYPHS: Record<string, (p: Paint) => React.ReactNode> = {
  // ── Planets ──────────────────────────────────────────────────────────────
  Sun: ({ c, sw }) => (
    <>
      <Circle cx={12} cy={12} r={7} {...common(c, sw)} />
      <Circle cx={12} cy={12} r={1.5} fill={c} />
    </>
  ),
  Moon: ({ c, sw }) => (
    <Path d="M15.5 4.5 A 8.5 8.5 0 1 0 15.5 19.5 A 6.5 6.5 0 0 1 15.5 4.5 Z" {...common(c, sw)} />
  ),
  Mercury: ({ c, sw }) => (
    <>
      <Path d="M8 3.5 A 4 4 0 0 0 16 3.5" {...common(c, sw)} />
      <Circle cx={12} cy={10.5} r={3.5} {...common(c, sw)} />
      <Line x1={12} y1={14} x2={12} y2={21} {...common(c, sw)} />
      <Line x1={8.5} y1={17.5} x2={15.5} y2={17.5} {...common(c, sw)} />
    </>
  ),
  Venus: ({ c, sw }) => (
    <>
      <Circle cx={12} cy={8.5} r={4.5} {...common(c, sw)} />
      <Line x1={12} y1={13} x2={12} y2={21} {...common(c, sw)} />
      <Line x1={8.5} y1={17.5} x2={15.5} y2={17.5} {...common(c, sw)} />
    </>
  ),
  Mars: ({ c, sw }) => (
    <>
      <Circle cx={10} cy={14} r={4.5} {...common(c, sw)} />
      <Line x1={13.2} y1={10.8} x2={19} y2={5} {...common(c, sw)} />
      <Path d="M14.5 5 L19 5 L19 9.5" {...common(c, sw)} />
    </>
  ),
  Jupiter: ({ c, sw }) => (
    <>
      <Path d="M6.5 8 C 6.5 4.5, 11.5 4.5, 11.5 9 L 11.5 19" {...common(c, sw)} />
      <Line x1={8} y1={16} x2={17} y2={16} {...common(c, sw)} />
    </>
  ),
  Saturn: ({ c, sw }) => (
    <>
      <Line x1={5.5} y1={8} x2={11} y2={8} {...common(c, sw)} />
      <Path d="M8.5 4.5 L 8.5 15 C 8.5 19, 14.5 19, 14.5 13.5" {...common(c, sw)} />
    </>
  ),
  Uranus: ({ c, sw }) => (
    <>
      <Line x1={12} y1={3} x2={12} y2={15} {...common(c, sw)} />
      <Line x1={6} y1={9} x2={18} y2={9} {...common(c, sw)} />
      <Line x1={6} y1={5.5} x2={6} y2={12.5} {...common(c, sw)} />
      <Line x1={18} y1={5.5} x2={18} y2={12.5} {...common(c, sw)} />
      <Circle cx={12} cy={18.5} r={2.2} {...common(c, sw)} />
    </>
  ),
  Neptune: ({ c, sw }) => (
    <>
      <Path d="M6.5 8.5 A 5.5 5.5 0 0 1 17.5 8.5" {...common(c, sw)} />
      <Line x1={6.5} y1={5} x2={6.5} y2={9} {...common(c, sw)} />
      <Line x1={17.5} y1={5} x2={17.5} y2={9} {...common(c, sw)} />
      <Line x1={12} y1={3} x2={12} y2={20} {...common(c, sw)} />
      <Line x1={8} y1={16.5} x2={16} y2={16.5} {...common(c, sw)} />
    </>
  ),
  Pluto: ({ c, sw }) => (
    <>
      <Path d="M6.5 8 A 5.5 5.5 0 0 0 17.5 8" {...common(c, sw)} />
      <Circle cx={12} cy={7.5} r={2.4} {...common(c, sw)} />
      <Line x1={12} y1={10.5} x2={12} y2={20} {...common(c, sw)} />
      <Line x1={8} y1={16.5} x2={16} y2={16.5} {...common(c, sw)} />
    </>
  ),

  // ── Zodiac signs ─────────────────────────────────────────────────────────
  Aries: ({ c, sw }) => (
    <Path
      d="M12 20 L12 9 M12 9 C12 5 8 5 8 8.5 C8 11 10 11 10.5 9.5 M12 9 C12 5 16 5 16 8.5 C16 11 14 11 13.5 9.5"
      {...common(c, sw)}
    />
  ),
  Taurus: ({ c, sw }) => (
    <>
      <Circle cx={12} cy={15} r={5} {...common(c, sw)} />
      <Path d="M4.5 6.5 A 8 5 0 0 0 19.5 6.5" {...common(c, sw)} />
    </>
  ),
  Gemini: ({ c, sw }) => (
    <>
      <Path d="M6.5 5 A 7 3 0 0 0 17.5 5" {...common(c, sw)} />
      <Path d="M6.5 19 A 7 3 0 0 1 17.5 19" {...common(c, sw)} />
      <Line x1={9.5} y1={5.5} x2={9.5} y2={18.5} {...common(c, sw)} />
      <Line x1={14.5} y1={5.5} x2={14.5} y2={18.5} {...common(c, sw)} />
    </>
  ),
  Cancer: ({ c, sw }) => (
    <>
      <Path d="M4 11 A 6 6 0 0 1 16 10.5" {...common(c, sw)} />
      <Circle cx={7.5} cy={11.5} r={2.1} {...common(c, sw)} />
      <Path d="M20 13 A 6 6 0 0 1 8 13.5" {...common(c, sw)} />
      <Circle cx={16.5} cy={12.5} r={2.1} {...common(c, sw)} />
    </>
  ),
  Leo: ({ c, sw }) => (
    <>
      <Circle cx={8.5} cy={15.5} r={3.2} {...common(c, sw)} />
      <Path d="M11 14 C 13 9, 7 5, 11 5 C 15.5 5, 15 11, 18 13" {...common(c, sw)} />
    </>
  ),
  Virgo: ({ c, sw }) => (
    <Path
      d="M5 7 L5 16 M5 8.5 C5 6.5 8 6.5 8 8.5 L8 16 M8 8.5 C8 6.5 11 6.5 11 8.5 L11 16 C11 19 14 19 15.5 16.5 C17 14 15 11 12.5 13"
      {...common(c, sw)}
    />
  ),
  Libra: ({ c, sw }) => (
    <>
      <Line x1={4.5} y1={18} x2={19.5} y2={18} {...common(c, sw)} />
      <Path d="M5 13.5 L9 13.5 A 3.2 3.2 0 0 1 15 13.5 L19 13.5" {...common(c, sw)} />
    </>
  ),
  Scorpio: ({ c, sw }) => (
    <>
      <Path
        d="M5 7 L5 16 M5 8.5 C5 6.5 8 6.5 8 8.5 L8 16 M8 8.5 C8 6.5 11 6.5 11 8.5 L11 18"
        {...common(c, sw)}
      />
      <Path d="M11 18 L16 13 M12.5 13 L16 13 L16 16.5" {...common(c, sw)} />
    </>
  ),
  Sagittarius: ({ c, sw }) => (
    <>
      <Line x1={5.5} y1={18.5} x2={18} y2={6} {...common(c, sw)} />
      <Path d="M13 6 L18 6 L18 11" {...common(c, sw)} />
      <Line x1={9} y1={12} x2={15} y2={18} {...common(c, sw)} />
    </>
  ),
  Capricorn: ({ c, sw }) => (
    <Path
      d="M4.5 8 C 7 5.5, 9 8, 9 11.5 L 10.5 16 C 12 8, 18 10.5, 15.5 16 C 14 19, 11.5 17.5, 13 15.5"
      {...common(c, sw)}
    />
  ),
  Aquarius: ({ c, sw }) => (
    <>
      <Path d="M4 10.5 L7 8.5 L10 10.5 L13 8.5 L16 10.5 L19 8.5" {...common(c, sw)} />
      <Path d="M4 15.5 L7 13.5 L10 15.5 L13 13.5 L16 15.5 L19 13.5" {...common(c, sw)} />
    </>
  ),
  Pisces: ({ c, sw }) => (
    <>
      <Path d="M7.5 4.5 C 3.5 8, 3.5 16, 7.5 19.5" {...common(c, sw)} />
      <Path d="M16.5 4.5 C 20.5 8, 20.5 16, 16.5 19.5" {...common(c, sw)} />
      <Line x1={6} y1={12} x2={18} y2={12} {...common(c, sw)} />
    </>
  ),

  // ── Aspects ──────────────────────────────────────────────────────────────
  Conjunction: ({ c, sw }) => (
    <>
      <Circle cx={9.5} cy={14.5} r={3.5} {...common(c, sw)} />
      <Line x1={12} y1={12} x2={18.5} y2={5.5} {...common(c, sw)} />
    </>
  ),
  Sextile: ({ c, sw }) => (
    <>
      <Line x1={12} y1={4} x2={12} y2={20} {...common(c, sw)} />
      <Line x1={5} y1={8} x2={19} y2={16} {...common(c, sw)} />
      <Line x1={19} y1={8} x2={5} y2={16} {...common(c, sw)} />
    </>
  ),
  Square: ({ c, sw }) => (
    <Rect x={6} y={6} width={12} height={12} rx={1} {...common(c, sw)} />
  ),
  Trine: ({ c, sw }) => <Path d="M12 5 L19 18 L5 18 Z" {...common(c, sw)} />,
  Opposition: ({ c, sw }) => (
    <>
      <Circle cx={6} cy={12} r={2.5} {...common(c, sw)} />
      <Circle cx={18} cy={12} r={2.5} {...common(c, sw)} />
      <Line x1={8.5} y1={12} x2={15.5} y2={12} {...common(c, sw)} />
    </>
  ),

  // ── Points ───────────────────────────────────────────────────────────────
  Ascendant: ({ c, sw }) => (
    <Path d="M5 16 L12 8 L19 16" {...common(c, sw)} />
  ),
  // North Node ☊ — horseshoe opening downward, feet ending in small circles
  NorthNode: ({ c, sw }) => (
    <>
      <Path d="M7 18 C 5 10, 8 5, 12 5 C 16 5, 19 10, 17 18" {...common(c, sw)} />
      <Circle cx={6.5} cy={18} r={1.6} {...common(c, sw)} />
      <Circle cx={17.5} cy={18} r={1.6} {...common(c, sw)} />
    </>
  ),
  // South Node ☋ — horseshoe opening upward
  SouthNode: ({ c, sw }) => (
    <>
      <Path d="M7 6 C 5 14, 8 19, 12 19 C 16 19, 19 14, 17 6" {...common(c, sw)} />
      <Circle cx={6.5} cy={6} r={1.6} {...common(c, sw)} />
      <Circle cx={17.5} cy={6} r={1.6} {...common(c, sw)} />
    </>
  ),
  Retrograde: ({ c, sw }) => (
    <>
      <Path d="M7 6 L7 18 M7 6 L12 6 C15 6 15 11 12 11 L7 11" {...common(c, sw)} />
      <Line x1={11} y1={11} x2={16} y2={18} {...common(c, sw)} />
    </>
  ),
};

const DEFAULT_COLOR = colors.gold[300];

interface GlyphProps {
  name: string;
  size?: number;
  color?: string;
  /** Rendered stroke width in px (kept consistent across sizes). */
  strokeWidth?: number;
}

/** Standalone glyph (own <Svg>) — for React Native Text/row contexts. */
export function Glyph({
  name,
  size = 24,
  color = DEFAULT_COLOR,
  strokeWidth = 1.6,
}: GlyphProps) {
  const render = GLYPHS[name];
  if (!render) return null;
  // stroke units → px scale is size/24, so scale up units to hit target px
  const sw = strokeWidth * (24 / size);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render({ c: color, sw })}
    </Svg>
  );
}

interface GlyphGroupProps {
  name: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Glyph as a <G> for embedding inside an existing <Svg> (the chart wheel). */
export function GlyphGroup({
  name,
  x,
  y,
  size = 16,
  color = DEFAULT_COLOR,
  strokeWidth = 1.5,
}: GlyphGroupProps) {
  const render = GLYPHS[name];
  if (!render) return null;
  const s = size / 24;
  return (
    <G transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}>
      {render({ c: color, sw: strokeWidth / s })}
    </G>
  );
}

export function hasGlyph(name: string): boolean {
  return name in GLYPHS;
}
