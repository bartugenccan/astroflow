import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  InteractionManager,
  Dimensions,
} from "react-native";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { Canvas, Circle as SkCircle, RadialGradient, vec } from "@shopify/react-native-skia";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { TransitWheel } from "../../components/TransitWheel";
import { TransitMovementRow } from "./TransitMovementRow";
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
import { colors, spacing, motion, gradients } from "../../lib/design-system";

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

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader eyebrow={t("transits.eyebrow")} title={title ?? t("transits.title")} />

        {/* Transit bi-wheel — natal inner, transiting outer */}
        {chart.data && report.data ? (
          <MotiView
            from={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", ...motion.spring.gentle }}
          >
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
                <AppText variant="label" color={colors.text.tertiary}>
                  {t("transits.natalLabel")}
                </AppText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.gold[300] }]} />
                <AppText variant="label" color={colors.text.tertiary}>
                  {t("transits.transitLabel")}
                </AppText>
              </View>
            </View>
          </MotiView>
        ) : (
          <View style={styles.wheelLoading}>
            <CelestialLoader label={t("common.loading")} />
          </View>
        )}

        {/* The sky now — overview */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", ...motion.spring.gentle }}
        >
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
        </MotiView>

        {/* Per-planet transit cards */}
        <View style={styles.section}>
          <SectionHeader eyebrow={t("transits.movementsTitle")} />
          <HairlineCard style={styles.listCard}>
            <Loader
              loading={report.loading}
              error={!!report.error}
              onRetry={report.reload}
              retryLabel={t("reading.retry")}
            >
              {report.data && dto
                ? report.data.movements.map((m, i) => (
                    <View key={m.planet}>
                      <TransitMovementRow
                        dto={dto}
                        movement={m}
                        date={report.data!.date}
                        locale={locale}
                      />
                      {i < report.data!.movements.length - 1 ? (
                        <View style={styles.sep} />
                      ) : null}
                    </View>
                  ))
                : null}
            </Loader>
          </HairlineCard>
        </View>
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
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  section: {
    gap: spacing.md,
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
