import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { EnterView } from "../../lib/motion";
import { ScoreBar } from "./ScoreBar";
import { BestDayScore, LifeArea } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, shadows } from "../../lib/design-system";

interface BestDaysGridProps {
  scores: BestDayScore[];
  area: LifeArea;
  topDates: Set<string>;
  onDayPress: (score: BestDayScore) => void;
}

/** Heat colour for a 0-100 score: rose → slate → sage. */
function scoreColor(score: number, alpha = 0.28): string {
  const stops =
    score < 45
      ? [colors.semantic.challenging, colors.semantic.neutral, (score - 15) / 30]
      : [colors.semantic.neutral, colors.semantic.harmonic, (score - 45) / 50];
  const [from, to, tRaw] = stops as [string, string, number];
  const t = Math.max(0, Math.min(1, tRaw));
  return mix(from, to, t, alpha);
}

function mix(a: string, b: string, t: number, alpha: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgba(${r},${g},${bl},${alpha})`;
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

/** Per-cell delay: a quick wave across the grid, capped so 30 days don't drag. */
const cellDelay = (i: number) => Math.min(i * 22, 440);

/** Scored day grid (7 per row). Colour = the selected area's score; top days glow gold. */
export function BestDaysGrid({ scores, area, topDates, onDayPress }: BestDaysGridProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {scores.map((s, i) => {
          const value = s[area];
          const isTop = topDates.has(s.date);
          return (
            <EnterView
              key={s.date}
              delay={cellDelay(i)}
              distance={6}
              scale
              style={styles.cellWrap}
            >
              <PressableScale
                onPress={() => onDayPress(s)}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={`${s.date} · ${t("bestDays.scoreLabel")} ${value}`}
                style={[
                  styles.cell,
                  { backgroundColor: scoreColor(value) },
                  isTop && styles.cellTop,
                ]}
              >
                <AppText
                  variant="numeric"
                  color={isTop ? colors.gold[200] : colors.text.primary}
                  maxFontSizeMultiplier={1.2}
                >
                  {dayNum(s.date)}
                </AppText>
                <AppText variant="numeric" style={styles.cellScore} maxFontSizeMultiplier={1.1}>
                  {value}
                </AppText>
                <ScoreBar
                  value={value}
                  delay={cellDelay(i) + 120}
                  height={2}
                  color={isTop ? colors.gold[300] : scoreColor(value, 0.9)}
                  style={styles.cellBar}
                />
              </PressableScale>
            </EnterView>
          );
        })}
      </View>

      {/* Legend — so a newcomer can read the colours without guessing. */}
      <View style={styles.legend}>
        <LegendItem swatch={scoreColor(20, 0.6)} label={t("bestDays.legendLow")} />
        <LegendItem swatch={scoreColor(90, 0.6)} label={t("bestDays.legendHigh")} />
        <LegendItem swatch="transparent" gold label={t("bestDays.legendTop")} />
      </View>
    </View>
  );
}

function LegendItem({ swatch, label, gold }: { swatch: string; label: string; gold?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: swatch },
          gold && { borderColor: colors.gold[400] },
        ]}
      />
      <AppText variant="bodySmall" color={colors.text.tertiary} style={styles.legendText}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
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
    overflow: "hidden",
  },
  cellTop: {
    borderColor: colors.gold[400],
    ...shadows.goldGlow,
  },
  cellScore: {
    fontSize: 9,
    lineHeight: 11,
    color: colors.text.tertiary,
  },
  cellBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.lg,
    rowGap: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
    minWidth: 0,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  legendText: {
    flexShrink: 1,
  },
});
