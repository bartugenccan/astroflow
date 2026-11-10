import { runAfterInteractions, runAfterTransition } from "../../lib/afterInteractions";
import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { StyleSheet, View, ScrollView } from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { StateView } from "../../components/ui/StateView";
import { SectionLink } from "../../components/ui/SectionLink";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { EnterView } from "../../lib/motion";
import { astrologyApi } from "../../services/astrologyApi";
import { DailyInsight } from "../../services/types";
import { prefetchForecast } from "../../services/interpretationCache";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { usePlanStore } from "../../store/usePlanStore";
import { useAccountPromptStore } from "../../store/useAccountPromptStore";
import { energyLabel } from "../../lib/astroLanguage";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, palette } from "../../lib/design-system";
import { StatPill, StatRow } from "../../components/ui/StatPill";
import { useMascot } from "../aster/useMascot";
import { JourneySheet } from "../aster/JourneyDiscovery";
import { AsterHero } from "./AsterHero";
import { SkyCheckInCard } from "./SkyCheckInCard";
import { TodayQuests } from "./TodayQuests";

function greetingKey():
  | "today.greetingMorning"
  | "today.greetingAfternoon"
  | "today.greetingEvening" {
  const h = new Date().getHours();
  if (h < 12) return "today.greetingMorning";
  if (h < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

/**
 * Today is Aster's home (Finch-style). Top to bottom: the orbit streak and
 * Stardust; Aster, big and centred, greeting you with the day's headline;
 * "Today's goals" — the next three steps of the sky plan as tick rows (the sky
 * check-in is the first of them); and the day's reading, short, with the rest
 * a tap away. The full plan (`/plan`) and the whole reading with the sky
 * (`/sky-today`) are their own pages, so nothing is lost and nothing crowds. The reading stays even
 * while Aster rests in an eclipse.
 */
export function TodayScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const dto = useBirthDto();
  const displayName = useAppStore((s) => s.displayName);
  const setUnlockedFeatures = useAppStore((s) => s.setUnlockedFeatures);

  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const { state: mascot, refresh: refreshMascot } = useMascot();

  const plan = usePlanStore((s) => s.plan);
  const planLoading = usePlanStore((s) => s.loading);
  const planError = usePlanStore((s) => s.error);
  const refreshPlan = usePlanStore((s) => s.refresh);
  const offerProtect = useAccountPromptStore((s) => s.offer);

  const reloadPlan = useCallback(() => {
    if (dto) refreshPlan(dto);
  }, [dto, refreshPlan]);

  // The plan follows the server's view of mood and wishes: reload on every
  // focus — after the tab has eased in, so the re-render misses the animation.
  // With no plan yet there is nothing to protect: fetch straight away.
  useFocusEffect(
    useCallback(() => {
      if (!usePlanStore.getState().plan) {
        reloadPlan();
        return;
      }
      return runAfterTransition(reloadPlan);
    }, [reloadPlan]),
  );

  const resting = !!mascot?.eclipse?.active;
  const [sheet, setSheet] = useState<null | "checkin">(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  // Three days in orbit: a good moment to offer protecting Aster with an account.
  const orbitStreak = mascot?.orbit?.streak ?? 0;
  useEffect(() => {
    if (orbitStreak >= 3) offerProtect("orbit3", { resting });
  }, [orbitStreak, resting, offerProtect]);

  useEffect(() => {
    if (!dto) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    // A failure must end the loading state — a rejected promise used to
    // leave the guidance card spinning forever.
    astrologyApi
      .getDailyInsight(dto, locale)
      .then((ins) => {
        if (active) setInsight(ins);
        // Reading the sky ticks a plan anchor server-side — pull the new state.
        refreshMascot();
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dto, locale, attempt, refreshMascot]);

  // Warm the Future tab's forecast + hydrate device entitlements after first paint.
  useEffect(() => {
    if (!dto) return;
    const task = runAfterInteractions(() => {
      prefetchForecast(dto, locale);
      astrologyApi
        .getEntitlements()
        .then(setUnlockedFeatures)
        .catch(() => {});
    });
    return () => task.cancel();
  }, [dto, locale, setUnlockedFeatures]);

  const orbit = mascot?.orbit;
  const atRisk = !!orbit?.atRisk && !resting;

  const greeting = t(greetingKey(), { name: displayName });
  const speech = insight ? `${greeting}! ${insight.title}` : greeting;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.statBar}>
          <StatRow>
            <StatPill
              icon={atRisk ? "flame-outline" : "flame"}
              tone="candy"
              value={orbitStreak}
              muted={orbitStreak === 0}
              style={atRisk ? styles.atRisk : undefined}
              accessibilityLabel={
                atRisk
                  ? t("aster.orbit.atRiskA11y", { n: orbitStreak })
                  : t("aster.orbit.a11y", { n: orbitStreak })
              }
            />
            <StatPill
              icon="sparkles"
              tone="star"
              value={mascot?.stardust ?? 0}
              accessibilityLabel={`${mascot?.stardust ?? 0} ${t("aster.stardust")}`}
            />
          </StatRow>
        </EnterView>

        {/* 1 — Aster, the heart of Today. */}
        <EnterView index={1}>
          <AsterHero state={mascot} onOpenDiscovery={() => setDiscoveryOpen(true)} speech={speech} />
        </EnterView>

        {/* 2 — Today's goals: the plan's next steps as tick rows. */}
        <EnterView index={2}>
          <TodayQuests
            plan={plan}
            loading={planLoading}
            error={planError}
            onRetry={reloadPlan}
            state={mascot}
            onSkyCheckIn={() => setSheet("checkin")}
            onReading={() => router.push("/sky-today" as Href)}
            onFullPlan={() => router.push("/plan" as Href)}
          />
        </EnterView>

        {/* 3 — The day's reading, short; the whole of it and the sky are a tap away. */}
        <EnterView index={3} style={styles.readingWrap}>
          {failed && !insight ? (
            <ChunkyCard style={styles.reading}>
              <StateView
                kind="error"
                compact
                message={t("today.insightError")}
                onAction={() => setAttempt((n) => n + 1)}
              />
            </ChunkyCard>
          ) : loading || !insight ? (
            <ChunkyCard style={[styles.reading, styles.readingLoading]}>
              <CelestialLoader label={t("common.loading")} />
            </ChunkyCard>
          ) : (
            <ChunkyCard
              style={styles.reading}
              onPress={() => router.push("/sky-today" as Href)}
              accessibilityLabel={`${t("today.readingTitle")}. ${insight.title}`}
              accessibilityHint={t("today.readMore")}
            >
              <View style={styles.readingTop}>
                <AppText variant="label" color={colors.text.accent} style={styles.flex} numberOfLines={1}>
                  {t("today.readingTitle")}
                </AppText>
                <View style={styles.chip}>
                  <AppText variant="label" color={colors.star[300]} numberOfLines={1}>
                    {energyLabel(t, insight.energyState)}
                  </AppText>
                </View>
              </View>
              <AppText variant="heading">{insight.title}</AppText>
              <AppText variant="body" numberOfLines={3}>
                {insight.summary}
              </AppText>
              <AppText variant="labelLong" color={colors.text.accent}>
                {`${t("today.readMore")} ›`}
              </AppText>
            </ChunkyCard>
          )}
          <SectionLink
            label={t("today.skyLink")}
            icon="planet"
            tone="sky"
            accessibilityHint={t("today.skyLinkHint")}
            onPress={() => router.push("/sky-today" as Href)}
          />
        </EnterView>
      </ScrollView>

      {/* The sky check-in, answered right here; it closes itself after Aster's reply. */}
      <SpringBottomSheet visible={sheet === "checkin"} onClose={closeSheet} title={t("today.skyCheckInTitle")}>
        {sheet === "checkin" && !resting ? (
          <SkyCheckInCard onCheckedIn={reloadPlan} onClosed={closeSheet} />
        ) : null}
      </SpringBottomSheet>

      <JourneySheet
        visible={discoveryOpen}
        onClose={() => setDiscoveryOpen(false)}
        discovery={mascot?.journey?.discovery ?? null}
        constellationKey={mascot?.journey?.constellationKey ?? null}
        onSeeInChart={(link) => router.push(link as Href)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  flex: { flex: 1, minWidth: 0 },
  statBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  atRisk: {
    borderRadius: radii.pill,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: palette.candy.face,
  },
  readingWrap: { gap: spacing.md },
  reading: { gap: spacing.sm },
  readingLoading: { minHeight: 160, alignItems: "center", justifyContent: "center" },
  readingTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chip: {
    backgroundColor: palette.star.soft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
