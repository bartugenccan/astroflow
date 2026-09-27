import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { SynastryTopAspect } from "../../services/types";
import { aspectPhrase } from "../../lib/astroLanguage";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing, motion } from "../../lib/design-system";

const NATURE_COLOR: Record<string, string> = {
  harmonic: colors.semantic.harmonic,
  challenging: colors.semantic.challenging,
  neutral: colors.semantic.neutral,
};

/** Half-line draw time; the whole connection draws in ~2× this. */
const HALF_DRAW = 320;

interface SynastryAspectRowProps {
  aspect: SynastryTopAspect;
  /** Delay before the connecting line starts drawing (ms). */
  delay?: number;
}

/**
 * One cross-chart contact: your planet — aspect — their planet. The connecting
 * line draws from your planet to theirs, with the aspect dot popping in at the
 * midpoint, so the row reads as "a thread between you".
 */
export function SynastryAspectRow({ aspect, delay = 0 }: SynastryAspectRowProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const tint = NATURE_COLOR[aspect.nature] ?? colors.semantic.neutral;

  const left = useSharedValue(reduced ? 1 : 0);
  const dot = useSharedValue(reduced ? 1 : 0);
  const right = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      left.value = 1;
      dot.value = 1;
      right.value = 1;
      return;
    }
    const ease = Easing.out(Easing.quad);
    left.value = withDelay(delay, withTiming(1, { duration: HALF_DRAW, easing: ease }));
    dot.value = withDelay(delay + HALF_DRAW - 60, withSpring(1, motion.spring.snappy));
    right.value = withDelay(
      delay + HALF_DRAW,
      withTiming(1, { duration: HALF_DRAW, easing: ease }),
    );
  }, [delay, reduced, left, dot, right]);

  const leftStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: left.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: right.value }] }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dot.value,
    transform: [{ scale: dot.value }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.planet}>
          <Glyph name={aspect.planetA} size={22} color={colors.moon} />
        </View>
        <View style={styles.middle}>
          <Animated.View style={[styles.aspectLine, { backgroundColor: tint }, leftStyle]} />
          <Animated.View style={[styles.aspectDot, { backgroundColor: tint }, dotStyle]} />
          <Animated.View style={[styles.aspectLine, { backgroundColor: tint }, rightStyle]} />
        </View>
        <View style={styles.planet}>
          <Glyph name={aspect.planetB} size={22} color={colors.gold[300]} />
        </View>
      </View>
      {/* The diagram shows the contact; this says what it means. */}
      <AppText variant="bodySmall" color={tint} center style={styles.phrase}>
        {aspectPhrase(
          t,
          aspect.aspect,
          t(`planets.${aspect.planetA}` as TranslationKey),
          t(`planets.${aspect.planetB}` as TranslationKey),
          false,
        )}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  aspectDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginHorizontal: spacing.xs,
  },
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
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.5,
    // Grow from the left edge so the thread visibly travels A → B.
    transformOrigin: "left",
  },
  phrase: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
  },
});
