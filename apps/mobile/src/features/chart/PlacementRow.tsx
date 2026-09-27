import React from "react";
import { StyleSheet, View } from "react-native";
import { PressableScale } from "../../components/ui/PressableScale";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { PlanetPlacement } from "../../services/types";
import { houseLabel } from "../../lib/astroLanguage";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

interface Props {
  planet: PlanetPlacement;
  onPress: (planet: PlanetPlacement) => void;
}

/** A single "☉ Sun — Aries · 1st House — 14°32′" row. */
export function PlacementRow({ planet, onPress }: Props) {
  const { t, locale } = useTranslation();
  const signName = t(`signs.${planet.sign}` as "signs.Aries");
  const planetName = t(`planets.${planet.name}` as "planets.Sun");

  return (
    <PressableScale
      onPress={() => onPress(planet)}
      scaleTo={0.98}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${planetName}, ${signName}, ${houseLabel(t, locale, planet.house)}${
        planet.retrograde ? `, ${t("chart.retrograde")}` : ""
      }`}
    >
      <View style={styles.left}>
        <View style={styles.glyph}>
          <Glyph name={planet.name} size={24} color={colors.gold[200]} />
        </View>
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <AppText variant="heading" color={colors.text.primary} style={styles.shrink}>
              {planetName}
            </AppText>
            {planet.retrograde ? (
              <Glyph name="Retrograde" size={14} color={colors.semantic.challenging} />
            ) : null}
          </View>
          <AppText variant="bodySmall">
            {signName} · {houseLabel(t, locale, planet.house)}
          </AppText>
          {planet.retrograde ? (
            <AppText variant="bodySmall" color={colors.semantic.challenging}>
              {t("chart.retrograde")}
            </AppText>
          ) : null}
        </View>
      </View>
      <AppText variant="numeric" color={colors.text.tertiary} style={styles.degree}>
        {planet.degree}°{String(planet.minute).padStart(2, "0")}′
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  glyph: {
    width: 28,
    alignItems: "center",
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  shrink: {
    flexShrink: 1,
    minWidth: 0,
  },
  degree: {
    flexShrink: 0,
  },
});
