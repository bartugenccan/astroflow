import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, InteractionManager } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { PressableScale } from "../../components/ui/PressableScale";
import { TermInfo } from "../../components/TermInfo";
import {
  MoonPhase,
  moonIllumination,
  moonPhaseKey,
} from "../../components/MoonPhase";
import { YearCard } from "./YearCard";
import { EnterView } from "../../lib/motion";
import { TransitRow } from "./TransitRow";
import { ShareButton } from "../../components/ui/ShareButton";
import { ShareCardModal } from "../share/ShareCardModal";
import { ShareCardData } from "../share/ShareableCard";
import { CompanionPrompt } from "../companion/CompanionPrompt";
import { GuidanceSheet } from "../companion/GuidanceSheet";
import { GuidanceTopic } from "../../services/types";
import { astrologyApi } from "../../services/astrologyApi";
import { DailyInsight, TransitData } from "../../services/types";
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

export function TodayScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const dto = useBirthDto();
  const displayName = useAppStore((s) => s.displayName);
  const profile = useAppStore((s) => s.birthProfile);
  const setUnlockedFeatures = useAppStore((s) => s.setUnlockedFeatures);

  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [transits, setTransits] = useState<TransitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [shareData, setShareData] = useState<ShareCardData | null>(null);
  const [guidanceTopic, setGuidanceTopic] = useState<GuidanceTopic | null>(
    null,
  );

  useEffect(() => {
    if (!dto) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    // Loaded independently: the transits are pure math and shouldn't wait on
    // (or fail with) the AI-written insight. A failure must end the loading
    // state — before, a rejected promise left the hero spinning forever.
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
    astrologyApi
      .getTransits(dto)
      .then((tr) => {
        if (active) setTransits(tr);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [dto, locale, attempt]);

  // Warm the forecast cache + hydrate device entitlements after first paint.
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
  const dateLabel = now.toLocaleDateString(
    locale === "tr" ? "tr-TR" : "en-US",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    },
  );
  const phase = moonIllumination(now);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Order answers "what about today?" first, then the longer horizons,
            then the tools: guidance → your year → the sky → ask → practices. */}
        <EnterView style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="title">
              {t(greetingKey(), { name: displayName })}
            </AppText>
            <AppText variant="label" style={styles.date}>
              {dateLabel}
            </AppText>
          </View>
          <View style={styles.moonWrap}>
            <MoonPhase size={30} date={now} />
            <AppText
              variant="bodySmall"
              center
              numberOfLines={2}
              style={styles.moonLabel}
            >
              {t(`moonPhase.${moonPhaseKey(phase)}`)}
            </AppText>
          </View>
        </EnterView>

        {/* Hero insight */}
        {failed && !insight ? (
          <HairlineCard elevated style={[styles.hero, styles.heroLoading]}>
            <AppText variant="body" center>
              {t("today.insightError")}
            </AppText>
            <PressableScale
              onPress={() => setAttempt((n) => n + 1)}
              hitSlop={10}
            >
              <AppText variant="heading" color={colors.gold[300]}>
                {t("common.retry")}
              </AppText>
            </PressableScale>
          </HairlineCard>
        ) : loading || !insight ? (
          <SkeletonCard label={t("common.loading")} />
        ) : (
          <EnterView index={1} scale>
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
                    <AppText
                      variant="label"
                      color={colors.gold[300]}
                      numberOfLines={1}
                    >
                      {energyLabel(t, insight.energyState)}
                    </AppText>
                  </View>
                  <ShareButton
                    onPress={() =>
                      setShareData({
                        variant: "daily",
                        insight,
                        date: new Date(),
                      })
                    }
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

        {/* Your year — the permanent way into the birthday chart. */}
        {profile ? (
          <EnterView index={2}>
            <YearCard birthDate={profile.birthDate} />
          </EnterView>
        ) : null}

        {/* The sky right now — a taste; the full list lives under Ahead. */}
        <EnterView index={3} style={styles.sky}>
          <View style={styles.skyHead}>
            <View style={styles.skyTitle}>
              <SectionHeader eyebrow={t("today.skyNowTitle")} />
              <TermInfo term="transit" size={14} />
            </View>
            <PressableScale
              onPress={() => router.navigate("/(tabs)/ahead" as Href)}
              hitSlop={10}
              scaleTo={0.94}
              style={styles.seeAll}
            >
              <AppText variant="bodySmall" color={colors.gold[300]}>
                {t("today.seeAll")}
              </AppText>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.gold[300]}
              />
            </PressableScale>
          </View>
          <AppText variant="bodySmall">{t("today.skyNowHint")}</AppText>
          <HairlineCard style={styles.skyCard}>
            {transits && transits.transits.length > 0 ? (
              transits.transits.slice(0, 2).map((tr, i, arr) => (
                <EnterView
                  key={`${tr.transitPlanet}-${tr.natalPlanet}-${i}`}
                  index={i}
                  delay={300}
                >
                  <TransitRow transit={tr} />
                  {i < arr.length - 1 ? (
                    <View style={styles.separator} />
                  ) : null}
                </EnterView>
              ))
            ) : (
              <AppText variant="body" style={styles.quietSky}>
                {t("today.noTransits")}
              </AppText>
            )}
          </HairlineCard>
        </EnterView>

        {/* Ask — topic chips answer in a sheet, "Talk to Aster" opens the chat. */}
        <EnterView index={4}>
          <CompanionPrompt onSelectTopic={setGuidanceTopic} />
        </EnterView>

        {/* Practices and people */}
        <EnterView index={5} style={styles.entries}>
          <PressableScale
            scaleTo={0.98}
            onPress={() => router.push("/intentions" as Href)}
          >
            <HairlineCard style={styles.entryCard}>
              <View style={styles.entryIcon}>
                <Ionicons
                  name="flame-outline"
                  size={20}
                  color={colors.gold[300]}
                />
              </View>
              <View style={styles.entryText}>
                <AppText variant="heading">{t("intentions.title")}</AppText>
                <AppText variant="bodySmall">{t("intentions.eyebrow")}</AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text.tertiary}
              />
            </HairlineCard>
          </PressableScale>

          <PressableScale
            scaleTo={0.98}
            onPress={() =>
              router.navigate({
                pathname: "/(tabs)/ahead",
                params: { section: "season" },
              })
            }
          >
            <HairlineCard style={styles.entryCard}>
              <View style={styles.entryIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.gold[300]}
                />
              </View>
              <View style={styles.entryText}>
                <AppText variant="heading">{t("today.forecastCta")}</AppText>
                <AppText variant="bodySmall">
                  {t("forecast.bestDaysTitle")}
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text.tertiary}
              />
            </HairlineCard>
          </PressableScale>

          <PressableScale
            scaleTo={0.98}
            onPress={() => router.push("/compatibility" as Href)}
          >
            <HairlineCard style={styles.entryCard}>
              <View style={styles.entryIcon}>
                <Ionicons
                  name="heart-outline"
                  size={20}
                  color={colors.gold[300]}
                />
              </View>
              <View style={styles.entryText}>
                <AppText variant="heading">
                  {t("today.compatibilityCardTitle")}
                </AppText>
                <AppText variant="bodySmall">
                  {t("today.compatibilityCardSub")}
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text.tertiary}
              />
            </HairlineCard>
          </PressableScale>
        </EnterView>
      </ScrollView>

      <ShareCardModal
        visible={shareData !== null}
        onClose={() => setShareData(null)}
        data={shareData}
      />
      <GuidanceSheet
        topic={guidanceTopic}
        dto={dto}
        onClose={() => setGuidanceTopic(null)}
      />
    </ScreenWrapper>
  );
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <HairlineCard elevated style={[styles.hero, styles.heroLoading]}>
      <CelestialLoader label={label} />
    </HairlineCard>
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
  sky: {
    gap: spacing.sm,
  },
  skyHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skyTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: spacing.sm,
  },
  quietSky: {
    paddingVertical: spacing.md,
  },
  skyCard: {
    paddingVertical: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
  entries: {
    gap: spacing.md,
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
  entryText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
