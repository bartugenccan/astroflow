import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator } from "react-native";
import { MotiView } from "moti";
import { Canvas, Circle, RadialGradient, vec } from "@shopify/react-native-skia";
import { Dimensions } from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { AstroMap } from "../../components/AstroMap";
import { Glyph } from "../../components/Glyph";
import { PlacementRow } from "./PlacementRow";
import { PlacementReading } from "./PlacementReading";
import { astrologyApi } from "../../services/astrologyApi";
import {
  NatalChartData,
  PlacementInterpretation,
  PlanetPlacement,
} from "../../services/types";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { colors, spacing, gradients } from "../../lib/design-system";

const { width: W } = Dimensions.get("window");

export function ChartScreen() {
  const { t, locale } = useTranslation();
  const dto = useBirthDto();
  const profile = useAppStore((s) => s.birthProfile);

  const [chart, setChart] = useState<NatalChartData | null>(null);
  const [selected, setSelected] = useState<PlanetPlacement | null>(null);

  const [placements, setPlacements] = useState<PlacementInterpretation[] | null>(null);
  const [placementsLoading, setPlacementsLoading] = useState(false);
  const [placementsError, setPlacementsError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!dto) return;
    let active = true;
    astrologyApi.getNatalChart(dto).then((c) => {
      if (active) setChart(c);
    });
    return () => {
      active = false;
    };
  }, [dto]);

  // Prefetch every placement reading once the chart is available.
  useEffect(() => {
    if (!dto) return;
    let active = true;
    setPlacementsLoading(true);
    setPlacementsError(false);
    astrologyApi
      .getPlacementInterpretations(dto, locale)
      .then((p) => {
        if (active) {
          setPlacements(p);
          setPlacementsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setPlacementsError(true);
          setPlacementsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [dto, locale, reloadNonce]);

  const selectedReading = selected
    ? placements?.find((p) => p.planet === selected.name)
    : undefined;

  const birthLine = profile
    ? `${formatDate(profile.birthDate, locale)} · ${profile.birthTime}${
        profile.placeName ? ` · ${profile.placeName}` : ""
      }`
    : "";

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <SectionHeader eyebrow="NATAL CHART" title={t("chart.title")} />
          {birthLine ? (
            <AppText variant="bodySmall" style={styles.birthLine}>
              {birthLine}
            </AppText>
          ) : null}
        </View>

        {!chart ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.gold[300]} />
          </View>
        ) : (
          <>
            {/* Wheel over a soft radial glow */}
            <View style={styles.wheelWrap}>
              <Canvas style={StyleSheet.absoluteFill}>
                <Circle cx={W / 2} cy={W / 2} r={W * 0.42} opacity={0.5}>
                  <RadialGradient
                    c={vec(W / 2, W / 2)}
                    r={W * 0.42}
                    colors={[gradients.skyRadialCenter, "transparent"]}
                  />
                </Circle>
              </Canvas>
              <AstroMap
                houses={chart.houses}
                planets={chart.planets}
                aspects={chart.aspects}
                ascendantSign={chart.angles.ascendant.sign}
                ascendantDegree={chart.angles.ascendant.degree}
                selectedPlanet={selected?.name}
                onPlanetPress={setSelected}
              />
            </View>

            <AppText variant="bodySmall" center style={styles.tapHint}>
              {t("chart.tapHint")}
            </AppText>

            {/* Placements */}
            <View style={styles.section}>
              <SectionHeader eyebrow={t("chart.placementsTitle")} />
              <HairlineCard style={styles.placementsCard}>
                {chart.planets.map((planet, i) => (
                  <MotiView
                    key={planet.name}
                    from={{ opacity: 0, translateX: 10 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: "timing", duration: 300, delay: i * 60 }}
                  >
                    <PlacementRow planet={planet} onPress={setSelected} />
                    {i < chart.planets.length - 1 ? <View style={styles.sep} /> : null}
                  </MotiView>
                ))}
              </HairlineCard>
            </View>
          </>
        )}
      </ScrollView>

      <SpringBottomSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected
            ? `${t(`planets.${selected.name}` as "planets.Sun")} · ${t(
                `signs.${selected.sign}` as "signs.Aries",
              )}`
            : undefined
        }
      >
        {selected ? (
          <View style={styles.sheetBody}>
            <View style={styles.sheetGlyph}>
              <Glyph name={selected.name} size={44} color={colors.gold[200]} />
            </View>
            <AppText variant="numeric" color={colors.text.secondary}>
              {t("chart.house", { n: selected.house })} · {selected.degree}°
              {String(selected.minute).padStart(2, "0")}′
              {selected.retrograde ? ` · ${t("chart.retrograde")}` : ""}
            </AppText>
            <PlacementReading
              reading={selectedReading}
              loading={placementsLoading}
              error={placementsError}
              onRetry={() => setReloadNonce((n) => n + 1)}
            />
          </View>
        ) : null}
      </SpringBottomSheet>
    </ScreenWrapper>
  );
}

function formatDate(iso: string, locale: string): string {
  // Build from components (local midnight) — avoids Hermes parsing the string
  // as UTC, which shifts the date back a day in negative-offset timezones.
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  birthLine: {
    marginTop: spacing.xs,
  },
  loading: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  wheelWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  tapHint: {
    marginTop: -spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  placementsCard: {
    paddingVertical: spacing.sm,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
  sheetBody: {
    alignItems: "center",
    gap: spacing.md,
  },
  sheetGlyph: {
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sheetText: {
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
