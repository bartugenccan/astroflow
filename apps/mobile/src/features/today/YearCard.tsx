import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { ScoreRing } from "../../components/ScoreRing";
import { CountUp } from "../../components/ui/CountUp";
import { TermInfo } from "../../components/TermInfo";
import { daysUntilBirthday } from "../../lib/dates";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

const RING = 76;
/** Inside this many days the card glows — the new year is close. */
const SOON_DAYS = 30;

/**
 * "Your year" — the permanent front door to the Solar Return. A countdown ring
 * fills as the birthday approaches (a full ring is the birthday), with one
 * line saying what the birthday chart is, and a tap into `/year-ahead`.
 */
export function YearCard({ birthDate }: { birthDate: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const reduced = useReducedMotion();
  const days = daysUntilBirthday(birthDate);
  const soon = days <= SOON_DAYS;
  const progress = Math.round(((365 - Math.min(days, 365)) / 365) * 100);

  // Slow breathing glow when the birthday is near.
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!soon || reduced) return;
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [soon, reduced, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + glow.value * 0.65 }));

  return (
    <PressableScale
      onPress={() => router.push("/year-ahead" as Href)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={t("today.yearCardCta")}
    >
      <HairlineCard style={[styles.card, soon && styles.cardSoon]}>
        {soon ? (
          <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
            <LinearGradient
              colors={[colors.glow.goldSoft, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}

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
            <View style={styles.eyebrowRow}>
              <AppText variant="label" color={colors.text.gold}>
                {t("today.yearCardEyebrow")}
              </AppText>
              <TermInfo term="solarReturn" size={14} />
            </View>
            <AppText variant="heading" color={colors.text.primary}>
              {days === 0
                ? t("today.yearCardBirthday")
                : soon
                  ? t("today.yearCardSoon")
                  : t("today.yearCardDays", { n: days })}
            </AppText>
            <AppText variant="bodySmall" color={colors.text.secondary}>
              {t("today.yearCardSub")}
            </AppText>
          </View>
        </View>

        <View style={styles.cta}>
          <AppText variant="heading" color={colors.gold[300]} style={styles.ctaText}>
            {t("today.yearCardCta")}
          </AppText>
          <Ionicons name="arrow-forward" size={16} color={colors.gold[300]} />
        </View>
      </HairlineCard>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  cardSoon: {
    borderColor: colors.border.hairlineStrong,
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
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  ctaText: {
    fontSize: 15,
  },
});
