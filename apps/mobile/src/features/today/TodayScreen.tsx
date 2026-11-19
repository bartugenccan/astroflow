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
import { SpringBottomSheet, type SheetOrigin } from "../../components/ui/SpringBottomSheet";
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
import { asterLine } from "../aster/asterCopy";
import { AsterHero } from "./AsterHero";
import { SkyCheckInCard } from "./SkyCheckInCard";
import { TodayQuests } from "./TodayQuests";
import { AsterPointsSheet } from "../aster/AsterPointsSheet";
import { PressableScale } from "../../components/ui/PressableScale";
import { Ionicons } from "@expo/vector-icons";
import { MomentSheet, SkyMomentCard } from "./SkyMomentCard";
import { visibleMoments } from "./momentCopy";
import { useSkyMomentsStore } from "../../store/useSkyMomentsStore";
import { safeInAppLink } from "../../lib/safeLink";

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
  const moments = useSkyMomentsStore((s) => s.data);
  const loadMoments = useSkyMomentsStore((s) => s.load);

  const reloadPlan = useCallback(() => {
    if (dto) refreshPlan(dto);
  }, [dto, refreshPlan]);

  // Key sky moments change day to day: the store fetches once per local day,
  // after first paint so it never competes with the plan and the reading.
  useEffect(() => {
    if (!dto) return;
    const task = runAfterInteractions(() => {
      loadMoments(dto);
    });
    return () => task.cancel();
  }, [dto, loadMoments]);

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
  const [pointsOpen, setPointsOpen] = useState(false);
  const closeSheet = useCallback(() => setSheet(null), []);
  /** The key-moment sheet: which moment, and the card's rect it grows out of. */
  const [moment, setMoment] = useState<{ id: string; origin: SheetOrigin | null } | null>(null);
  const openMoment = useCallback((id: string, origin: SheetOrigin | null) => setMoment({ id, origin }), []);
  const selectMoment = useCallback((id: string) => setMoment((m) => (m ? { ...m, id } : m)), []);
  const closeMoment = useCallback(() => setMoment(null), []);

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

  const longing = mascot?.longing?.level ?? "content";
  // Back after a few days: Aster's "I missed you" replaces the plain greeting.
  const missedYou = longing !== "content" && !!mascot?.hatched && !resting;
  const hello = t(greetingKey(), { name: displayName });
  const speech = missedYou
    ? [asterLine(locale, mascot?.mood ?? "happy", true, 0, longing), insight?.title].filter(Boolean).join(" ")
    : insight
      ? `${hello}! ${insight.title}`
      : hello;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.statBar}>
          <PressableScale
            onPress={() => setPointsOpen(true)}
            scaleTo={0.97}
            haptic="none"
            accessibilityRole="button"
            accessibilityLabel={t("aster.points.openA11y")}
          >
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
          </PressableScale>
          {/* F14: what the counters mean, one tap away. */}
          <PressableScale
            onPress={() => setPointsOpen(true)}
            style={styles.pointsHelp}
            accessibilityRole="button"
            accessibilityLabel={t("aster.points.openA11y")}
          >
            <Ionicons name="help-circle-outline" size={18} color={colors.text.tertiary} />
            <AppText variant="labelLong" color={colors.text.tertiary}>
              {t("aster.points.open")}
            </AppText>
          </PressableScale>
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

        {/* 3 — A key moment in the user's own sky (returns, stations, eclipses…), when there is one. */}
        {moments && visibleMoments(moments.moments).length ? (
          <EnterView index={3}>
            <SkyMomentCard moments={moments.moments} open={moment !== null} onOpen={openMoment} />
          </EnterView>
        ) : null}

        {/* 4 — The day's reading, short; the whole of it and the sky are a tap away. */}
        <EnterView index={4} style={styles.readingWrap}>
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

      {/* The key-moment sheet grows out of its card (screen-level, so it covers the screen). */}
      {moments ? (
        <MomentSheet
          moments={moments.moments}
          openId={moment?.id ?? null}
          origin={moment?.origin}
          onSelect={selectMoment}
          onClose={closeMoment}
        />
      ) : null}

      <AsterPointsSheet visible={pointsOpen} onClose={() => setPointsOpen(false)} state={mascot} />

      <JourneySheet
        visible={discoveryOpen}
        onClose={() => setDiscoveryOpen(false)}
        discovery={mascot?.journey?.discovery ?? null}
        constellationKey={mascot?.journey?.constellationKey ?? null}
        onSeeInChart={(link) => {
          const href = safeInAppLink(link);
          if (href) router.push(href);
        }}
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
    gap: spacing.md,
  },
  pointsHelp: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
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
