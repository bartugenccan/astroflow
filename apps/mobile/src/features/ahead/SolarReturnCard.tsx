import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { AppText } from "../../components/ui/AppText";
import { RunningLightBorder } from "../../components/ui/RunningLightBorder";
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

  const year = useCachedAsync(
    dto ? yearAheadKey(dto, locale) : null,
    () => astrologyApi.getYearAhead(dto!, locale),
  );

  const days = profile ? daysUntilBirthday(profile.birthDate) : 0;
  const soon = days <= SOON_DAYS;
  const progress = Math.round(((365 - Math.min(days, 365)) / 365) * 100);

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
        <RunningLightBorder intense={soon} cardStyle={styles.card}>
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
        </RunningLightBorder>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.xl,
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
