import { runAfterInteractions, runAfterTransition } from "../../lib/afterInteractions";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { AppState, StyleSheet, View, ScrollView, type ScrollViewInstance } from "react-native";
import { useTourTarget } from "../tour/tourTargets";
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
import { dailyInsightKey, prefetchForecast } from "../../services/interpretationCache";
import { useCachedAsync } from "../../hooks/useCachedAsync";
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
  // The app tour points at Aster and today's goals (and scrolls to them).
  const scrollRef = useRef<ScrollViewInstance>(null);
  const asterTarget = useTourTarget("today.aster", { scrollRef });
  const questsTarget = useTourTarget("today.quests", { scrollRef });
  const displayName = useAppStore((s) => s.displayName);
  const setUnlockedFeatures = useAppStore((s) => s.setUnlockedFeatures);

  // The day's reading, shared with /sky-today (one request) and kept on disk,
  // so reopening the app the same day shows it at once while it refreshes.
  const {
    data: insight,
    loading,
    error: insightError,
    reload: reloadInsight,
  } = useCachedAsync<DailyInsight>(dto ? dailyInsightKey(dto, locale) : null, () =>
    astrologyApi.getDailyInsight(dto!, locale),
  );
  const failed = !!insightError;
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

  // Key sky moments change day to day: the store fetches once per local day
  // (a no-op otherwise), after first paint so it never competes with the plan
  // and the reading. Checked on every focus and whenever the app comes back to
  // the foreground, so a session that crosses midnight picks up the new day.
  useFocusEffect(
    useCallback(() => {
      if (!dto) return;
      const task = runAfterInteractions(() => {
        loadMoments(dto);
      });
      const sub = AppState.addEventListener("change", (next) => {
        if (next === "active") loadMoments(dto);
      });
      return () => {
        task.cancel();
        sub.remove();
      };
    }, [dto, loadMoments]),
  );

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

  // Reading the sky ticks a plan anchor server-side — pull the new state once
  // the day's reading has arrived.
  useEffect(() => {
    if (insight) refreshMascot();
  }, [insight, refreshMascot]);

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
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
        <View {...asterTarget}>
          <EnterView index={1}>
            <AsterHero state={mascot} onOpenDiscovery={() => setDiscoveryOpen(true)} speech={speech} />
          </EnterView>
        </View>

        {/* 2 — Today's goals: the plan's next steps as tick rows. */}
        <View {...questsTarget}>
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
        </View>

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
                onAction={reloadInsight}
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
