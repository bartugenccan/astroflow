import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { RunningLightBorder } from "../../components/ui/RunningLightBorder";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { colors, radii, spacing } from "../../lib/design-system";

/**
 * Front door to Election, at the top of For You. Same running-light frame as
 * the Solar Return card so it reads as a headline feature, with both ways in
 * on the card itself: ask about a date you have, or find one.
 */
export function ElectionCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPremium = useAppStore((s) => s.isPremium);
  const open = (mode: "check" | "search") => router.push(`/election?mode=${mode}` as Href);

  return (
    <RunningLightBorder cardStyle={styles.card}>
      <View style={styles.eyebrowRow}>
        <Ionicons name="hourglass-outline" size={14} color={colors.gold[300]} />
        <AppText variant="label" color={colors.text.gold} style={styles.shrink}>
          {t("election.eyebrow")}
        </AppText>
      </View>

      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="calendar" size={26} color={colors.gold[200]} />
          <View style={styles.spark}>
            <Ionicons name="sparkles" size={12} color={colors.gold[100]} />
          </View>
        </View>
        <AppText variant="title" style={styles.title}>
          {t("election.cardTitle")}
        </AppText>
      </View>

      <AppText variant="body">{t("election.cardSub")}</AppText>

      <View style={styles.actions}>
        <PressableScale
          onPress={() => open("check")}
          scaleTo={0.96}
          style={[styles.action, styles.primary]}
          accessibilityRole="button"
        >
          <Ionicons name="help-circle-outline" size={17} color={colors.text.onGold} />
          <AppText variant="heading" color={colors.text.onGold} style={styles.actionText} numberOfLines={1}>
            {t("election.modeCheck")}
          </AppText>
        </PressableScale>
        <PressableScale
          onPress={() => open("search")}
          scaleTo={0.96}
          style={[styles.action, styles.secondary]}
          accessibilityRole="button"
        >
          <Ionicons name={isPremium ? "search" : "lock-closed"} size={15} color={colors.gold[300]} />
          <AppText variant="heading" color={colors.gold[200]} style={styles.actionText} numberOfLines={1}>
            {t("election.modeSearch")}
          </AppText>
        </PressableScale>
      </View>
    </RunningLightBorder>
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
  shrink: { flexShrink: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glow.goldSoft,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
  spark: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 24,
    lineHeight: 30,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  primary: {
    backgroundColor: colors.gold[400],
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.gold[400],
    backgroundColor: colors.ink[800],
  },
  actionText: {
    fontSize: 14,
    flexShrink: 1,
  },
});
