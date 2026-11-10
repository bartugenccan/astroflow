import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { StateView } from "../../components/ui/StateView";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { houseLabel } from "../../lib/astroLanguage";
import { useTranslation, type TFunction, type TranslationKey } from "../../i18n";
import type { CreateBirthProfileDto, LifeArea } from "../../services/types";
import { colors, palette, radii, spacing } from "../../lib/design-system";

export function planetName(t: TFunction, name: string): string {
  const key = `planets.${name}` as TranslationKey;
  const label = t(key);
  return label === key ? name : label;
}

export function signName(t: TFunction, sign: string): string {
  const key = `signs.${sign}` as TranslationKey;
  const label = t(key);
  return label === key ? sign : label;
}

interface WishChartCardProps {
  dto: CreateBirthProfileDto;
  area: LifeArea;
  /** The house stored with the wish (wins over the area's default). */
  natalHouse?: number | null;
}

/**
 * Where the wish lives in the natal chart: its house and what that house is
 * about, the sign on its cusp, its ruler and any planets inside. Tapping it
 * opens the chart on that sign — Aster opens the door, the chart stays the hero.
 */
export function WishChartCard({ dto, area, natalHouse }: WishChartCardProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const areas = useAsync(() => astrologyApi.getLifeAreas(dto), [dto]);
  const ctx = areas.data?.find((a) => a.area === area) ?? null;

  if (areas.loading && !areas.data) {
    return (
      <ChunkyCard>
        <StateView kind="loading" compact />
      </ChunkyCard>
    );
  }
  if (!ctx) {
    return (
      <ChunkyCard>
        <StateView kind="error" compact message={t("wish.detail.chartError")} onAction={areas.reload} />
      </ChunkyCard>
    );
  }

  const house = natalHouse ?? ctx.house;
  const theme = t(`wish.detail.houseThemes.h${house}` as TranslationKey);
  const planets = ctx.planets.map((p) => planetName(t, p)).join(", ");
  const href = (ctx.sign ? `/chart?sign=${encodeURIComponent(ctx.sign)}` : "/chart") as Href;

  return (
    <ChunkyCard
      onPress={() => router.push(href)}
      accessibilityLabel={`${t("wish.detail.chartTitle")}. ${t("wish.detail.chartHouse", { house: houseLabel(t, locale, house), theme })}`}
      accessibilityHint={t("wish.detail.openChart")}
      style={styles.card}
    >
      <View style={styles.head}>
        <View style={styles.badge} importantForAccessibility="no-hide-descendants">
          <AppText variant="stat" color={palette.primary.on}>
            {house}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="label" color={colors.text.accent}>
            {t("wish.detail.chartTitle")}
          </AppText>
          <AppText variant="heading">
            {t("wish.detail.chartHouse", { house: houseLabel(t, locale, house), theme })}
          </AppText>
        </View>
      </View>

      {ctx.sign ? <Line icon="ellipse-outline" text={t("wish.detail.cusp", { sign: signName(t, ctx.sign) })} /> : null}
      {ctx.ruler && ctx.rulerSign && ctx.rulerHouse ? (
        <Line
          icon="planet-outline"
          text={t("wish.detail.ruler", {
            planet: planetName(t, ctx.ruler),
            sign: signName(t, ctx.rulerSign),
            house: houseLabel(t, locale, ctx.rulerHouse),
          })}
        />
      ) : null}
      <Line
        icon="sparkles-outline"
        text={planets ? t("wish.detail.planetsIn", { planets }) : t("wish.detail.noPlanets")}
      />
      {ctx.approximate ? <Line icon="time-outline" text={t("wish.create.approximate")} muted /> : null}

      <View style={styles.link}>
        <AppText variant="heading" color={colors.text.violet}>
          {t("wish.detail.openChart")}
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.text.violet} />
      </View>
    </ChunkyCard>
  );
}

function Line({ icon, text, muted }: { icon: keyof typeof Ionicons.glyphMap; text: string; muted?: boolean }) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={16} color={muted ? colors.text.tertiary : colors.star[300]} />
      <AppText variant="body" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: palette.primary.face,
    borderBottomWidth: 4,
    borderBottomColor: palette.primary.slab,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, minWidth: 0 },
  line: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 32 },
});
