import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { Transit } from "../../services/types";
import { colors, spacing } from "../../lib/design-system";

function aspectColor(aspect: string): string {
  if (aspect === "Trine" || aspect === "Sextile") return colors.semantic.harmonic;
  if (aspect === "Square" || aspect === "Opposition") return colors.semantic.challenging;
  return colors.semantic.neutral;
}

export function TransitRow({ transit }: { transit: Transit }) {
  const tint = aspectColor(transit.aspect);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.15, { duration: 1500 }), -1, true);
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.dot, { backgroundColor: tint }, dotStyle]} />
      <View style={styles.glyphs}>
        <Glyph name={transit.transitPlanet} size={18} color={colors.gold[300]} />
        <Glyph name={transit.aspect} size={14} color={tint} />
        <Glyph name={transit.natalPlanet} size={18} color={colors.moon} />
      </View>
      <View style={styles.text}>
        <AppText variant="body" color={colors.text.primary} numberOfLines={1}>
          {transit.transitPlanet} {transit.aspect} {transit.natalPlanet}
        </AppText>
        <AppText variant="bodySmall" numberOfLines={1}>
          {transit.transitSign} · {transit.orb.toFixed(1)}° orb
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  glyphs: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    width: 72,
  },
  text: {
    flex: 1,
  },
});
