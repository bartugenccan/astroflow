import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { QuestRow } from "../../components/ui/QuestRow";
import { SectionLink } from "../../components/ui/SectionLink";
import { StateView } from "../../components/ui/StateView";
import { EVENT_RULES } from "../../lib/mascotRules";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";
import type { DailyPlan, MascotState, PlanStep } from "../../services/types";
import { STEP_VISUAL, stepHref, stepWhy } from "./planCopy";

/** Today shows this many goals; the rest of the plan is one tap away. */
const SHOWN = 3;

interface TodayQuestsProps {
  plan: DailyPlan | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  state: MascotState | null;
  /** The sky check-in is answered on Today itself (in a sheet). */
  onSkyCheckIn: () => void;
  /** "Read today's sky" opens the reading. */
  onReading: () => void;
  onFullPlan: () => void;
}

/**
 * "Today's goals", Finch-style: the next three steps of the personal sky plan
 * as tick rows (open ones first), each going straight to where it's done, led
 * by the next Harita Yolu chapter. The full plan — every step, why it's there,
 * the week strip — is its own page (`/plan`).
 */
export function TodayQuests({
  plan,
  loading,
  error,
  onRetry,
  state,
  onSkyCheckIn,
  onReading,
  onFullPlan,
}: TodayQuestsProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const resting = !!state?.eclipse?.active;

  if (!plan) {
    return (
      <ChunkyCard style={styles.card}>
        <AppText variant="heading">{t("today.questsTitle")}</AppText>
        {error && !loading ? (
          <StateView kind="error" compact message={t("plan.loadError")} onAction={onRetry} />
        ) : (
          <StateView kind="loading" compact />
        )}
      </ChunkyCard>
    );
  }

  const steps: PlanStep[] = [...plan.anchors, ...plan.steps];
  const isDone = (s: PlanStep) => (state?.today?.[s.kind] ?? 0) > 0;
  // Harita Yolu's next chapter is a goal of its own (ticked once a lesson is done today).
  const openChapter = state?.skyPath?.find((c) => c.status === "open") ?? null;
  const lessonToday = (state?.today?.SKY_LESSON ?? 0) > 0;
  const lessonQuest = openChapter || lessonToday ? { chapter: openChapter, done: lessonToday } : null;
  const done = steps.filter(isDone).length + (lessonQuest?.done ? 1 : 0);
  const total = steps.length + (lessonQuest ? 1 : 0);
  const ordered = [...steps.filter((s) => !isDone(s)), ...steps.filter(isDone)];
  const shown = ordered.slice(0, lessonQuest ? SHOWN - 1 : SHOWN);

  const titleOf = (s: PlanStep) => {
    const titled = t(s.titleKey as TranslationKey);
    return titled === s.titleKey ? t(`aster.quests.${s.kind}` as TranslationKey) : titled;
  };

  const go = (s: PlanStep) => {
    if (s.kind === "SKY_CHECKIN") return onSkyCheckIn;
    if (s.kind === "SKY_READ") return onReading;
    const href = stepHref(t, locale, s, plan.focusArea);
    return href ? () => router.push(href as Href) : undefined;
  };

  return (
    <ChunkyCard style={styles.card}>
      <View style={styles.head}>
        <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
          {t("today.questsTitle")}
        </AppText>
        {!resting ? (
          <AppText variant="numeric" color={done === total ? colors.semantic.harmonic : colors.text.secondary}>
            {t("plan.progress", { done, total })}
          </AppText>
        ) : null}
      </View>

      {resting ? (
        <View style={styles.resting}>
          <Ionicons name="moon" size={18} color={colors.text.violet} />
          <AppText variant="bodySmall" color={colors.text.secondary} style={styles.flex}>
            {t("plan.resting")}
          </AppText>
        </View>
      ) : (
        <View>
          {lessonQuest ? (
            <QuestRow
              title={t("today.lessonQuest")}
              subtitle={
                lessonQuest.chapter ? t(`skypath.lessons.${lessonQuest.chapter.key}.title` as TranslationKey) : undefined
              }
              done={lessonQuest.done}
              icon="map"
              tone="sky"
              xp={EVENT_RULES.SKY_LESSON.xp}
              xpLabel={t("plan.xp", { n: EVENT_RULES.SKY_LESSON.xp })}
              onPress={
                lessonQuest.chapter ? () => router.push(`/lesson/${lessonQuest.chapter!.key}` as Href) : undefined
              }
            />
          ) : null}
          {shown.map((s, i) => {
            const visual = STEP_VISUAL[s.kind] ?? { icon: "star" as const, tone: "primary" as const };
            const why = stepWhy(t, s, plan.focusArea);
            const xp = EVENT_RULES[s.kind]?.xp ?? 0;
            const title = s.kind === "SKY_CHECKIN" ? t("today.skyCheckInTitle") : titleOf(s);
            const finished = isDone(s);
            return (
              <QuestRow
                key={`${s.kind}-${i}`}
                title={title}
                subtitle={why?.text}
                done={finished}
                icon={visual.icon}
                tone={visual.tone}
                xp={xp}
                xpLabel={t("plan.xp", { n: xp })}
                onPress={go(s)}
                accessibilityLabel={[title, why?.text, finished ? t("plan.done") : t("plan.xp", { n: xp })]
                  .filter(Boolean)
                  .join(". ")}
              />
            );
          })}
        </View>
      )}

      <SectionLink
        label={t("today.fullPlan")}
        icon="map"
        tone="mint"
        value={resting ? undefined : `${done}/${total}`}
        bare
        onPress={onFullPlan}
        style={styles.link}
      />
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 32 },
  flex: { flex: 1, minWidth: 0 },
  resting: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  link: { paddingHorizontal: 0, marginTop: spacing.xs },
});
