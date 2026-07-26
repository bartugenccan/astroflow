import React, { useMemo, useState } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { GoldButton } from "../../components/ui/GoldButton";
import { ScoreRing } from "../../components/ScoreRing";
import { PaywallSheet } from "../../components/PaywallSheet";
import { ShareButton } from "../../components/ui/ShareButton";
import { ShareCardModal } from "../share/ShareCardModal";
import { ShareCardData } from "../share/ShareableCard";
import { SynastryAspectRow } from "./SynastryAspectRow";
import { astrologyApi } from "../../services/astrologyApi";
import {
  CompatibilityScore,
  CreateBirthProfileDto,
  SavedPerson,
} from "../../services/types";
import {
  compatibilityKey,
  compatibilityReadingKey,
} from "../../services/interpretationCache";
import { useAsync } from "../../hooks/useAsync";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";


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
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text.secondary} />
        </Pressable>
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
        {score.loading || !score.data ? (
          <View style={styles.loaderBox}>
            <CelestialLoader label={t("compatibility.computing")} />
          </View>
        ) : (
          <>
            <View style={styles.ringWrap}>
              <ScoreRing score={score.data.overall} label={t("compatibility.overall")} />
            </View>

            {/* Dimension bars — the same 7 for every couple */}
            <HairlineCard style={styles.catCard}>
              {score.data.dimensions.map((d) => (
                <CategoryBar
                  key={d.key}
                  label={t(`compatibility.dimensions.${d.key}` as TranslationKey)}
                  hint={t(`compatibility.hints.${d.key}` as TranslationKey)}
                  value={d.value}
                  lowerIsBetter={d.lowerIsBetter}
                  lowerBetterLabel={t("compatibility.lowerBetter")}
                />
              ))}
            </HairlineCard>

            {/* Top aspects */}
            <View style={styles.section}>
              <SectionHeader eyebrow={t("compatibility.topAspectsTitle")} />
              <HairlineCard>
                {score.data.topAspects.map((a, i) => (
                  <View key={`${a.planetA}-${a.planetB}-${i}`}>
                    <SynastryAspectRow aspect={a} />
                    {i < score.data!.topAspects.length - 1 ? (
                      <View style={styles.sep} />
                    ) : null}
                  </View>
                ))}
              </HairlineCard>
            </View>

            {/* View this person's charts (premium after 2 free) */}
            <View style={styles.chartsRow}>
              <Pressable
                style={styles.chartBtn}
                onPress={() => router.push(`/compatibility/${String(id)}/chart` as Href)}
              >
                <Ionicons name="planet-outline" size={18} color={colors.gold[300]} />
                <AppText variant="bodySmall" color={colors.text.primary}>
                  {t("compatibility.viewNatal")}
                </AppText>
              </Pressable>
              <Pressable
                style={styles.chartBtn}
                onPress={() => router.push(`/compatibility/${String(id)}/transits` as Href)}
              >
                <Ionicons name="telescope-outline" size={18} color={colors.gold[300]} />
                <AppText variant="bodySmall" color={colors.text.primary}>
                  {t("compatibility.viewTransits")}
                </AppText>
              </Pressable>
            </View>

            {/* Reading — gated */}
            <View style={styles.section}>
              <SectionHeader eyebrow={t("compatibility.readingTitle")} />
              {locked ? (
                <HairlineCard>
                  <View style={styles.lockedBox}>
                    <Ionicons name="lock-closed" size={20} color={colors.gold[300]} />
                    <AppText variant="body" center>
                      {t("compatibility.lockedAspects")}
                    </AppText>
                    <GoldButton
                      label={t("paywall.unlock")}
                      onPress={() => setPaywall(true)}
                    />
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
            </View>
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
  label,
  hint,
  value,
  lowerIsBetter,
  lowerBetterLabel,
}: {
  label: string;
  hint: string;
  value: number;
  lowerIsBetter: boolean;
  lowerBetterLabel: string;
}) {
  // "Goodness" drives the colour: for lower-is-better dims a low value is good.
  const goodness = lowerIsBetter ? 100 - value : value;
  const fillColor =
    goodness >= 66
      ? colors.semantic.harmonic
      : goodness >= 40
        ? colors.gold[400]
        : colors.semantic.challenging;
  return (
    <View style={styles.dimRow}>
      <View style={styles.barRow}>
        <View style={styles.barLabelWrap}>
          <AppText variant="bodySmall" color={colors.text.primary}>
            {label}
          </AppText>
          {lowerIsBetter ? (
            <AppText variant="label" color={colors.text.tertiary} style={styles.lowerTag}>
              ↓ {lowerBetterLabel}
            </AppText>
          ) : null}
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.max(4, Math.min(100, value))}%`, backgroundColor: fillColor },
            ]}
          />
        </View>
        <AppText variant="numeric" color={colors.text.secondary} style={styles.barValue}>
          {value}
        </AppText>
      </View>
      <AppText variant="bodySmall" color={colors.text.tertiary} style={styles.dimHint}>
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
    gap: spacing.md,
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
  loaderBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  ringWrap: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  catCard: {
    gap: spacing.lg,
  },
  dimRow: {
    gap: spacing.xs,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  barLabelWrap: {
    width: 116,
  },
  lowerTag: {
    marginTop: 2,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  dimHint: {
    marginLeft: 116 + spacing.md,
  },
  barTrack: {
    flex: 1,
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
    width: 28,
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
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
