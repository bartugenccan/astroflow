import React from "react";
import Svg, { Path, Circle, Line, G, Rect } from "react-native-svg";
import { colors } from "../lib/design-system";
import { GLYPH_SHAPES, GlyphShape } from "../lib/glyphData";

/**
 * All astrological symbols, drawn as monochrome vector line-art on a 24×24
 * grid (shape data in lib/glyphData.ts, shared with the PDF reports).
 * Replaces the Unicode glyphs (♈☉ …) that the OS renders as color emoji,
 * which clashes with the gold theme.
 *
 * Keyed by canonical English name (Aries…Pisces, Sun…Pluto, aspect names,
 * Ascendant, Retrograde). Use <Glyph> in RN Text contexts and <GlyphGroup>
 * inside an existing <Svg> (the chart wheel — <Svg> can't nest).
 */

/** Render one glyph's shapes with react-native-svg. */
function renderShapes(shapes: GlyphShape[], c: string, sw: number): React.ReactNode {
  const stroke = {
    stroke: c,
    strokeWidth: sw,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return shapes.map((sh, i) => {
    switch (sh.t) {
      case "path":
        return <Path key={i} d={sh.d} {...stroke} />;
      case "circle":
        return sh.fill ? (
          <Circle key={i} cx={sh.cx} cy={sh.cy} r={sh.r} fill={c} />
        ) : (
          <Circle key={i} cx={sh.cx} cy={sh.cy} r={sh.r} {...stroke} />
        );
      case "line":
        return <Line key={i} x1={sh.x1} y1={sh.y1} x2={sh.x2} y2={sh.y2} {...stroke} />;
      case "rect":
        return <Rect key={i} x={sh.x} y={sh.y} width={sh.w} height={sh.h} rx={sh.rx} {...stroke} />;
    }
  });
}

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
  const shapes = GLYPH_SHAPES[name];
  if (!shapes) return null;
  // stroke units → px scale is size/24, so scale up units to hit target px
  const sw = strokeWidth * (24 / size);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderShapes(shapes, color, sw)}
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
  const shapes = GLYPH_SHAPES[name];
  if (!shapes) return null;
  const s = size / 24;
  return (
    <G transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}>
      {renderShapes(shapes, color, strokeWidth / s)}
    </G>
  );
}

export function hasGlyph(name: string): boolean {
  return name in GLYPH_SHAPES;
}
