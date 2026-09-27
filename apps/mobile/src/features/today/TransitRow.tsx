import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { useEffect } from "react";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { Transit } from "../../services/types";
import { aspectPhrase, aspectStrength } from "../../lib/astroLanguage";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

function aspectColor(aspect: string): string {
  if (aspect === "Trine" || aspect === "Sextile") return colors.semantic.harmonic;
  if (aspect === "Square" || aspect === "Opposition") return colors.semantic.challenging;
  return colors.semantic.neutral;
}

export function TransitRow({ transit }: { transit: Transit }) {
  const { t } = useTranslation();
  const tint = aspectColor(transit.aspect);
  const pulse = useSharedValue(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1.4, { duration: 1500 }), -1, true);
  }, [pulse, reduced]);

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
        {/* A sentence, not "Moon Trine Venus" — this is the first astrology
            a new user meets, right on the home screen. */}
        {/* Two lines: Turkish puts the verb last, so a one-line ellipsis
            cut off the very word that says what's happening. */}
        <AppText variant="body" color={colors.text.primary} numberOfLines={2}>
          {aspectPhrase(
            t,
            transit.aspect,
            t(`planets.${transit.transitPlanet}` as TranslationKey),
            t(`planets.${transit.natalPlanet}` as TranslationKey),
          )}
        </AppText>
        <AppText variant="bodySmall" numberOfLines={1}>
          {t(`signs.${transit.transitSign}` as TranslationKey)} ·{" "}
          {aspectStrength(t, transit.orb)}
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
    gap: 2,
    width: 58,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
