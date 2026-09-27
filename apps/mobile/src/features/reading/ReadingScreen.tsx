import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, InteractionManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { LinearTransition, useReducedMotion } from "react-native-reanimated";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StarDivider } from "../../components/ui/StarDivider";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { PressableScale } from "../../components/ui/PressableScale";
import { ShareButton } from "../../components/ui/ShareButton";
import { TermInfo } from "../../components/TermInfo";
import { BigThree } from "../../components/BigThree";
import { Glyph } from "../../components/Glyph";
import { AspectRow } from "./AspectRow";
import { HouseRow } from "./HouseRow";
import { ShareCardModal } from "../share/ShareCardModal";
import { ShareCardData } from "../share/ShareableCard";
import { astrologyApi } from "../../services/astrologyApi";
import { dtoKey, prefetchHouses } from "../../services/interpretationCache";
import {
  AspectInterpretation,
  BigThreeReading,
  ChartContext,
  ChartOverview,
  NatalChartData,
  NodeAnalysis,
} from "../../services/types";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { houseLabel } from "../../lib/astroLanguage";
import { GlossaryTermId } from "../../lib/glossary";
import { EnterView } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, motion } from "../../lib/design-system";

interface ReadingScreenProps {
  /** Rendered right under the title, inside the scroll (e.g. the "see your
   *  chart as a wheel" card in the For You tab). */
  headerSlot?: React.ReactNode;
}

export function ReadingScreen({ headerSlot }: ReadingScreenProps = {}) {
  const { t, locale } = useTranslation();
  const dto = useBirthDto();
  const profile = useAppStore((s) => s.birthProfile);
  const displayName = useAppStore((s) => s.displayName);
  const [shareData, setShareData] = useState<ShareCardData | null>(null);
  const reduced = useReducedMotion();
  // Rows below an opening accordion glide down instead of jumping.
  const rowLayout = reduced
    ? undefined
    : LinearTransition.springify()
        .damping(motion.spring.gentle.damping)
        .stiffness(motion.spring.gentle.stiffness);

  const key = dto ? dtoKey(dto) : null;

  const bigThree = useCachedAsync<BigThreeReading>(
    key && `bigThree|${key}|${locale}`,
    () => astrologyApi.getBigThree(dto!, locale),
  );
  const overview = useCachedAsync<ChartOverview>(
    key && `overview|${key}|${locale}`,
    () => astrologyApi.getChartOverview(dto!, locale),
  );
  const aspects = useCachedAsync<AspectInterpretation[]>(
    key && `aspects|${key}|${locale}`,
    () => astrologyApi.getAspectInterpretations(dto!, locale),
  );
  const chart = useCachedAsync<NatalChartData>(
    key && `chart|${key}`,
    () => astrologyApi.getNatalChart(dto!),
  );
  const context = useCachedAsync<ChartContext>(
    key && `context|${key}|${locale}`,
    () => astrologyApi.getChartContext(dto!, locale),
  );
  const nodes = useCachedAsync<NodeAnalysis>(
    key && `nodes|${key}|${locale}`,
    () => astrologyApi.getNodes(dto!, locale),
  );

  // Warm all 12 house readings in the background so tapping a card is instant.
  // Deferred past the initial interactions so the visible sections load first.
  useEffect(() => {
    if (!dto) return;
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) void prefetchHouses(dto, locale);
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [dto, locale]);

  const shareBigThree = () => {
    if (!profile) return;
    setShareData({
      variant: "bigThree",
      sunSign: profile.sunSign,
      moonSign: profile.moonSign,
      risingSign: profile.risingSign,
      name: displayName,
    });
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <EnterView from="none">
          <SectionHeader eyebrow={t("reading.eyebrow")} title={t("reading.title")} />
        </EnterView>

        {headerSlot}

        {/* Big Three hero */}
        <EnterView index={1}>
          <HairlineCard elevated style={styles.hero}>
            <View style={styles.heroHeader}>
              <View style={styles.headLeft}>
                <AppText variant="label" color={colors.text.gold} style={styles.shrink}>
                  {t("reading.bigThreeTitle")}
                </AppText>
                <TermInfo term="bigThree" size={14} />
              </View>
              {profile ? <ShareButton onPress={shareBigThree} size={32} /> : null}
            </View>
            {profile ? (
              <BigThree
                sunSign={profile.sunSign}
                moonSign={profile.moonSign}
                risingSign={profile.risingSign}
              />
            ) : null}
            <View style={styles.divider}>
              <StarDivider />
            </View>
            <Section
              loading={bigThree.loading}
              error={!!bigThree.error}
              onRetry={bigThree.reload}
              retryLabel={t("reading.retry")}
            >
              <AppText variant="serifBody">{bigThree.data?.text}</AppText>
            </Section>
          </HairlineCard>
        </EnterView>

        {/* Chart Context — day/night + Saturn return */}
        <EnterView index={2} style={styles.section}>
          <SectionHeader eyebrow={t("reading.contextTitle")} />
          <HairlineCard>
            {context.data ? (
              <View style={styles.chips}>
                <View style={styles.chip}>
                  <AppText variant="labelLong" color={colors.gold[300]} style={styles.shrink}>
                    {context.data.sect === "day"
                      ? t("reading.dayChart")
                      : t("reading.nightChart")}
                  </AppText>
                  <TermInfo term="dayNightChart" size={14} />
                </View>
                <View style={styles.chip}>
                  <AppText variant="labelLong" color={colors.gold[300]} style={styles.shrink}>
                    {t("reading.saturnReturn", { age: context.data.saturnReturnAge })}
                  </AppText>
                  <TermInfo term="saturnReturn" size={14} />
                </View>
              </View>
            ) : null}
            <Section
              loading={context.loading}
              error={!!context.error}
              onRetry={context.reload}
              retryLabel={t("reading.retry")}
            >
              <AppText variant="serifBody">{context.data?.text}</AppText>
            </Section>
          </HairlineCard>
        </EnterView>

        {/* Overview */}
        <EnterView index={3} style={styles.section}>
          <SectionHeader eyebrow={t("reading.overviewTitle")} />
          <HairlineCard>
            <Section
              loading={overview.loading}
              error={!!overview.error}
              onRetry={overview.reload}
              retryLabel={t("reading.retry")}
            >
              <AppText variant="serifBody">{overview.data?.text}</AppText>
            </Section>
          </HairlineCard>
        </EnterView>

        {/* Houses — 12 lazily-read cards */}
        <View style={styles.section}>
          <TermHeader eyebrow={t("reading.housesTitle")} term="house" />
          <HairlineCard style={styles.aspectsCard}>
            <Section
              loading={chart.loading}
              error={!!chart.error}
              onRetry={chart.reload}
              retryLabel={t("reading.retry")}
            >
              {chart.data
                ? chart.data.houses.map((h, i) => (
                    <Animated.View key={h.house} layout={rowLayout}>
                      {dto ? <HouseRow dto={dto} house={h} locale={locale} /> : null}
                      {i < chart.data!.houses.length - 1 ? (
                        <View style={styles.sep} />
                      ) : null}
                    </Animated.View>
                  ))
                : null}
            </Section>
          </HairlineCard>
        </View>

        {/* Key aspects */}
        <View style={styles.section}>
          <TermHeader eyebrow={t("reading.aspectsTitle")} term="aspect" />
          <HairlineCard style={styles.aspectsCard}>
            <Section
              loading={aspects.loading}
              error={!!aspects.error}
              onRetry={aspects.reload}
              retryLabel={t("reading.retry")}
            >
              {aspects.data && aspects.data.length > 0 ? (
                aspects.data.map((a, i) => (
                  <Animated.View
                    key={`${a.planet1}-${a.planet2}-${a.aspect}`}
                    layout={rowLayout}
                  >
                    <EnterView index={i} distance={8}>
                      <AspectRow aspect={a} />
                      {i < aspects.data!.length - 1 ? <View style={styles.sep} /> : null}
                    </EnterView>
                  </Animated.View>
                ))
              ) : (
                <AppText variant="body">{t("reading.tapAspect")}</AppText>
              )}
            </Section>
          </HairlineCard>
        </View>

        {/* Lunar Nodes */}
        <View style={styles.section}>
          <TermHeader eyebrow={t("reading.nodesTitle")} term="northNode" />
          <HairlineCard>
            {nodes.data ? (
              <View style={styles.nodeRow}>
                <View style={styles.nodeItem}>
                  <Glyph name="NorthNode" size={22} color={colors.gold[300]} />
                  <AppText variant="labelLong" color={colors.text.tertiary} center>
                    {t("reading.northNode")}
                  </AppText>
                  <AppText variant="bodySmall" color={colors.text.primary} center>
                    {t(`signs.${nodes.data.northSign}` as "signs.Aries")}
                  </AppText>
                  <AppText variant="labelLong" color={colors.text.tertiary} center>
                    {houseLabel(t, locale, nodes.data.northHouse)}
                    {chart.data ? ` · ${chart.data.nodes.north.degree}°` : ""}
                  </AppText>
                </View>
                <View style={styles.nodeItem}>
                  <Glyph name="SouthNode" size={22} color={colors.moon} />
                  <AppText variant="labelLong" color={colors.text.tertiary} center>
                    {t("reading.southNode")}
                  </AppText>
                  <AppText variant="bodySmall" color={colors.text.primary} center>
                    {t(`signs.${nodes.data.southSign}` as "signs.Aries")}
                  </AppText>
                  <AppText variant="labelLong" color={colors.text.tertiary} center>
                    {houseLabel(t, locale, nodes.data.southHouse)}
                    {chart.data ? ` · ${chart.data.nodes.south.degree}°` : ""}
                  </AppText>
                </View>
              </View>
            ) : null}
            <Section
              loading={nodes.loading}
              error={!!nodes.error}
              onRetry={nodes.reload}
              retryLabel={t("reading.retry")}
            >
              <AppText variant="serifBody">{nodes.data?.text}</AppText>
            </Section>
          </HairlineCard>
        </View>
      </ScrollView>

      <ShareCardModal
        visible={shareData !== null}
        onClose={() => setShareData(null)}
        data={shareData}
      />
    </ScreenWrapper>
  );
}

/** Section eyebrow with a glossary ⓘ beside it, for jargon-named sections. */
function TermHeader({ eyebrow, term }: { eyebrow: string; term: GlossaryTermId }) {
  return (
    <View style={styles.headLeft}>
      <View style={styles.shrink}>
        <SectionHeader eyebrow={eyebrow} />
      </View>
      <TermInfo term={term} size={14} />
    </View>
  );
}

function Section({
  loading,
  error,
  onRetry,
  retryLabel,
  children,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  retryLabel: string;
  children: React.ReactNode;
}) {
  if (loading) return <ShimmerLines lines={3} />;
  if (error)
    return (
      <PressableScale style={styles.retry} onPress={onRetry} accessibilityRole="button">
        <Ionicons name="refresh" size={16} color={colors.gold[300]} />
        <AppText variant="body" color={colors.gold[300]}>
          {retryLabel}
        </AppText>
      </PressableScale>
    );
  return <>{children}</>;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.lg,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
    minWidth: 0,
  },
  shrink: {
    flexShrink: 1,
    minWidth: 0,
  },
  divider: {
    paddingVertical: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  aspectsCard: {
    paddingVertical: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  nodeRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  nodeItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: spacing.xs,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
});
