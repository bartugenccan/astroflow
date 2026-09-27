import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { GoldButton } from "../../components/ui/GoldButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { BackButton } from "../../components/ui/BackButton";
import { CountUp } from "../../components/ui/CountUp";
import { TermInfo } from "../../components/TermInfo";
import { ScoreRing } from "../../components/ScoreRing";
import { PaywallSheet } from "../../components/PaywallSheet";
import { ShareButton } from "../../components/ui/ShareButton";
import { ShareCardModal } from "../share/ShareCardModal";
import { ShareCardData } from "../share/ShareableCard";
import { SynastryAspectRow } from "./SynastryAspectRow";
import { astrologyApi } from "../../services/astrologyApi";
import { CompatibilityScore, CreateBirthProfileDto } from "../../services/types";
import {
  compatibilityKey,
  compatibilityReadingKey,
} from "../../services/interpretationCache";
import { useAsync } from "../../hooks/useAsync";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation, TranslationKey } from "../../i18n";
import { EnterView } from "../../lib/motion";
import { colors, spacing, radii, motion } from "../../lib/design-system";

/** Delay before the first dimension bar starts filling (lets the ring sweep first). */
const BARS_START = 450;
/** Gap between consecutive bars starting. */
const BAR_STEP = 110;

export function CompatibilityResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const self = useBirthDto();
  const displayName = useAppStore((s) => s.displayName);

  const people = useAsync(() => astrologyApi.listPeople(), []);
  const person = useMemo(
    () => people.data?.find((p) => p.id === id) ?? null,
    [people.data, id],
  );

  const other: CreateBirthProfileDto | null = person
    ? {
        birthDate: person.birthDate,
        birthTime: person.unknownTime ? "12:00" : person.birthTime,
        latitude: person.latitude,
        longitude: person.longitude,
      }
    : null;

  const ready = self && other;
  const score = useCachedAsync<CompatibilityScore>(
    ready ? compatibilityKey(self!, other!) : null,
    () => astrologyApi.getCompatibility(self!, other!),
  );

  const locked = score.data?.locked ?? true;
  const { locale } = useTranslation();
  const reading = useCachedAsync(
    ready && !locked ? compatibilityReadingKey(self!, other!, locale) : null,
    () => astrologyApi.getCompatibilityReading(self!, other!, locale),
  );

  const [paywall, setPaywall] = useState(false);
  const [shareData, setShareData] = useState<ShareCardData | null>(null);

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
        <AppText variant="heading" numberOfLines={1} style={styles.topTitle}>
          {person ? t("compatibility.withLabel", { name: person.label }) : t("compatibility.title")}
        </AppText>
        {score.data ? (
          <ShareButton
            onPress={() =>
              setShareData({
                variant: "compatibility",
                name: displayName,
                otherName: person?.label ?? "",
                score: score.data!.overall,
                headline: reading.data?.headline ?? "",
              })
            }
          />
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Newcomer framing: what this screen actually compares. */}
        <EnterView style={styles.intro}>
          <View style={styles.eyebrowRow}>
            <AppText variant="label" color={colors.text.gold} style={styles.eyebrowText}>
              {t("compatibility.synastryEyebrow")}
            </AppText>
            <TermInfo term="synastry" size={15} />
          </View>
          <AppText variant="bodySmall" color={colors.text.secondary}>
            {t("compatibility.synastryExplainer")}
          </AppText>
        </EnterView>

        {score.loading || !score.data ? (
          <View style={styles.loaderBox}>
            <CelestialLoader label={t("compatibility.computing")} />
          </View>
        ) : (
          <>
            <EnterView index={1} scale style={styles.ringWrap}>
              <ScoreRing score={score.data.overall} label={t("compatibility.overall")} delay={150} />
            </EnterView>

            {/* Dimension bars — the same 7 for every couple */}
            <EnterView index={2}>
              <HairlineCard style={styles.catCard}>
                {score.data.dimensions.map((d, i) => (
                  <CategoryBar
                    key={d.key}
                    index={i}
                    label={t(`compatibility.dimensions.${d.key}` as TranslationKey)}
                    hint={t(`compatibility.hints.${d.key}` as TranslationKey)}
                    value={d.value}
                    lowerIsBetter={d.lowerIsBetter}
                    lowerBetterLabel={t("compatibility.lowerBetter")}
                  />
                ))}
              </HairlineCard>
            </EnterView>

            {/* Top aspects */}
            <View style={styles.section}>
              <EnterView index={3}>
                <View style={styles.eyebrowRow}>
                  <AppText variant="label" color={colors.text.gold} style={styles.eyebrowText}>
                    {t("compatibility.topAspectsTitle")}
                  </AppText>
                  <TermInfo term="aspect" size={14} />
                </View>
              </EnterView>
              <HairlineCard>
                {score.data.topAspects.map((a, i) => (
                  <EnterView key={`${a.planetA}-${a.planetB}-${i}`} index={i} delay={300}>
                    <SynastryAspectRow aspect={a} delay={400 + Math.min(i, 8) * motion.stagger} />
                    {i < score.data!.topAspects.length - 1 ? (
                      <View style={styles.sep} />
                    ) : null}
                  </EnterView>
                ))}
              </HairlineCard>
            </View>

            {/* View this person's charts (premium after 2 free) */}
            <EnterView index={4} style={styles.chartsRow}>
              <PressableScale
                style={styles.chartBtn}
                scaleTo={0.96}
                accessibilityRole="button"
                onPress={() => router.push(`/compatibility/${String(id)}/chart` as Href)}
              >
                <Ionicons name="planet-outline" size={18} color={colors.gold[300]} />
                <AppText
                  variant="bodySmall"
                  color={colors.text.primary}
                  numberOfLines={2}
                  style={styles.chartBtnText}
                >
                  {t("compatibility.viewNatal")}
                </AppText>
              </PressableScale>
              <PressableScale
                style={styles.chartBtn}
                scaleTo={0.96}
                accessibilityRole="button"
                onPress={() => router.push(`/compatibility/${String(id)}/transits` as Href)}
              >
                <Ionicons name="telescope-outline" size={18} color={colors.gold[300]} />
                <AppText
                  variant="bodySmall"
                  color={colors.text.primary}
                  numberOfLines={2}
                  style={styles.chartBtnText}
                >
                  {t("compatibility.viewTransits")}
                </AppText>
              </PressableScale>
            </EnterView>

            {/* Reading — gated */}
            <EnterView index={5} style={styles.section}>
              <SectionHeader eyebrow={t("compatibility.readingTitle")} />
              {locked ? (
                <HairlineCard>
                  <View style={styles.lockedBox}>
                    <Ionicons name="lock-closed" size={20} color={colors.gold[300]} />
                    <AppText variant="body" center>
                      {t("compatibility.lockedAspects")}
                    </AppText>
                    <GoldButton label={t("paywall.unlock")} onPress={() => setPaywall(true)} />
                  </View>
                </HairlineCard>
              ) : reading.loading ? (
                <HairlineCard>
                  <View style={styles.loaderBox}>
                    <CelestialLoader size="sm" />
                  </View>
                </HairlineCard>
              ) : reading.data ? (
                <HairlineCard>
                  <AppText variant="serifBody">{reading.data.text}</AppText>
                </HairlineCard>
              ) : null}
            </EnterView>
          </>
        )}
      </ScrollView>

      <PaywallSheet
        visible={paywall}
        onClose={() => setPaywall(false)}
        variant="compat"
        onUnlocked={() => {
          score.reload();
          reading.reload();
        }}
      />
      <ShareCardModal
        visible={shareData !== null}
        onClose={() => setShareData(null)}
        data={shareData}
      />
    </ScreenWrapper>
  );
}

function CategoryBar({
  index,
  label,
  hint,
  value,
  lowerIsBetter,
  lowerBetterLabel,
}: {
  index: number;
  label: string;
  hint: string;
  value: number;
  lowerIsBetter: boolean;
  lowerBetterLabel: string;
}) {
  const reduced = useReducedMotion();
  // "Goodness" drives the colour: for lower-is-better dims a low value is good.
  const goodness = lowerIsBetter ? 100 - value : value;
  const fillColor =
    goodness >= 66
      ? colors.semantic.harmonic
      : goodness >= 40
        ? colors.gold[400]
        : colors.semantic.challenging;

  const target = Math.max(4, Math.min(100, value));
  const delay = reduced ? 0 : BARS_START + index * BAR_STEP;
  const progress = useSharedValue(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = withTiming(target, { duration: motion.duration.fast });
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [target, delay, reduced, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={styles.dimRow}>
      <View style={styles.dimHeader}>
        <View style={styles.dimLabelWrap}>
          <AppText variant="bodySmall" color={colors.text.primary} style={styles.dimLabel}>
            {label}
          </AppText>
          {lowerIsBetter ? (
            <AppText variant="labelLong" color={colors.text.tertiary} style={styles.lowerTag}>
              ↓ {lowerBetterLabel}
            </AppText>
          ) : null}
        </View>
        <CountUp
          value={value}
          delay={delay}
          duration={900}
          variant="numeric"
          color={colors.text.secondary}
          style={styles.barValue}
        />
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: fillColor }, fillStyle]} />
      </View>
      <AppText variant="bodySmall" color={colors.text.tertiary}>
        {hint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  topTitle: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  intro: {
    gap: spacing.xs,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  eyebrowText: {
    flexShrink: 1,
  },
  loaderBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  ringWrap: {
    alignItems: "center",
  },
  catCard: {
    gap: spacing.lg,
  },
  dimRow: {
    gap: spacing.xs + 2,
  },
  dimHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  dimLabelWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: spacing.sm,
  },
  dimLabel: {
    flexShrink: 1,
  },
  lowerTag: {
    fontSize: 11,
  },
  barTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.ink[700],
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.gold[400],
  },
  barValue: {
    minWidth: 28,
    textAlign: "right",
  },
  section: {
    gap: spacing.md,
  },
  chartsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  chartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
  chartBtnText: {
    flexShrink: 1,
    textAlign: "center",
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
  lockedBox: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
});
