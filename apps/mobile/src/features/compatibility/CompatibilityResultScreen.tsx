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
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StateView } from "../../components/ui/StateView";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { IconButton } from "../../components/ui/IconButton";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { BackButton } from "../../components/ui/BackButton";
import { CountUp } from "../../components/ui/CountUp";
import { TermInfo } from "../../components/TermInfo";
import { ScoreRing } from "../../components/ScoreRing";
import { PaywallSheet } from "../../components/PaywallSheet";
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
import { colors, spacing, radii, motion, palette, surface } from "../../lib/design-system";

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
          <IconButton
            icon="share-outline"
            size={40}
            accessibilityLabel={t("share.cta")}
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
          <View style={styles.topSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Newcomer framing: what this screen actually compares. */}
        <EnterView style={styles.intro}>
          <View style={styles.eyebrowRow}>
            <AppText variant="label" color={colors.text.accent} style={styles.eyebrowText}>
              {t("compatibility.synastryEyebrow")}
            </AppText>
            <TermInfo term="synastry" size={15} />
          </View>
          <AppText variant="bodySmall" color={colors.text.secondary}>
            {t("compatibility.synastryExplainer")}
          </AppText>
        </EnterView>

        {!score.data ? (
          score.error ? (
            <StateView
              kind="error"
              message={t("profileUi.compat.resultError")}
              onAction={score.reload}
            />
          ) : people.error && !people.data ? (
            <StateView
              kind="error"
              message={t("profileUi.compat.loadError")}
              onAction={people.reload}
            />
          ) : people.data && !person ? (
            <StateView
              kind="empty"
              message={t("profileUi.compat.personMissing")}
              actionLabel={t("compatibility.addPerson")}
              onAction={() => router.replace("/compatibility/add")}
            />
          ) : (
            <StateView kind="loading" message={t("compatibility.computing")} />
          )
        ) : (
          <>
            <EnterView index={1} scale style={styles.ringWrap}>
              <ScoreRing score={score.data.overall} label={t("compatibility.overall")} delay={150} />
            </EnterView>

            {/* Dimension bars — the same 7 for every couple */}
            <EnterView index={2}>
              <ChunkyCard style={styles.catCard}>
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
              </ChunkyCard>
            </EnterView>

            {/* Top aspects */}
            <View style={styles.section}>
              <EnterView index={3}>
                <View style={styles.eyebrowRow}>
                  <AppText variant="label" color={colors.text.accent} style={styles.eyebrowText}>
                    {t("compatibility.topAspectsTitle")}
                  </AppText>
                  <TermInfo term="aspect" size={14} />
                </View>
                <AppText variant="bodySmall" style={styles.tapHint}>
                  {t("synastry.tapToExplain")}
                </AppText>
              </EnterView>
              <ChunkyCard>
                {score.data.topAspects.map((a, i) => (
                  <EnterView key={`${a.planetA}-${a.planetB}-${i}`} index={i} delay={300}>
                    <SynastryAspectRow
                      aspect={a}
                      otherName={person?.label ?? "—"}
                      delay={400 + Math.min(i, 8) * motion.stagger}
                    />
                    {i < score.data!.topAspects.length - 1 ? (
                      <View style={styles.sep} />
                    ) : null}
                  </EnterView>
                ))}
              </ChunkyCard>
            </View>

            {/* View this person's charts (premium after 2 free) */}
            <EnterView index={4} style={styles.chartsRow}>
              <ChunkyButton
                label={t("compatibility.viewNatal")}
                variant="night"
                size="md"
                uppercase={false}
                haptic="light"
                style={styles.chartBtn}
                icon={<Ionicons name="planet-outline" size={18} color={colors.star[300]} />}
                onPress={() => router.push(`/compatibility/${encodeURIComponent(String(id))}/chart` as Href)}
              />
              <ChunkyButton
                label={t("compatibility.viewTransits")}
                variant="night"
                size="md"
                uppercase={false}
                haptic="light"
                style={styles.chartBtn}
                icon={<Ionicons name="telescope-outline" size={18} color={colors.star[300]} />}
                onPress={() => router.push(`/compatibility/${encodeURIComponent(String(id))}/transits` as Href)}
              />
            </EnterView>

            {/* Reading — gated */}
            <EnterView index={5} style={styles.section}>
              <SectionHeader eyebrow={t("compatibility.readingTitle")} />
              {locked ? (
                <ChunkyCard tone="star" tinted>
                  <View style={styles.lockedBox}>
                    <AsterCameo text={t("compatibility.lockedAspects")} size={56} />
                    <ChunkyButton
                      label={t("paywall.unlock")}
                      variant="star"
                      onPress={() => setPaywall(true)}
                      icon={<Ionicons name="lock-open" size={18} color={palette.star.on} />}
                    />
                  </View>
                </ChunkyCard>
              ) : reading.data ? (
                <ChunkyCard>
                  <AppText variant="lead">{reading.data.text}</AppText>
                </ChunkyCard>
              ) : reading.error && !reading.loading ? (
                <ChunkyCard>
                  <StateView kind="error" compact onAction={reading.reload} />
                </ChunkyCard>
              ) : (
                <ChunkyCard>
                  <StateView kind="loading" compact />
                </ChunkyCard>
              )}
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
        ? colors.star[400]
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
            <AppText variant="labelLong" color={colors.text.tertiary}>
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
  tapHint: {
    marginTop: spacing.xs,
  },
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
  topSpacer: {
    width: 40,
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
  barTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: surface.raised,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.star[400],
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
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
  lockedBox: {
    gap: spacing.lg,
  },
});
