import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  InteractionManager,
} from "react-native";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StarDivider } from "../../components/ui/StarDivider";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { BigThree } from "../../components/BigThree";
import { Glyph } from "../../components/Glyph";
import { AspectRow } from "./AspectRow";
import { HouseRow } from "./HouseRow";
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
import { useTranslation } from "../../i18n";
import { colors, spacing, motion, radii } from "../../lib/design-system";

export function ReadingScreen() {
  const { t, locale } = useTranslation();
  const dto = useBirthDto();
  const profile = useAppStore((s) => s.birthProfile);

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

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader eyebrow={t("reading.eyebrow")} title={t("reading.title")} />

        {/* Big Three hero */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", ...motion.spring.gentle }}
        >
          <HairlineCard elevated style={styles.hero}>
            <AppText variant="label" color={colors.text.gold}>
              {t("reading.bigThreeTitle")}
            </AppText>
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
        </MotiView>

        {/* Chart Context — day/night + Saturn return */}
        <View style={styles.section}>
          <SectionHeader eyebrow={t("reading.contextTitle")} />
          <HairlineCard>
            {context.data ? (
              <View style={styles.chips}>
                <View style={styles.chip}>
                  <AppText variant="label" color={colors.gold[300]}>
                    {context.data.sect === "day"
                      ? t("reading.dayChart")
                      : t("reading.nightChart")}
                  </AppText>
                </View>
                <View style={styles.chip}>
                  <AppText variant="label" color={colors.gold[300]}>
                    {t("reading.saturnReturn", { age: context.data.saturnReturnAge })}
                  </AppText>
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
        </View>

        {/* Overview */}
        <View style={styles.section}>
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
        </View>

        {/* Houses — 12 lazily-read cards */}
        <View style={styles.section}>
          <SectionHeader eyebrow={t("reading.housesTitle")} />
          <HairlineCard style={styles.aspectsCard}>
            <Section
              loading={chart.loading}
              error={!!chart.error}
              onRetry={chart.reload}
              retryLabel={t("reading.retry")}
            >
              {chart.data
                ? chart.data.houses.map((h, i) => (
                    <View key={h.house}>
                      {dto ? <HouseRow dto={dto} house={h} locale={locale} /> : null}
                      {i < chart.data!.houses.length - 1 ? (
                        <View style={styles.sep} />
                      ) : null}
                    </View>
                  ))
                : null}
            </Section>
          </HairlineCard>
        </View>

        {/* Key aspects */}
        <View style={styles.section}>
          <SectionHeader eyebrow={t("reading.aspectsTitle")} />
          <HairlineCard style={styles.aspectsCard}>
            <Section
              loading={aspects.loading}
              error={!!aspects.error}
              onRetry={aspects.reload}
              retryLabel={t("reading.retry")}
            >
              {aspects.data && aspects.data.length > 0 ? (
                aspects.data.map((a, i) => (
                  <MotiView
                    key={`${a.planet1}-${a.planet2}-${a.aspect}`}
                    from={{ opacity: 0, translateX: 10 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: "timing", duration: 300, delay: i * motion.stagger }}
                  >
                    <AspectRow aspect={a} />
                    {i < aspects.data!.length - 1 ? <View style={styles.sep} /> : null}
                  </MotiView>
                ))
              ) : (
                <AppText variant="body">{t("reading.tapAspect")}</AppText>
              )}
            </Section>
          </HairlineCard>
        </View>

        {/* Lunar Nodes */}
        <View style={styles.section}>
          <SectionHeader eyebrow={t("reading.nodesTitle")} />
          <HairlineCard>
            {nodes.data ? (
              <View style={styles.nodeRow}>
                <View style={styles.nodeItem}>
                  <Glyph name="NorthNode" size={22} color={colors.gold[300]} />
                  <AppText variant="label" color={colors.text.tertiary}>
                    {t("reading.northNode")}
                  </AppText>
                  <AppText variant="bodySmall" color={colors.text.primary}>
                    {t(`signs.${nodes.data.northSign}` as "signs.Aries")}
                  </AppText>
                </View>
                <View style={styles.nodeItem}>
                  <Glyph name="SouthNode" size={22} color={colors.moon} />
                  <AppText variant="label" color={colors.text.tertiary}>
                    {t("reading.southNode")}
                  </AppText>
                  <AppText variant="bodySmall" color={colors.text.primary}>
                    {t(`signs.${nodes.data.southSign}` as "signs.Aries")}
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
    </ScreenWrapper>
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
      <Pressable style={styles.retry} onPress={onRetry}>
        <Ionicons name="refresh" size={16} color={colors.gold[300]} />
        <AppText variant="body" color={colors.gold[300]}>
          {retryLabel}
        </AppText>
      </Pressable>
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  nodeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.md,
  },
  nodeItem: {
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
