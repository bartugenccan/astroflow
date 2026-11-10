import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { PressableScale } from "../../components/ui/PressableScale";
import { StateView } from "../../components/ui/StateView";
import { StarBurst } from "../intentions/StarBurst";
import { EVENT_RULES } from "../../lib/mascotRules";
import { useTranslation, TranslationKey } from "../../i18n";
import { areaTone, colors, motion, palette, radii, spacing, surface } from "../../lib/design-system";
import type { DailyPlan, LifeArea, MascotState, PlanStep } from "../../services/types";
import { Collapse } from "./Collapse";
import { AREA_ICON, STEP_VISUAL, areaName, moonLine, stepHref, stepWhy } from "./planCopy";

interface SkyPlanCardProps {
  plan: DailyPlan | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  state: MascotState | null;
  /** Start with the steps showing (inside the full-plan sheet). */
  initiallyOpen?: boolean;
}

/**
 * "Your sky plan": today's focus from the chart, then the daily anchors and
 * 3–4 personal steps — each with the transit (or moon / mood) that put it
 * there and the Light it feeds Aster. Collapsed to a progress strip by
 * default; springs open on tap. A "This week" strip leads to the forecast.
 */
export function SkyPlanCard({ plan, loading, error, onRetry, state, initiallyOpen = false }: SkyPlanCardProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(initiallyOpen);
  const chevron = useSharedValue(initiallyOpen ? 1 : 0);
  const [burst, setBurst] = useState(0);
  const wasDone = useRef<boolean | null>(null);

  const resting = !!state?.eclipse?.active;
  const steps: PlanStep[] = plan ? [...plan.anchors, ...plan.steps] : [];
  const isDone = (s: PlanStep) => (state?.today?.[s.kind] ?? 0) > 0;
  const done = steps.filter(isDone).length;
  const total = steps.length;
  const allDone = total > 0 && done === total;

  // Burst once when the last step ticks (not on every render of a finished plan).
  useEffect(() => {
    if (!plan || !state) return;
    if (wasDone.current === false && allDone) setBurst((b) => b + 1);
    wasDone.current = allDone;
  }, [allDone, plan, state]);

  useEffect(() => {
    chevron.value = reduced ? (open ? 1 : 0) : withSpring(open ? 1 : 0, motion.spring.press);
  }, [open, reduced, chevron]);
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${chevron.value * 180}deg` }] }));

  if (!plan) {
    return (
      <ChunkyCard style={styles.card}>
        <AppText variant="heading">{t("plan.title")}</AppText>
        {error && !loading ? (
          <StateView kind="error" compact message={t("plan.loadError")} onAction={onRetry} />
        ) : (
          <StateView kind="loading" compact />
        )}
      </ChunkyCard>
    );
  }

  const focus = t("plan.focus", { area: areaName(t, plan.focusArea) });
  const moon = moonLine(t, locale, plan.moon);
  const focusLine = moon ? `${focus} · ${moon}` : focus;
  const tone = areaTone[plan.focusArea] ?? "primary";

  return (
    <ChunkyCard style={styles.card}>
      <PressableScale
        onPress={resting ? undefined : () => setOpen((o) => !o)}
        disabled={resting}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: resting }}
        accessibilityLabel={`${t("plan.title")}. ${focusLine}. ${t("plan.progressA11y", { done, total })}`}
        accessibilityHint={resting ? undefined : open ? t("plan.collapse") : t("plan.expand")}
        style={styles.head}
      >
        <View style={[styles.focusIcon, { backgroundColor: palette[tone].face }]}>
          <Ionicons name={AREA_ICON[plan.focusArea]} size={20} color={palette[tone].on} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">{t("plan.title")}</AppText>
          <AppText variant="bodySmall" color={colors.text.secondary} numberOfLines={2}>
            {focusLine}
          </AppText>
        </View>
        {!resting ? (
          <>
            <View style={[styles.counter, allDone && styles.counterDone]}>
              <Ionicons name="sparkles" size={14} color={allDone ? palette.mint.on : palette.star.face} />
              <AppText variant="numeric" color={allDone ? palette.mint.on : colors.text.primary}>
                {t("plan.progress", { done, total })}
              </AppText>
            </View>
            <Animated.View style={chevronStyle}>
              <Ionicons name="chevron-down" size={20} color={colors.text.tertiary} />
            </Animated.View>
          </>
        ) : null}
      </PressableScale>

      {resting ? (
        <View style={styles.resting}>
          <Ionicons name="moon" size={18} color={colors.text.violet} />
          <AppText variant="bodySmall" color={colors.text.secondary} style={styles.flex}>
            {t("plan.resting")}
          </AppText>
        </View>
      ) : (
        <>
          <ChunkyProgress
            value={total ? done / total : 0}
            tone="mint"
            segments={Math.max(1, total)}
            height={10}
            accessibilityLabel={t("plan.progressA11y", { done, total })}
          />
          {allDone ? (
            <View style={styles.allDone}>
              <StarBurst playKey={burst} radius={70} count={10} />
              <AppText variant="heading" color={palette.mint.face} center>
                {t("plan.allDone")}
              </AppText>
            </View>
          ) : null}
          <Collapse open={open}>
            <View style={styles.list}>
              {steps.map((s, i) => (
                <StepRow
                  key={`${s.kind}-${i}`}
                  step={s}
                  done={isDone(s)}
                  focusArea={plan.focusArea}
                  onGo={(href) => router.push(href)}
                />
              ))}
            </View>
          </Collapse>
        </>
      )}

      {plan.week.length ? <WeekStrip week={plan.week} today={plan.date} /> : null}
    </ChunkyCard>
  );
}

function StepRow({
  step,
  done,
  focusArea,
  onGo,
}: {
  step: PlanStep;
  done: boolean;
  focusArea: LifeArea;
  onGo: (href: Href) => void;
}) {
  const { t, locale } = useTranslation();
  const visual = STEP_VISUAL[step.kind] ?? { icon: "star" as const, tone: "primary" as const };
  const p = palette[visual.tone];
  const titleKey = step.titleKey as TranslationKey;
  const titled = t(titleKey);
  const title = titled === step.titleKey ? t(`aster.quests.${step.kind}` as TranslationKey) : titled;
  const why = stepWhy(t, step, focusArea);
  const href = stepHref(t, locale, step, focusArea);
  const xp = EVENT_RULES[step.kind]?.xp ?? 0;
  const pressable = !!href && !done;

  return (
    <PressableScale
      onPress={pressable ? () => onGo(href as Href) : undefined}
      disabled={!pressable}
      scaleTo={0.97}
      style={styles.row}
      accessibilityRole={pressable ? "button" : "text"}
      accessibilityState={{ checked: done, disabled: !pressable }}
      accessibilityLabel={[title, why?.text, done ? t("plan.done") : t("plan.xp", { n: xp })]
        .filter(Boolean)
        .join(". ")}
    >
      <View style={[styles.icon, { backgroundColor: done ? palette.mint.face : p.soft }]}>
        <Ionicons name={done ? "checkmark" : visual.icon} size={20} color={done ? palette.mint.on : p.face} />
      </View>
      <View style={styles.rowBody}>
        <AppText
          variant="heading"
          numberOfLines={2}
          color={done ? colors.text.tertiary : colors.text.primary}
          style={done && styles.doneText}
        >
          {title}
        </AppText>
        {why ? (
          <View style={[styles.why, { backgroundColor: palette[why.tone].soft }]}>
            <Ionicons name={why.icon} size={12} color={palette[why.tone].face} />
            <AppText variant="labelLong" color={palette[why.tone].face} numberOfLines={1} style={styles.whyText}>
              {why.text}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.xp}>
        <Ionicons name="sparkles" size={12} color={palette.star.face} />
        <AppText variant="numeric" color={palette.star.face}>
          {t("plan.xp", { n: xp })}
        </AppText>
      </View>
    </PressableScale>
  );
}

function WeekStrip({ week, today }: { week: DailyPlan["week"]; today: string }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const loc = locale === "tr" ? "tr-TR" : "en-US";
  const dayLabel = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(loc, { weekday: "short" });
  };

  return (
    <PressableScale
      onPress={() => router.push("/(tabs)/sky?pane=future" as Href)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${t("plan.weekA11y")} ${week
        .map((d) => t("plan.weekDay", { day: dayLabel(d.date), area: areaName(t, d.area) }))
        .join(", ")}`}
      style={styles.week}
    >
      <View style={styles.weekHead}>
        <AppText variant="label">{t("plan.week")}</AppText>
        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
      </View>
      <View style={styles.weekRow}>
        {week.slice(0, 7).map((d) => {
          const tone = areaTone[d.area] ?? "primary";
          const isToday = d.date === today;
          return (
            <View key={d.date} style={[styles.day, isToday && { borderColor: palette[tone].face }]}>
              <AppText variant="numeric" color={isToday ? colors.text.primary : colors.text.tertiary} numberOfLines={1}>
                {dayLabel(d.date)}
              </AppText>
              <View style={[styles.dayIcon, { backgroundColor: palette[tone].soft }]}>
                <Ionicons name={AREA_ICON[d.area]} size={14} color={palette[tone].face} />
              </View>
            </View>
          );
        })}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
  focusIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, minWidth: 0 },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: surface.raised,
  },
  counterDone: { backgroundColor: palette.mint.face },
  resting: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.primary.soft,
  },
  allDone: { alignItems: "center", justifyContent: "center", minHeight: 32 },
  list: { gap: spacing.xs, paddingTop: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.xs,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  doneText: { textDecorationLine: "line-through" },
  why: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  whyText: { flexShrink: 1 },
  xp: { flexDirection: "row", alignItems: "center", gap: 2 },
  week: { gap: spacing.sm, paddingTop: spacing.xs },
  weekHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weekRow: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  day: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: "transparent",
    minHeight: 44,
  },
  dayIcon: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
