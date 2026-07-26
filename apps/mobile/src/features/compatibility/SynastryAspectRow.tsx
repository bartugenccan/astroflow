import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { SynastryTopAspect } from "../../services/types";
import { colors, spacing } from "../../lib/design-system";

const NATURE_COLOR: Record<string, string> = {
  harmonic: colors.semantic.harmonic,
  challenging: colors.semantic.challenging,
  neutral: colors.semantic.neutral,
};

/** One cross-chart contact: your planet — aspect — their planet. */
export function SynastryAspectRow({ aspect }: { aspect: SynastryTopAspect }) {
  const tint = NATURE_COLOR[aspect.nature] ?? colors.semantic.neutral;
  return (
    <View style={styles.row}>
      <View style={styles.planet}>
        <Glyph name={aspect.planetA} size={22} color={colors.moon} />
      </View>
      <View style={styles.middle}>
        <View style={[styles.aspectLine, { backgroundColor: tint }]} />
        <AppText variant="bodySmall" color={tint} style={styles.aspectLabel}>
          {aspect.aspect}
        </AppText>
        <View style={[styles.aspectLine, { backgroundColor: tint }]} />
      </View>
      <View style={styles.planet}>
        <Glyph name={aspect.planetB} size={22} color={colors.gold[300]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  planet: {
    width: 32,
    alignItems: "center",
  },
  middle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  aspectLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  aspectLabel: {
    letterSpacing: 0.5,
  },
});
