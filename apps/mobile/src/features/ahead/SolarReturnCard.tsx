import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, LayoutChangeEvent } from "react-native";
import { useRouter, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  cancelAnimation,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { Canvas, RoundedRect, SweepGradient, BlurMask, vec } from "@shopify/react-native-skia";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { ScoreRing } from "../../components/ScoreRing";
import { CountUp } from "../../components/ui/CountUp";
import { TermInfo } from "../../components/TermInfo";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { astrologyApi } from "../../services/astrologyApi";
import { yearAheadKey } from "../../services/interpretationCache";
import { daysUntilBirthday } from "../../lib/dates";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, motion } from "../../lib/design-system";

const RING = 76;
/** Inside this many days the border spins faster and glows harder. */
const SOON_DAYS = 30;
/** How far the glow may spill past the card edge. */
const BLEED = 10;
const RADIUS = radii.lg;

/**
 * The Solar Return's permanent front door, pinned to the top of the Future
 * tab. It's the app's headline feature, so it isn't hidden behind a "Yearly"
 * segment someone might never tap: a gold light runs around its border
 * continuously, the technique is named outright ("Solar Return"), and a
 * countdown ring fills toward the next birthday.
 */
export function SolarReturnCard() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const reduced = useReducedMotion();
  const profile = useAppStore((s) => s.birthProfile);
  const dto = useBirthDto();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const year = useCachedAsync(
    dto ? yearAheadKey(dto, locale) : null,
    () => astrologyApi.getYearAhead(dto!, locale),
  );

  const days = profile ? daysUntilBirthday(profile.birthDate) : 0;
  const soon = days <= SOON_DAYS;
  const progress = Math.round(((365 - Math.min(days, 365)) / 365) * 100);

  // Running light: a sweep gradient whose angle turns forever.
  const angle = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(angle);
      angle.value = Math.PI / 4;
      return;
    }
    angle.value = 0;
    angle.value = withRepeat(
      withTiming(Math.PI * 2, { duration: soon ? 3200 : 6000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(angle);
  }, [reduced, soon, angle]);
  const shaderTransform = useDerivedValue(() => [{ rotate: angle.value }]);

  // A single soft "look at me" pulse each time the tab comes into focus.
  const pulse = useSharedValue(1);
  useFocusEffect(
    useCallback(() => {
      if (reduced) return;
      pulse.value = withSequence(
        withTiming(1.025, { duration: 260, easing: Easing.out(Easing.quad) }),
        withSpring(1, motion.spring.gentle),
      );
    }, [reduced, pulse]),
  );
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  const cw = size.w + BLEED * 2;
  const ch = size.h + BLEED * 2;
  const center = vec(cw / 2, ch / 2);
  const ringColors = [
    "rgba(150,118,47,0.15)",
    "rgba(247,240,221,0.95)",
    colors.gold[400],
    "rgba(150,118,47,0.15)",
    "rgba(150,118,47,0.15)",
  ];

  const headline =
    days === 0
      ? t("ahead.srToday")
      : soon
        ? t("ahead.srSoon")
        : t("ahead.srDays", { n: days });

  return (
    <Animated.View style={pulseStyle}>
      <PressableScale
        onPress={() => router.push("/year-ahead" as Href)}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${t("ahead.srEyebrow")} — ${t("ahead.srCta")}`}
      >
        <View onLayout={onLayout} style={styles.frame}>
          {size.w > 0 ? (
            <Canvas style={[styles.canvas, { width: cw, height: ch }]} pointerEvents="none">
              {/* Soft outer glow that follows the running light */}
              <RoundedRect
                x={BLEED}
                y={BLEED}
                width={size.w}
                height={size.h}
                r={RADIUS}
                style="stroke"
                strokeWidth={soon ? 6 : 4}
                opacity={soon ? 0.75 : 0.5}
              >
                <SweepGradient c={center} colors={ringColors} origin={center} transform={shaderTransform} />
                <BlurMask blur={soon ? 9 : 6} style="normal" />
              </RoundedRect>
              {/* Crisp border */}
              <RoundedRect
                x={BLEED + 0.75}
                y={BLEED + 0.75}
                width={size.w - 1.5}
                height={size.h - 1.5}
                r={RADIUS}
                style="stroke"
                strokeWidth={1.5}
              >
                <SweepGradient c={center} colors={ringColors} origin={center} transform={shaderTransform} />
              </RoundedRect>
            </Canvas>
          ) : null}

          <View style={styles.card}>
            <View style={styles.eyebrowRow}>
              <Ionicons name="sunny" size={14} color={colors.gold[300]} />
              <AppText variant="label" color={colors.text.gold} style={styles.shrink}>
                {t("ahead.srEyebrow")}
              </AppText>
              <TermInfo term="solarReturn" size={15} />
            </View>

            <View style={styles.row}>
              <ScoreRing
                score={progress}
                size={RING}
                stroke={5}
                delay={250}
                center={
                  days === 0 ? (
                    <Ionicons name="gift-outline" size={24} color={colors.gold[200]} />
                  ) : (
                    <CountUp value={days} delay={250} variant="title" color={colors.text.primary} />
                  )
                }
              />
              <View style={styles.text}>
                <AppText variant="title" style={styles.title}>
                  {t("ahead.srTitle")}
                </AppText>
                <AppText variant="heading" color={colors.gold[200]} style={styles.days}>
                  {headline}
                </AppText>
              </View>
            </View>

            <AppText variant="body">
              {year.data?.headline ? year.data.headline : t("ahead.srSub")}
            </AppText>

            <View style={styles.cta}>
              <AppText variant="heading" color={colors.text.onGold} style={styles.ctaText}>
                {t("ahead.srCta")}
              </AppText>
              <Ionicons name="arrow-forward" size={16} color={colors.text.onGold} />
            </View>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: RADIUS,
  },
  canvas: {
    position: "absolute",
    left: -BLEED,
    top: -BLEED,
  },
  card: {
    gap: spacing.md,
    padding: spacing.xl,
    margin: 1.5,
    borderRadius: RADIUS - 1,
    backgroundColor: colors.ink[900],
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  shrink: {
    flexShrink: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  days: {
    fontSize: 15,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.gold[400],
  },
  ctaText: {
    fontSize: 15,
    flexShrink: 1,
  },
});
