import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Glyph } from "../../components/Glyph";
import { GlossaryMark } from "../../lib/glossary";
import { colors } from "../../lib/design-system";

/** Renders a glossary term's mark — an SVG astro glyph or an Ionicon. */
export function TermMark({
  mark,
  size,
  color = colors.gold[200],
}: {
  mark: GlossaryMark;
  size: number;
  color?: string;
}) {
  if ("glyph" in mark) return <Glyph name={mark.glyph} size={size} color={color} />;
  return (
    <Ionicons
      name={mark.icon as keyof typeof Ionicons.glyphMap}
      size={size * 0.9}
      color={color}
    />
  );
}
