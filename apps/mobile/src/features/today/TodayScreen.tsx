import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, InteractionManager } from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
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
import { colors, spacing, radii } from "../../lib/design-system";

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
 * Today — only what's about today: what the sky is doing right now against
 * your chart (the transit wheel, its explanation, the moving planets), then
 * the day's guidance. Asking, affirmations and matching live in For You;
 * forecasts and the Solar Return live in Future.
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
  }, [dto, locale, attempt]);

  // Warm the Future tab's forecast + hydrate device entitlements after first paint.
  useEffect(() => {
    if (!dto) return;
    const task = InteractionManager.runAfterInteractions(() => {
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
        <EnterView style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="title">{t(greetingKey(), { name: displayName })}</AppText>
            <AppText variant="label" style={styles.date}>
              {dateLabel}
            </AppText>
          </View>
          <View style={styles.moonWrap}>
            <MoonPhase size={30} date={now} />
            <AppText variant="bodySmall" center numberOfLines={2} style={styles.moonLabel}>
              {t(`moonPhase.${moonPhaseKey(phase)}`)}
            </AppText>
          </View>
        </EnterView>

        {/* 1 — What's happening in the sky today (wheel + explanation + planets). */}
        <TransitsContent title={t("today.skyTitle")} enterIndex={1} />

        <StarDivider />

        {/* 2 — The day's guidance. */}
        {failed && !insight ? (
          <HairlineCard elevated style={[styles.hero, styles.heroLoading]}>
            <AppText variant="body" center>
              {t("today.insightError")}
            </AppText>
            <PressableScale onPress={() => setAttempt((n) => n + 1)} hitSlop={10}>
              <AppText variant="heading" color={colors.gold[300]}>
                {t("common.retry")}
              </AppText>
            </PressableScale>
          </HairlineCard>
        ) : loading || !insight ? (
          <HairlineCard elevated style={[styles.hero, styles.heroLoading]}>
            <CelestialLoader label={t("common.loading")} />
          </HairlineCard>
        ) : (
          <EnterView scale>
            <HairlineCard elevated style={styles.hero}>
              <View style={styles.heroTop}>
                <AppText
                  variant="label"
                  color={colors.text.gold}
                  numberOfLines={1}
                  style={styles.heroEyebrow}
                >
                  {t("today.guidanceEyebrow")}
                </AppText>
                <View style={styles.heroActions}>
                  <View style={styles.chip}>
                    <AppText variant="label" color={colors.gold[300]} numberOfLines={1}>
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
                <AppText variant="serifBody">{insight.summary}</AppText>
              </EnterView>
            </HairlineCard>
          </EnterView>
        )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    gap: spacing.xs,
    marginLeft: spacing.md,
    maxWidth: 84,
    flexShrink: 0,
  },
  moonLabel: {
    fontSize: 10,
    lineHeight: 13,
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
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroTitle: {
    marginTop: spacing.xs,
  },
});
