import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { RunningLightBorder } from "../../components/ui/RunningLightBorder";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { colors, palette, radii, spacing } from "../../lib/design-system";

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
        <Ionicons name="hourglass-outline" size={14} color={colors.star[300]} />
        <AppText variant="label" color={colors.text.accent} style={styles.shrink}>
          {t("election.eyebrow")}
        </AppText>
      </View>

      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="calendar" size={26} color={colors.star[200]} />
          <View style={styles.spark}>
            <Ionicons name="sparkles" size={12} color={colors.star[100]} />
          </View>
        </View>
        <AppText variant="title" style={styles.title}>
          {t("election.cardTitle")}
        </AppText>
      </View>

      <AppText variant="body">{t("election.cardSub")}</AppText>

      <View style={styles.actions}>
        <ChunkyButton
          label={t("election.modeCheck")}
          onPress={() => open("check")}
          variant="star"
          size="md"
          uppercase={false}
          style={styles.action}
          icon={<Ionicons name="help-circle-outline" size={18} color={palette.star.on} />}
        />
        <ChunkyButton
          label={t("election.modeSearch")}
          onPress={() => open("search")}
          variant="night"
          size="md"
          uppercase={false}
          style={styles.action}
          icon={<Ionicons name={isPremium ? "search" : "lock-closed"} size={16} color={colors.star[300]} />}
        />
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
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.star.soft,
  },
  spark: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    flex: 1,
  },
});
