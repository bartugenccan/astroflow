import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ScrollView, LayoutChangeEvent, type ScrollViewInstance } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";
import { Canvas, Circle, RadialGradient, vec } from "@shopify/react-native-skia";
import { Dimensions } from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Disclosure } from "../../components/ui/Disclosure";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { StateView } from "../../components/ui/StateView";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { IconButton } from "../../components/ui/IconButton";
import { AstroMap } from "../../components/AstroMap";
import { Glyph } from "../../components/Glyph";
import { TermInfo } from "../../components/TermInfo";
import { EnterView } from "../../lib/motion";
import { PlacementRow } from "./PlacementRow";
import { PlacementReading } from "./PlacementReading";
import { astrologyApi } from "../../services/astrologyApi";
import {
  CreateBirthProfileDto,
  NatalChartData,
  PlacementInterpretation,
  PlanetPlacement,
} from "../../services/types";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { dtoKey } from "../../services/interpretationCache";
import { houseLabel } from "../../lib/astroLanguage";
import { SIGNS } from "../../lib/zodiac";
import { useTranslation, type TFunction, type TranslationKey } from "../../i18n";
import { colors, spacing, gradients, motion } from "../../lib/design-system";

const { width: W } = Dimensions.get("window");

/** Planets a transit can come from (the moving sky). */
const TRANSIT_PLANETS = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];

/**
 * What a deep link asks the chart to show:
 * `/chart?planet=<NatalPlanet>&transit=<TransitPlanet>` (a journey discovery)
 * or `/chart?sign=<Sign>` (a zodiac constellation). Values are untrusted.
 */
export interface ChartFocus {
  planet?: string;
  transit?: string;
  sign?: string;
}

/** Case-insensitive match of a link value against the names we know. */
function matchName(value: string | undefined, options: readonly string[]): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  return options.find((o) => o.toLowerCase() === v) ?? null;
}

function nameOf(t: TFunction, group: "planets" | "signs", value: string): string {
  const key = `${group}.${value}` as TranslationKey;
  const out = t(key);
  return out === key ? value : out;
}

interface ChartScreenProps {
  /** Deep-link focus (own chart only). */
  focus?: ChartFocus;
  /** Override the chart subject; defaults to the logged-in user. */
  dto?: CreateBirthProfileDto;
  /** Override the header title (e.g. a saved person's name). */
  title?: string;
  /** Override the birth-details line. */
  birthLine?: string;
}

export function ChartScreen({ dto: dtoProp, title, birthLine: birthLineProp, focus }: ChartScreenProps = {}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const reduced = useReducedMotion();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [placementsY, setPlacementsY] = useState<number | null>(null);
  const [bannerHidden, setBannerHidden] = useState(false);
  const ownDto = useBirthDto();
  const dto = dtoProp ?? ownDto;
  const profile = useAppStore((s) => s.birthProfile);

  const [selected, setSelected] = useState<PlanetPlacement | null>(null);

  // Cached like every other section, so switching back to "In a picture"
  // renders the wheel instantly instead of re-fetching behind a loader.
  const key = dto ? dtoKey(dto) : null;
  const chartQ = useCachedAsync<NatalChartData>(
    key && `chart|${key}`,
    () => astrologyApi.getNatalChart(dto!),
  );
  const chart = chartQ.data;
  const placementsQ = useCachedAsync<PlacementInterpretation[]>(
    key && `placements|${key}|${locale}`,
    () => astrologyApi.getPlacementInterpretations(dto!, locale),
  );
  const placements = placementsQ.data;
  const placementsLoading = placementsQ.loading;
  const placementsError = !!placementsQ.error;

  // ── Deep-link focus ────────────────────────────────────────────────────────
  const focusPlanet = chart ? matchName(focus?.planet, chart.planets.map((p) => p.name)) : null;
  const focusTransit = matchName(focus?.transit, TRANSIT_PLANETS);
  const focusSign = matchName(focus?.sign, SIGNS);
  const signPlanets = chart && focusSign ? chart.planets.filter((p) => p.sign === focusSign) : [];
  const focusKey = `${focus?.planet ?? ""}|${focus?.transit ?? ""}|${focus?.sign ?? ""}`;

  // A new link shows its banner again even if the last one was dismissed.
  useEffect(() => setBannerHidden(false), [focusKey]);

  // Open the linked placement once the wheel has had a moment to draw.
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!chart || !focusPlanet || openedFor.current === focusKey) return;
    const target = chart.planets.find((p) => p.name === focusPlanet);
    if (!target) return;
    const timer = setTimeout(() => {
      openedFor.current = focusKey;
      setSelected(target);
    }, reduced ? 0 : 700);
    return () => clearTimeout(timer);
  }, [chart, focusPlanet, focusKey, reduced]);

  // A sign link scrolls down to the (highlighted) placements.
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!focusSign || focusPlanet || placementsY === null || scrolledFor.current === focusKey) return;
    const timer = setTimeout(() => {
      scrolledFor.current = focusKey;
      scrollRef.current?.scrollTo({ y: Math.max(0, placementsY - spacing.lg), animated: !reduced });
    }, reduced ? 0 : 700);
    return () => clearTimeout(timer);
  }, [focusSign, focusPlanet, placementsY, focusKey, reduced]);

  const isHighlighted = (p: PlanetPlacement) =>
    p.name === focusPlanet || (!!focusSign && p.sign === focusSign);

  const selectedReading = selected
    ? placements?.find((p) => p.planet === selected.name)
    : undefined;

  const birthLine =
    birthLineProp ??
    (profile
      ? `${formatDate(profile.birthDate, locale)} · ${profile.birthTime}${
          profile.placeName ? ` · ${profile.placeName}` : ""
        }`
      : "");

  return (
    <ScreenWrapper>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <EnterView from="none" style={styles.header}>
          <View style={styles.eyebrowRow}>
            <AppText variant="label" color={colors.text.accent} style={styles.shrink}>
              {t("chart.eyebrow")}
            </AppText>
            <TermInfo term="natalChart" size={14} />
          </View>
          <AppText variant="title" style={styles.title}>
            {title ?? t("chart.title")}
          </AppText>
          {birthLine ? (
            <AppText variant="bodySmall" style={styles.birthLine}>
              {birthLine}
            </AppText>
          ) : null}
        </EnterView>

        {chart && !bannerHidden && focusPlanet && focusTransit ? (
          <FocusBanner
            tone="sky"
            glyphs={[focusTransit, focusPlanet]}
            title={t("screens.chart.transitBanner", {
              transit: nameOf(t, "planets", focusTransit),
              planet: nameOf(t, "planets", focusPlanet),
            })}
            body={t("screens.chart.transitBannerBody", { planet: nameOf(t, "planets", focusPlanet) })}
            ctaLabel={t("screens.chart.transitCta")}
            // The day's transits live on the Today tab.
            onCta={() => router.push("/(tabs)" as Href)}
            onDismiss={() => setBannerHidden(true)}
          />
        ) : chart && !bannerHidden && focusSign ? (
          <FocusBanner
            tone="star"
            glyphs={[focusSign]}
            title={t("screens.chart.signBanner", { sign: nameOf(t, "signs", focusSign) })}
            body={
              signPlanets.length === 0
                ? t("screens.chart.signEmpty", { sign: nameOf(t, "signs", focusSign) })
                : t(signPlanets.length === 1 ? "screens.chart.signPlanetsOne" : "screens.chart.signPlanets", {
                    sign: nameOf(t, "signs", focusSign),
                    planets: signPlanets.map((p) => nameOf(t, "planets", p.name)).join(", "),
                  })
            }
            onDismiss={() => setBannerHidden(true)}
          />
        ) : null}

        {!chart ? (
          chartQ.error ? (
            <StateView kind="error" message={t("screens.chart.error")} onAction={chartQ.reload} />
          ) : (
            <StateView kind="loading" />
          )
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
            <View
              style={styles.section}
              onLayout={(e: LayoutChangeEvent) => setPlacementsY(e.nativeEvent.layout.y)}
            >
              <SectionHeader eyebrow={t("chart.placementsTitle")} />
              <ChunkyCard style={styles.placementsCard}>
                {chart.planets.slice(0, 3).map((planet, i) => (
                  <EnterView key={planet.name} index={i} delay={motion.stagger * 2} distance={10}>
                    <PlacementRow planet={planet} onPress={setSelected} highlighted={isHighlighted(planet)} />
                    {i < 2 ? <View style={styles.sep} /> : null}
                  </EnterView>
                ))}
              </ChunkyCard>
              {chart.planets.length > 3 ? (
                <Disclosure
                  key={focusKey}
                  title={t("chart.morePlacements", { n: chart.planets.length - 3 })}
                  summary={chart.planets
                    .slice(3)
                    .map((p) => t(`planets.${p.name}` as "planets.Sun"))
                    .join(" · ")}
                  icon="planet"
                  tone="star"
                  initiallyOpen={chart.planets.slice(3).some(isHighlighted)}
                >
                  {chart.planets.slice(3).map((planet, i, rest) => (
                    <View key={planet.name}>
                      <PlacementRow planet={planet} onPress={setSelected} highlighted={isHighlighted(planet)} />
                      {i < rest.length - 1 ? <View style={styles.sep} /> : null}
                    </View>
                  ))}
                </Disclosure>
              ) : null}
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
            <SheetReveal delay={0}>
              <View style={styles.sheetGlyph}>
                <Glyph name={selected.name} size={44} color={colors.star[200]} />
              </View>
            </SheetReveal>
            <SheetReveal delay={motion.stagger}>
              <View style={styles.sheetMeta}>
                <AppText variant="numeric" color={colors.text.secondary} style={styles.shrink}>
                  {houseLabel(t, locale, selected.house)} · {selected.degree}°
                  {String(selected.minute).padStart(2, "0")}′
                </AppText>
                <TermInfo term="house" size={14} />
              </View>
            </SheetReveal>
            <SheetReveal delay={motion.stagger * 2}>
              <PlacementReading
                reading={selectedReading}
                loading={placementsLoading}
                error={placementsError}
                onRetry={placementsQ.reload}
                retrograde={selected.retrograde}
              />
            </SheetReveal>
          </View>
        ) : null}
      </SpringBottomSheet>
    </ScreenWrapper>
  );
}

/**
 * The note a deep link leaves above the wheel, never over it: what the link
 * is about, and (for a transit) the way on to the day's sky.
 */
function FocusBanner({
  tone,
  glyphs,
  title,
  body,
  ctaLabel,
  onCta,
  onDismiss,
}: {
  tone: "sky" | "star";
  glyphs: string[];
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  return (
    <EnterView scale>
      <ChunkyCard tone={tone} tinted style={styles.banner}>
        <View style={styles.bannerHead}>
          <View style={styles.bannerGlyphs}>
            {glyphs.map((g) => (
              <Glyph key={g} name={g} size={22} color={colors.star[200]} />
            ))}
          </View>
          <AppText variant="heading" style={styles.bannerTitle} accessibilityRole="header">
            {title}
          </AppText>
          <IconButton icon="close" size={40} onPress={onDismiss} accessibilityLabel={t("screens.chart.dismiss")} />
        </View>
        <AppText variant="body">{body}</AppText>
        {ctaLabel && onCta ? (
          <ChunkyButton label={ctaLabel} onPress={onCta} variant={tone} size="md" />
        ) : null}
      </ChunkyCard>
    </EnterView>
  );
}

/** One staggered block inside the planet sheet — rises + fades as the sheet
 *  materializes, so the content feels summoned rather than dumped in. */
function SheetReveal({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <EnterView delay={120 + delay} distance={8} style={styles.sheetBlock}>
      {children}
    </EnterView>
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
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  shrink: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    marginTop: spacing.xs,
  },
  birthLine: {
    marginTop: spacing.xs,
  },
  banner: {
    gap: spacing.md,
  },
  bannerHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  bannerGlyphs: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  bannerTitle: {
    flex: 1,
    minWidth: 0,
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
  sheetBlock: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  sheetMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
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
