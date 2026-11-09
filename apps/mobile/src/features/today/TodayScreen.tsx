import { runAfterInteractions } from "../../lib/afterInteractions";
import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { StyleSheet, View, ScrollView } from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { PressableScale } from "../../components/ui/PressableScale";
import { StarDivider } from "../../components/ui/StarDivider";
import {
  MoonPhase,
  moonIllumination,
  moonPhaseKey,
} from "../../components/MoonPhase";
import { EnterView } from "../../lib/motion";
import { ShareButton } from "../../components/ui/ShareButton";
import { ShareCardModal } from "../share/ShareCardModal";
import { ShareCardData } from "../share/ShareableCard";
import { TransitsContent } from "../transits/TransitsScreen";
import { astrologyApi } from "../../services/astrologyApi";
import { DailyInsight } from "../../services/types";
import { prefetchForecast } from "../../services/interpretationCache";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { energyLabel } from "../../lib/astroLanguage";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, palette } from "../../lib/design-system";
import { StatPill, StatRow } from "../../components/ui/StatPill";
import { useMascot } from "../aster/useMascot";
import { AsterHero } from "./AsterHero";
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
 * Today — Aster's home screen. Top to bottom: streak / Yıldız Tozu / Moon,
 * Aster with a speech bubble (the day's sky in one line once hatched),
 * today's quests, the day's guidance, then what the sky is doing against
 * your chart. Aster and the quests render immediately; only the guidance
 * card waits for the reading.
 */
export function TodayScreen() {
  const { t, locale } = useTranslation();
  const dto = useBirthDto();
  const displayName = useAppStore((s) => s.displayName);
  const setUnlockedFeatures = useAppStore((s) => s.setUnlockedFeatures);

  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [shareData, setShareData] = useState<ShareCardData | null>(null);
  const [bestStreak, setBestStreak] = useState(0);
  const { state: mascot, refresh: refreshMascot } = useMascot();

  // Longest live intention streak for the flame counter.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      astrologyApi
        .listIntentions()
        .then((list) => {
          if (active) setBestStreak(list.reduce((m, i) => Math.max(m, i.streak.currentStreak), 0));
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

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
        // Reading the sky ticks a quest server-side — pull the new state.
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

  const now = new Date();
  const dateLabel = now.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const phase = moonIllumination(now);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.statBar}>
          <StatRow>
            <StatPill
              icon="flame"
              tone="candy"
              value={bestStreak}
              muted={bestStreak === 0}
              accessibilityLabel={t("aster.streak", { n: bestStreak })}
            />
            <StatPill
              icon="sparkles"
              tone="star"
              value={mascot?.stardust ?? 0}
              accessibilityLabel={`${mascot?.stardust ?? 0} ${t("aster.stardust")}`}
            />
            <StatPill
              icon="shield-checkmark"
              tone="primary"
              value={mascot?.shields ?? 0}
              muted={(mascot?.shields ?? 0) === 0}
              accessibilityLabel={`${mascot?.shields ?? 0} ${t("aster.shields")}`}
            />
          </StatRow>
          <View style={styles.moonWrap} accessible accessibilityLabel={t(`moonPhase.${moonPhaseKey(phase)}`)}>
            <MoonPhase size={26} date={now} />
          </View>
        </EnterView>

        <EnterView index={1} style={styles.headerText}>
          <AppText variant="title">{t(greetingKey(), { name: displayName })}</AppText>
          <AppText variant="label" style={styles.date}>
            {dateLabel} · {t(`moonPhase.${moonPhaseKey(phase)}`)}
          </AppText>
        </EnterView>

        {/* 1 — Aster, speaking the day's sky in one line. */}
        <EnterView index={2}>
          <AsterHero state={mascot} whisper={insight?.title ?? null} />
        </EnterView>

        {/* 2 — Today's quests. */}
        <EnterView index={3}>
          <TodayQuests state={mascot} />
        </EnterView>

        {/* 3 — The day's guidance. */}
        {failed && !insight ? (
          <ChunkyCard depth="lg" style={[styles.hero, styles.heroLoading]}>
            <AppText variant="body" center>
              {t("today.insightError")}
            </AppText>
            <PressableScale onPress={() => setAttempt((n) => n + 1)} hitSlop={10}>
              <AppText variant="heading" color={colors.star[300]}>
                {t("common.retry")}
              </AppText>
            </PressableScale>
          </ChunkyCard>
        ) : loading || !insight ? (
          <ChunkyCard depth="lg" style={[styles.hero, styles.heroLoading]}>
            <CelestialLoader label={t("common.loading")} />
          </ChunkyCard>
        ) : (
          <EnterView scale>
            <ChunkyCard depth="lg" style={styles.hero}>
              <View style={styles.heroTop}>
                <AppText
                  variant="label"
                  color={colors.text.accent}
                  numberOfLines={1}
                  style={styles.heroEyebrow}
                >
                  {t("today.guidanceEyebrow")}
                </AppText>
                <View style={styles.heroActions}>
                  <View style={styles.chip}>
                    <AppText variant="label" color={colors.star[300]} numberOfLines={1}>
                      {energyLabel(t, insight.energyState)}
                    </AppText>
                  </View>
                  <ShareButton
                    onPress={() => setShareData({ variant: "daily", insight, date: new Date() })}
                  />
                </View>
              </View>
              <AppText variant="title" style={styles.heroTitle}>
                {insight.title}
              </AppText>
              <EnterView delay={250} from="none">
                <AppText variant="lead">{insight.summary}</AppText>
              </EnterView>
            </ChunkyCard>
          </EnterView>
        )}

        <StarDivider />

        {/* 4 — What's happening in the sky today (wheel + explanation + planets). */}
        <TransitsContent title={t("today.skyTitle")} enterIndex={4} />
      </ScrollView>

      <ShareCardModal
        visible={shareData !== null}
        onClose={() => setShareData(null)}
        data={shareData}
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
  statBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  date: {
    marginTop: spacing.xs,
  },
  moonWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 44,
  },
  hero: {
    gap: spacing.md,
    minHeight: 180,
  },
  heroLoading: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroEyebrow: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  chip: {
    backgroundColor: palette.star.soft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroTitle: {
    marginTop: spacing.xs,
  },
});
