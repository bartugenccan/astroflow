import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MotiView } from "moti";
import { AppText } from "../../components/ui/AppText";
import { BestDayScore, LifeArea } from "../../services/types";
import { colors, spacing, radii, shadows } from "../../lib/design-system";

interface BestDaysGridProps {
  scores: BestDayScore[];
  area: LifeArea;
  topDates: Set<string>;
  onDayPress: (score: BestDayScore) => void;
}

/** Heat colour for a 0-100 score: rose → slate → sage. */
function scoreColor(score: number): string {
  const stops =
    score < 45
      ? [colors.semantic.challenging, colors.semantic.neutral, (score - 15) / 30]
      : [colors.semantic.neutral, colors.semantic.harmonic, (score - 45) / 50];
  const [from, to, tRaw] = stops as [string, string, number];
  const t = Math.max(0, Math.min(1, tRaw));
  return mix(from, to, t);
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgba(${r},${g},${bl},0.28)`;
}

function hex(c: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return [140, 151, 184];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function dayNum(iso: string): string {
  const m = /^\d{4}-\d{2}-(\d{2})$/.exec(iso);
  return m ? String(parseInt(m[1], 10)) : "";
}

/** Scored day grid (7 per row). Colour = the selected area's score; top days glow gold. */
export function BestDaysGrid({ scores, area, topDates, onDayPress }: BestDaysGridProps) {
  return (
    <View style={styles.grid}>
      {scores.map((s, i) => {
        const value = s[area];
        const isTop = topDates.has(s.date);
        return (
          <MotiView
            key={s.date}
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 240, delay: Math.min(i * 18, 400) }}
            style={styles.cellWrap}
          >
            <Pressable
              onPress={() => onDayPress(s)}
              style={[
                styles.cell,
                { backgroundColor: scoreColor(value) },
                isTop && styles.cellTop,
              ]}
            >
              <AppText
                variant="numeric"
                color={isTop ? colors.gold[200] : colors.text.primary}
              >
                {dayNum(s.date)}
              </AppText>
              <AppText variant="label" style={styles.cellScore}>
                {value}
              </AppText>
            </Pressable>
          </MotiView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  cellWrap: {
    width: `${100 / 7}%`,
    padding: 3,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairline,
    gap: 1,
  },
  cellTop: {
    borderColor: colors.gold[400],
    ...shadows.goldGlow,
  },
  cellScore: {
    fontSize: 8,
    letterSpacing: 0.5,
  },
});
