import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { TwinkleSky } from "../../components/ui/TwinkleSky";
import { Glyph } from "../../components/Glyph";
import { TermInfo } from "../../components/TermInfo";
import { EnterView } from "../../lib/motion";
import { SIGNS } from "../../lib/zodiac";
import { TranslationKey, useTranslation } from "../../i18n";
import { colors, motion, palette, radii, shadows, spacing, surface } from "../../lib/design-system";
import type { PlacementInterpretation, PlanetPlacement } from "../../services/types";
import { PlacementReading } from "./PlacementReading";

const ELEMENTS = ["fire", "earth", "air", "water"] as const;
type Element = (typeof ELEMENTS)[number];
const ELEMENT_KEY: Record<Element, string> = { fire: "Fire", earth: "Earth", air: "Air", water: "Water" };

function elementOf(sign: string): Element {
  const i = SIGNS.indexOf(sign as (typeof SIGNS)[number]);
  return ELEMENTS[(i < 0 ? 0 : i) % 4];
}

interface Props {
  placement: PlanetPlacement;
  reading?: PlacementInterpretation;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/**
 * The planet sheet's body: a sky-window hero (the planet as a lit orb, its
 * sign in the element's colour), three quick facts (element, house, degree),
 * then the reading in its own card. Blocks rise in one after another as the
 * sheet opens.
 */
export function PlanetDetail({ placement, reading, loading, error, onRetry }: Props) {
  const { t } = useTranslation();
  const element = elementOf(placement.sign);
  const elementColor = colors.element[element];
  const planetName = t(`planets.${placement.name}` as TranslationKey);
  const signName = t(`signs.${placement.sign}` as TranslationKey);
  const degree = `${placement.degree}°${String(placement.minute).padStart(2, "0")}′`;

  return (
    <View style={styles.body}>
      <Reveal step={0}>
        <ChunkyCard tone="raised" style={styles.hero}>
          <TwinkleSky color={elementColor} seed={`${placement.name}-${placement.sign}`} stars={8} />
          <View style={styles.heroRow}>
            {/* A planet is luminous: its orb may glow. */}
            <View style={[styles.orb, shadows.glow]}>
              <Glyph name={placement.name} size={38} color={palette.star.on} />
            </View>
            <View style={styles.heroText}>
              <AppText variant="label" color={colors.text.accent}>
                {t("screens.chart.sheetEyebrow")}
              </AppText>
              <View style={styles.signRow}>
                <Glyph name={placement.sign} size={24} color={elementColor} />
                <AppText
                  variant="title"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={styles.shrink}
                  accessibilityLabel={`${planetName}, ${t("screens.chart.sheetIn", { sign: signName })}`}
                >
                  {t("screens.chart.sheetIn", { sign: signName })}
                </AppText>
              </View>
            </View>
          </View>
        </ChunkyCard>
      </Reveal>

      <Reveal step={1}>
        <View style={styles.facts}>
          <Fact label={t("screens.chart.factElement")}>
            <View style={[styles.dot, { backgroundColor: elementColor }]} />
            <AppText variant="heading" numberOfLines={1} style={styles.shrink}>
              {t(`elements.${ELEMENT_KEY[element]}` as TranslationKey)}
            </AppText>
          </Fact>
          <Fact label={t("screens.chart.factHouse")} info={<TermInfo term="house" size={14} />}>
            <AppText variant="numeric">{placement.house}</AppText>
          </Fact>
          <Fact label={t("screens.chart.factDegree")}>
            <AppText variant="numeric" numberOfLines={1}>
              {degree}
            </AppText>
          </Fact>
        </View>
      </Reveal>

      <Reveal step={2}>
        <ChunkyCard style={styles.readingCard}>
          <AppText variant="label" color={colors.text.accent}>
            {t("screens.chart.readingEyebrow")}
          </AppText>
          <PlacementReading
            reading={reading}
            loading={loading}
            error={error}
            onRetry={onRetry}
            retrograde={placement.retrograde}
            align="left"
          />
        </ChunkyCard>
      </Reveal>
    </View>
  );
}

function Fact({ label, info, children }: { label: string; info?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factLabel}>
        <AppText variant="label" color={colors.text.tertiary} numberOfLines={1} style={styles.shrink}>
          {label}
        </AppText>
        {info}
      </View>
      <View style={styles.factValue}>{children}</View>
    </View>
  );
}

function Reveal({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <EnterView delay={120 + step * motion.stagger} distance={8} style={styles.block}>
      {children}
    </EnterView>
  );
}

const ORB = 64;

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  block: { alignSelf: "stretch" },
  hero: { overflow: "hidden" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    backgroundColor: palette.star.face,
    borderBottomWidth: 4,
    borderBottomColor: palette.star.slab,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1, minWidth: 0, gap: 2 },
  signRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  facts: { flexDirection: "row", gap: spacing.sm },
  fact: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: surface.raised,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: 4,
    borderBottomColor: surface.slab,
  },
  factLabel: { flexDirection: "row", alignItems: "center", gap: 2 },
  factValue: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 24 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  readingCard: { gap: spacing.xs },
  shrink: { flexShrink: 1, minWidth: 0 },
});
