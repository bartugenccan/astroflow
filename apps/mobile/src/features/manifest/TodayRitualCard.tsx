import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { useTranslation } from "../../i18n";
import type { Intention } from "../../services/types";
import { colors, palette, radii, spacing, type Tone } from "../../lib/design-system";
import { isDoneToday, starLook, type LunarInfo } from "./wishModel";

export type RitualAction =
  | { kind: "moon"; phase: "new" | "full" }
  | { kind: "power"; wish: Intention }
  | { kind: "evening" }
  | { kind: "gentle"; wish: Intention }
  | { kind: "done"; dayClosed: boolean };

/**
 * One contextual thing to do today, in priority order: the Moon ritual inside
 * a new/full moon window → a check-in on today's power wish → after 17:00,
 * closing the day → a gentle check-in on whichever wish is waiting for care.
 * Returns null when there are no wishes yet (the empty sky handles that).
 */
export function pickRitual(input: {
  lunar: LunarInfo;
  ritualDone: boolean;
  dayClosed: boolean;
  wishes: Intention[];
  powerIntentionId: string | null;
  hour: number;
}): RitualAction | null {
  const { lunar, ritualDone, dayClosed, wishes, powerIntentionId, hour } = input;
  if (lunar.window && !ritualDone) return { kind: "moon", phase: lunar.window.phase };
  const open = wishes.filter((w) => starLook(w) !== "waiting" && !isDoneToday(w));
  const power = open.find((w) => w.id === powerIntentionId);
  if (power) return { kind: "power", wish: power };
  if (hour >= 17 && !dayClosed) return { kind: "evening" };
  // Prefer a resting star: a little attention is what it's waiting for.
  const gentle = open.find((w) => starLook(w) === "resting") ?? open[0];
  if (gentle) return { kind: "gentle", wish: gentle };
  if (wishes.length === 0) return null;
  return { kind: "done", dayClosed };
}

interface TodayRitualCardProps {
  action: RitualAction;
  onMoon: () => void;
  onEvening: () => void;
  onCheckIn: (wish: Intention) => void;
}

export function TodayRitualCard({ action, onMoon, onEvening, onCheckIn }: TodayRitualCardProps) {
  const { t } = useTranslation();

  let tone: Tone = "primary";
  let icon: keyof typeof Ionicons.glyphMap = "sparkles";
  let title = "";
  let body = "";
  let cta: { label: string; onPress: () => void } | null = null;

  switch (action.kind) {
    case "moon":
      tone = "star";
      icon = action.phase === "new" ? "ellipse-outline" : "ellipse";
      title = action.phase === "new" ? t("wish.ritual.moonNewTitle") : t("wish.ritual.moonFullTitle");
      body = action.phase === "new" ? t("wish.ritual.moonNewBody") : t("wish.ritual.moonFullBody");
      cta = { label: t("wish.ritual.moonCta"), onPress: onMoon };
      break;
    case "power":
      tone = "star";
      icon = "flash";
      title = t("wish.ritual.powerTitle");
      body = t("wish.ritual.powerBody", { goal: action.wish.goalText });
      cta = { label: t("wish.ritual.checkInCta"), onPress: () => onCheckIn(action.wish) };
      break;
    case "evening":
      tone = "primary";
      icon = "moon";
      title = t("wish.ritual.eveningTitle");
      body = t("wish.ritual.eveningBody");
      cta = { label: t("wish.ritual.eveningCta"), onPress: onEvening };
      break;
    case "gentle":
      tone = "sky";
      icon = "heart";
      title = t("wish.ritual.gentleTitle");
      body = t("wish.ritual.gentleBody", { goal: action.wish.goalText });
      cta = { label: t("wish.ritual.checkInCta"), onPress: () => onCheckIn(action.wish) };
      break;
    case "done":
      tone = "mint";
      icon = "checkmark";
      title = t("wish.ritual.doneTitle");
      body = action.dayClosed ? t("wish.ritual.dayClosed") : t("wish.ritual.doneBody");
      break;
  }

  const p = palette[tone];
  return (
    <ChunkyCard tone={tone} tinted style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: p.face }]} importantForAccessibility="no-hide-descendants">
          <Ionicons name={icon} size={22} color={p.on} />
        </View>
        <View style={styles.text}>
          <AppText variant="label" color={colors.text.accent}>
            {t("wish.ritual.eyebrow")}
          </AppText>
          <AppText variant="heading" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="bodySmall" color={colors.text.secondary}>
            {body}
          </AppText>
        </View>
      </View>
      {cta ? <ChunkyButton label={cta.label} variant={tone} size="md" onPress={cta.onPress} /> : null}
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, minWidth: 0, gap: 2 },
});
