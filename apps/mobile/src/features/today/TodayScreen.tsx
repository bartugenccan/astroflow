import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, Pressable, InteractionManager } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { BigThree } from "../../components/BigThree";
import { MoonPhase, moonIllumination, moonPhaseName } from "../../components/MoonPhase";
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
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

function greetingKey(): "today.greetingMorning" | "today.greetingAfternoon" | "today.greetingEvening" {
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
  const [shareData, setShareData] = useState<ShareCardData | null>(null);
  const [guidanceTopic, setGuidanceTopic] = useState<GuidanceTopic | null>(null);

  useEffect(() => {
    if (!dto) return;
    let active = true;
    setLoading(true);
    Promise.all([
      astrologyApi.getDailyInsight(dto, locale),
      astrologyApi.getTransits(dto),
    ]).then(([ins, tr]) => {
      if (!active) return;
      setInsight(ins);
      setTransits(tr);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [dto, locale]);

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
  const dateLabel = now.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const phase = moonIllumination(now);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
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
            <AppText variant="bodySmall" style={styles.moonLabel}>
              {moonPhaseName(phase)}
            </AppText>
          </View>
        </View>

        {/* Companion — question-first entry (Bets 1+2) */}
        <CompanionPrompt onSelectTopic={setGuidanceTopic} />

        {/* Hero insight */}
        {loading || !insight ? (
          <SkeletonCard label={t("common.loading")} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 120 }}
          >
            <HairlineCard elevated style={styles.hero}>
              <View style={styles.heroTop}>
                <AppText variant="label" color={colors.text.gold}>
                  {t("today.guidanceEyebrow")}
                </AppText>
                <View style={styles.heroActions}>
                  <View style={styles.chip}>
                    <AppText variant="label" color={colors.gold[300]}>
                      {insight.energyState}
                    </AppText>
                  </View>
                  <ShareButton
                    onPress={() =>
                      setShareData({ variant: "daily", insight, date: new Date() })
                    }
                  />
                </View>
              </View>
              <AppText variant="title" style={styles.heroTitle}>
                {insight.title}
              </AppText>
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: "timing", duration: 700, delay: 250 }}
              >
                <AppText variant="serifBody">{insight.summary}</AppText>
              </MotiView>
            </HairlineCard>
          </MotiView>
        )}

        {/* Big Three */}
        {profile ? (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 400, delay: 150 }}
            style={styles.bigThree}
          >
            <View style={styles.bigThreeHeader}>
              <ShareButton
                onPress={() =>
                  setShareData({
                    variant: "bigThree",
                    sunSign: profile.sunSign,
                    moonSign: profile.moonSign,
                    risingSign: profile.risingSign,
                    name: displayName,
                  })
                }
              />
            </View>
            <BigThree
              sunSign={profile.sunSign}
              moonSign={profile.moonSign}
              risingSign={profile.risingSign}
            />
          </MotiView>
        ) : null}

        {/* The sky right now */}
        <View style={styles.sky}>
          <SectionHeader eyebrow={t("today.skyNowTitle")} />
          <HairlineCard style={styles.skyCard}>
            {transits && transits.transits.length > 0 ? (
              transits.transits.slice(0, 3).map((tr, i) => (
                <MotiView
                  key={`${tr.transitPlanet}-${tr.natalPlanet}-${i}`}
                  from={{ opacity: 0, translateX: 12 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: "timing", duration: 320, delay: i * 90 }}
                >
                  <TransitRow transit={tr} />
                  {i < 2 ? <View style={styles.separator} /> : null}
                </MotiView>
              ))
            ) : (
              <AppText variant="body">{t("today.noTransits")}</AppText>
            )}
          </HairlineCard>
        </View>

        {/* Entry points: intentions + forecast + compatibility */}
        <View style={styles.entries}>
          <Pressable onPress={() => router.push("/intentions" as Href)}>
            <HairlineCard style={styles.entryCard}>
              <View style={styles.entryIcon}>
                <Ionicons name="flame-outline" size={20} color={colors.gold[300]} />
              </View>
              <View style={styles.entryText}>
                <AppText variant="heading">{t("intentions.title")}</AppText>
                <AppText variant="bodySmall">{t("intentions.eyebrow")}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </HairlineCard>
          </Pressable>

          <Pressable onPress={() => router.navigate("/(tabs)/forecast")}>
            <HairlineCard style={styles.entryCard}>
              <View style={styles.entryIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.gold[300]} />
              </View>
              <View style={styles.entryText}>
                <AppText variant="heading">{t("today.forecastCta")}</AppText>
                <AppText variant="bodySmall">{t("forecast.bestDaysTitle")}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </HairlineCard>
          </Pressable>

          <Pressable onPress={() => router.push("/compatibility" as Href)}>
            <HairlineCard style={styles.entryCard}>
              <View style={styles.entryIcon}>
                <Ionicons name="heart-outline" size={20} color={colors.gold[300]} />
              </View>
              <View style={styles.entryText}>
                <AppText variant="heading">{t("today.compatibilityCardTitle")}</AppText>
                <AppText variant="bodySmall">{t("today.compatibilityCardSub")}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </HairlineCard>
          </Pressable>
        </View>
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
  },
  moonLabel: {
    fontSize: 10,
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
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bigThreeHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.sm,
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
  bigThree: {
    marginTop: -spacing.sm,
  },
  sky: {
    gap: spacing.md,
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
    gap: 2,
  },
});
