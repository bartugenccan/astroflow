import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { PressableScale } from "../../components/ui/PressableScale";
import { MoonPhase } from "../../components/MoonPhase";
import { useTranslation, type TranslationKey } from "../../i18n";
import type { DailyPlan } from "../../services/types";
import { colors, palette, radii, shadows, spacing } from "../../lib/design-system";
import { personalMoonLine, whenLabel, type LunarInfo } from "./wishModel";

interface LunarCycleHeroProps {
  lunar: LunarInfo;
  plan: DailyPlan | null;
}

/**
 * Where the Moon is in its cycle (new → full → new) and what that asks of
 * your wishes: act while it grows, release while it wanes. The personal line
 * comes from today's plan — the Moon's house in the user's own chart.
 */
export function LunarCycleHero({ lunar, plan }: LunarCycleHeroProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const personal = personalMoonLine(t, locale, plan, lunar.waxing);

  const headline = lunar.window
    ? lunar.window.phase === "new"
      ? t("wish.lunar.windowNew")
      : t("wish.lunar.windowFull")
    : lunar.waxing
      ? t("wish.lunar.waxing")
      : t("wish.lunar.waning");
  const next = lunar.waxing
    ? t("wish.lunar.nextFull", { when: whenLabel(t, lunar.daysToFull) })
    : t("wish.lunar.nextNew", { when: whenLabel(t, lunar.daysToNew) });

  return (
    <ChunkyCard depth="lg" style={styles.card}>
      <View style={styles.head}>
        <View style={styles.moon} accessible={false} importantForAccessibility="no-hide-descendants">
          <MoonPhase size={68} />
        </View>
        <View style={styles.headText}>
          <AppText variant="label" color={colors.text.accent}>
            {t("wish.lunar.eyebrow")} · {t("wish.lunar.dayOf", { n: lunar.day })}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {t(`moonPhase.${lunar.phaseKey}` as TranslationKey)}
          </AppText>
          <AppText variant="heading" color={lunar.waxing ? palette.mint.face : palette.sky.face}>
            {headline}
          </AppText>
        </View>
      </View>

      <View style={styles.track}>
        <ChunkyProgress
          value={lunar.progress}
          tone="star"
          height={14}
          accessibilityLabel={t("wish.lunar.progressA11y", { pct: Math.round(lunar.progress * 100) })}
        />
        <View style={styles.marks} importantForAccessibility="no-hide-descendants">
          <AppText variant="numeric">{t("wish.lunar.newShort")}</AppText>
          <AppText variant="numeric">{t("wish.lunar.fullShort")}</AppText>
          <AppText variant="numeric">{t("wish.lunar.newShort")}</AppText>
        </View>
      </View>

      <AppText variant="body">
        {lunar.waxing ? t("wish.lunar.waxingBody") : t("wish.lunar.waningBody")} {lunar.window ? "" : next}
      </AppText>

      {personal ? (
        <PressableScale
          onPress={() => router.push("/chart" as Href)}
          scaleTo={0.98}
          style={styles.personal}
          accessibilityRole="link"
          accessibilityLabel={personal}
        >
          <Ionicons name="moon" size={18} color={colors.moon} />
          <AppText variant="bodySmall" color={colors.text.primary} style={styles.flex}>
            {personal}
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </PressableScale>
      ) : null}
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  moon: {
    width: 84,
    height: 84,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.night.soft,
    // The Moon is luminous: it may glow.
    ...shadows.glow,
    shadowColor: colors.moon,
    shadowOpacity: 0.35,
  },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  track: { gap: spacing.xs },
  marks: { flexDirection: "row", justifyContent: "space-between" },
  personal: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.night.soft,
    borderWidth: 2,
    borderColor: colors.border.hairlineStrong,
  },
  flex: { flex: 1 },
});
