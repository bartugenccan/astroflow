import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { MotiView } from "moti";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { BigThree } from "../../components/BigThree";
import { MoonPhase, moonIllumination, moonPhaseName } from "../../components/MoonPhase";
import { TransitRow } from "./TransitRow";
import { astrologyApi } from "../../services/astrologyApi";
import { DailyInsight, TransitData } from "../../services/types";
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
  const dto = useBirthDto();
  const displayName = useAppStore((s) => s.displayName);
  const profile = useAppStore((s) => s.birthProfile);

  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [transits, setTransits] = useState<TransitData | null>(null);
  const [loading, setLoading] = useState(true);

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

        {/* Hero insight */}
        {loading || !insight ? (
          <SkeletonCard />
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
                <View style={styles.chip}>
                  <AppText variant="label" color={colors.gold[300]}>
                    {insight.energyState}
                  </AppText>
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
      </ScrollView>
    </ScreenWrapper>
  );
}

function SkeletonCard() {
  return (
    <HairlineCard style={styles.hero}>
      {[0, 1, 2].map((i) => (
        <MotiView
          key={i}
          from={{ opacity: 0.08 }}
          animate={{ opacity: 0.18 }}
          transition={{ loop: true, type: "timing", duration: 900 }}
          style={[styles.skeletonLine, { width: `${90 - i * 18}%` }]}
        />
      ))}
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
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.gold[300],
    marginBottom: spacing.md,
  },
});
