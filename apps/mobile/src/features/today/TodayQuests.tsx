import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { PressableScale } from "../../components/ui/PressableScale";
import { EVENT_RULES, lunarWindow } from "../../lib/mascotRules";
import type { MascotEventKind, MascotState } from "../../services/types";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, palette, radii, spacing, surface, Tone } from "../../lib/design-system";

interface Quest {
  kind: MascotEventKind;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  href: Href | null;
}

const BASE: Quest[] = [
  { kind: "CHECKIN", icon: "checkmark-circle", tone: "candy", href: "/(tabs)/manifest" as Href },
  { kind: "AFFIRMATION", icon: "heart", tone: "primary", href: "/(tabs)/manifest" as Href },
  { kind: "SKY_READ", icon: "planet", tone: "sky", href: null },
  { kind: "TAROT", icon: "albums", tone: "star", href: "/(tabs)/tarot" as Href },
  { kind: "BREATH", icon: "leaf", tone: "mint", href: "/aster/breathe" as Href },
];

/** Today's quests: the day's list for Aster, plus the evening and moon quests when it's their time. */
export function questsFor(now = new Date()): Quest[] {
  const list = [...BASE];
  if (now.getHours() >= 17) {
    list.push({ kind: "EVENING_REFLECTION", icon: "moon", tone: "primary", href: "/(tabs)/manifest" as Href });
  }
  if (lunarWindow(now)) {
    list.push({ kind: "MOON_RITUAL", icon: "ellipse", tone: "star", href: "/(tabs)/manifest" as Href });
  }
  return list;
}

/**
 * Duolingo-style daily quests. Each one is an action that already lives in
 * the app; doing it feeds Aster and ticks the row. Ticks come from the
 * server's count of today's awards, so they survive restarts and devices.
 */
export function TodayQuests({ state }: { state: MascotState | null }) {
  const { t } = useTranslation();
  const router = useRouter();
  const quests = questsFor();
  const done = quests.filter((q) => (state?.today?.[q.kind] ?? 0) > 0).length;
  const allDone = done === quests.length;

  return (
    <ChunkyCard style={styles.card}>
      <View style={styles.head}>
        <AppText variant="title" style={styles.flex}>
          {t("aster.quests.title")}
        </AppText>
        <View style={[styles.counter, allDone && { backgroundColor: palette.mint.face }]}>
          <AppText variant="heading" color={allDone ? palette.mint.on : colors.text.primary}>
            {t("aster.quests.progress", { done, total: quests.length })}
          </AppText>
        </View>
      </View>
      <ChunkyProgress value={done / quests.length} tone="mint" segments={quests.length} height={12} />
      {allDone ? (
        <AppText variant="heading" color={palette.mint.face} center>
          {t("aster.quests.allDone")}
        </AppText>
      ) : null}

      <View style={styles.list}>
        {quests.map((q) => {
          const complete = (state?.today?.[q.kind] ?? 0) > 0;
          const p = palette[q.tone];
          const label = t(`aster.quests.${q.kind}` as TranslationKey);
          return (
            <PressableScale
              key={q.kind}
              onPress={q.href && !complete ? () => router.push(q.href as Href) : undefined}
              disabled={!q.href || complete}
              scaleTo={0.97}
              style={styles.row}
              accessibilityRole={q.href ? "button" : "text"}
              accessibilityState={{ checked: complete, disabled: complete }}
              accessibilityLabel={label}
            >
              <View style={[styles.icon, { backgroundColor: complete ? palette.mint.face : p.soft }]}>
                <Ionicons
                  name={complete ? "checkmark" : q.icon}
                  size={20}
                  color={complete ? palette.mint.on : p.face}
                />
              </View>
              <AppText
                variant="heading"
                style={[styles.flex, complete && styles.doneText]}
                color={complete ? colors.text.tertiary : colors.text.primary}
                numberOfLines={2}
              >
                {label}
              </AppText>
              <View style={styles.xp}>
                <Ionicons name="sparkles" size={13} color={palette.star.face} />
                <AppText variant="numeric" color={palette.star.face}>
                  {t("aster.quests.xp", { n: EVENT_RULES[q.kind].xp })}
                </AppText>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  counter: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: surface.raised,
  },
  list: { gap: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { textDecorationLine: "line-through" },
  xp: { flexDirection: "row", alignItems: "center", gap: 2 },
});
