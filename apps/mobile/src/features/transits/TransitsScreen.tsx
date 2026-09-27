import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  InteractionManager,
  Dimensions,
} from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Canvas, Circle as SkCircle, RadialGradient, vec } from "@shopify/react-native-skia";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PressableScale } from "../../components/ui/PressableScale";
import { TermInfo } from "../../components/TermInfo";
import { EnterView } from "../../lib/motion";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { TransitWheel } from "../../components/TransitWheel";
import { TransitMovementRow, rowLayoutTransition } from "./TransitMovementRow";
import { astrologyApi } from "../../services/astrologyApi";
import {
  dtoKey,
  transitOverviewKey,
  prefetchTransits,
} from "../../services/interpretationCache";
import {
  CreateBirthProfileDto,
  NatalChartData,
  TransitOverview,
  TransitReport,
} from "../../services/types";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useTranslation } from "../../i18n";
import { colors, spacing, gradients } from "../../lib/design-system";

const { width: W } = Dimensions.get("window");

interface TransitsScreenProps {
  /** Override the transit subject; defaults to the logged-in user. */
  dto?: CreateBirthProfileDto;
  /** Override the header title (e.g. a saved person's name). */
  title?: string;
}

export function TransitsScreen({ dto: dtoProp, title }: TransitsScreenProps = {}) {
  const { t, locale } = useTranslation();
  const ownDto = useBirthDto();
  const dto = dtoProp ?? ownDto;
  const key = dto ? dtoKey(dto) : null;
  const today = new Date().toISOString().slice(0, 10);

  const report = useCachedAsync<TransitReport>(
    key && `report|${key}|${today}`,
    () => astrologyApi.getTransitReport(dto!),
  );
  const chart = useCachedAsync<NatalChartData>(
    key && `chart|${key}`,
    () => astrologyApi.getNatalChart(dto!),
  );
  const overview = useCachedAsync<TransitOverview>(
    key ? transitOverviewKey(dto!, today, locale) : null,
    () => astrologyApi.getTransitOverview(dto!, locale),
  );

  // Warm each planet's transit reading in the background once the report lands.
  useEffect(() => {
    if (!dto || !report.data) return;
    const planets = report.data.movements.map((m) => m.planet);
    const date = report.data.date;
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) void prefetchTransits(dto, planets, date, locale);
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [dto, report.data, locale]);

  const reduced = useReducedMotion();
  // A saved person's transits (title override) skip the first-person explainer.
  const isOwn = !dtoProp;

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact header — the Ahead switcher above already names the section. */}
        <EnterView index={0} style={styles.header}>
          <AppText variant="label" color={colors.text.gold}>
            {t("transits.eyebrow")}
          </AppText>
          <View style={styles.titleRow}>
            <AppText variant="title" style={styles.titleText}>
              {title ?? t("transits.title")}
            </AppText>
            <TermInfo term="transit" size={16} />
          </View>
          {isOwn ? (
            <AppText variant="bodySmall" color={colors.text.tertiary}>
              {t("transits.intro")}
            </AppText>
          ) : null}
        </EnterView>

        {/* Transit bi-wheel — natal inner, transiting outer */}
        {chart.data && report.data ? (
          <EnterView index={1} scale>
            <View style={styles.wheelWrap}>
              <Canvas style={StyleSheet.absoluteFill}>
                <SkCircle cx={W / 2} cy={W / 2} r={W * 0.42} opacity={0.5}>
                  <RadialGradient
                    c={vec(W / 2, W / 2)}
                    r={W * 0.42}
                    colors={[gradients.skyRadialCenter, "transparent"]}
                  />
                </SkCircle>
              </Canvas>
              <TransitWheel natal={chart.data} report={report.data} />
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.moon }]} />
                <AppText variant="label" color={colors.text.tertiary} style={styles.legendText}>
                  {t("transits.natalLabel")}
                </AppText>
                <TermInfo term="natalChart" size={13} />
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.gold[300] }]} />
                <AppText variant="label" color={colors.text.tertiary} style={styles.legendText}>
                  {t("transits.transitLabel")}
                </AppText>
              </View>
            </View>
          </EnterView>
        ) : (
          <View style={styles.wheelLoading}>
            <CelestialLoader label={t("common.loading")} />
          </View>
        )}

        {/* The sky now — overview */}
        <EnterView index={2}>
          <HairlineCard elevated style={styles.hero}>
            <AppText variant="label" color={colors.text.gold}>
              {t("transits.skyOverviewTitle")}
            </AppText>
            <Loader
              loading={overview.loading}
              error={!!overview.error}
              onRetry={overview.reload}
              retryLabel={t("reading.retry")}
            >
              <AppText variant="serifBody">{overview.data?.text}</AppText>
            </Loader>
          </HairlineCard>
        </EnterView>

        {/* Per-planet transit cards */}
        <EnterView index={3} style={styles.section}>
          <View style={styles.sectionHead}>
            <SectionHeader eyebrow={t("transits.movementsTitle")} />
            <AppText variant="bodySmall" color={colors.text.tertiary}>
              {t("transits.tapPlanet")}
            </AppText>
          </View>
          <HairlineCard style={styles.listCard}>
            <Loader
              loading={report.loading}
              error={!!report.error}
              onRetry={report.reload}
              retryLabel={t("reading.retry")}
            >
              {report.data && dto
                ? report.data.movements.map((m, i) => (
                    <Animated.View
                      key={m.planet}
                      layout={reduced ? undefined : rowLayoutTransition}
                    >
                      {i > 0 ? <View style={styles.sep} /> : null}
                      <TransitMovementRow
                        dto={dto}
                        movement={m}
                        date={report.data!.date}
                        locale={locale}
                      />
                    </Animated.View>
                  ))
                : null}
            </Loader>
          </HairlineCard>
        </EnterView>
      </ScrollView>
    </ScreenWrapper>
  );
}

function Loader({
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
      <PressableScale style={styles.retry} onPress={onRetry} haptic="none">
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
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  titleText: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 24,
    lineHeight: 30,
  },
  hero: {
    gap: spacing.lg,
  },
  wheelWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  wheelLoading: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
    marginTop: -spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
    minWidth: 0,
  },
  legendText: {
    flexShrink: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  section: {
    gap: spacing.md,
  },
  sectionHead: {
    gap: spacing.xs,
  },
  listCard: {
    paddingVertical: spacing.sm,
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
