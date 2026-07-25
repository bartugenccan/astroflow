import React from "react";
import { StyleSheet, View } from "react-native";
import { BouncyButton } from "../../components/ui/BouncyButton";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { PlanetPlacement } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

interface Props {
  planet: PlanetPlacement;
  onPress: (planet: PlanetPlacement) => void;
}

/** A single "☉ Sun — Aries · 1st House — 14°32′" row. */
export function PlacementRow({ planet, onPress }: Props) {
  const { t } = useTranslation();
  const signName = t(`signs.${planet.sign}` as "signs.Aries");
  const planetName = t(`planets.${planet.name}` as "planets.Sun");

  return (
    <BouncyButton onPress={() => onPress(planet)} scaleTo={0.98} style={styles.row}>
      <View style={styles.left}>
        <View style={styles.glyph}>
          <Glyph name={planet.name} size={24} color={colors.gold[200]} />
        </View>
        <View>
          <AppText variant="heading" color={colors.text.primary}>
            {planetName}
            {planet.retrograde ? (
              <AppText variant="heading" color={colors.semantic.challenging}>
                {"  ℞"}
              </AppText>
            ) : null}
          </AppText>
          <AppText variant="bodySmall">
            {signName} · {t("chart.house", { n: planet.house })}
          </AppText>
        </View>
      </View>
      <AppText variant="numeric" color={colors.text.tertiary}>
        {planet.degree}°{String(planet.minute).padStart(2, "0")}′
      </AppText>
    </BouncyButton>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  glyph: {
    width: 28,
    alignItems: "center",
  },
});
