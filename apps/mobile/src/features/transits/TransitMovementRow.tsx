import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { BouncyButton } from "../../components/ui/BouncyButton";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { astrologyApi } from "../../services/astrologyApi";
import { transitKey } from "../../services/interpretationCache";
import {
  CreateBirthProfileDto,
  TransitMovement,
  TransitDetail,
} from "../../services/types";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useTranslation, Locale } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";
import { formatDuration } from "./formatDuration";

interface Props {
  dto: CreateBirthProfileDto;
  movement: TransitMovement;
  date: string;
  locale: Locale;
}

const natureColor = (nature: string): string =>
  nature === "harmonic"
    ? colors.gold[300]
    : nature === "challenging"
      ? colors.moon
      : colors.text.tertiary;

/** One expandable transiting-planet card. Header renders from the report;
 *  the AI reading is fetched lazily on first open, then kept mounted. */
export function TransitMovementRow({ dto, movement, date, locale }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const planetName = t(`planets.${movement.planet}` as "planets.Sun");
  const signName = t(`signs.${movement.sign}` as "signs.Aries");
  const houseLabel = ordinalHouse(movement.natalHouse, locale);

  const toggle = () => {
    setOpen((o) => !o);
    setHasOpened(true);
  };

  return (
    <View style={styles.wrap}>
      <BouncyButton onPress={toggle} scaleTo={0.99}>
        <View style={styles.header}>
          <Glyph name={movement.planet} size={24} color={colors.gold[200]} />
          <View style={styles.meta}>
            <AppText variant="heading" color={colors.text.primary} numberOfLines={1}>
              {planetName} · {signName}
              {movement.retrograde ? ` · ${t("transits.retrograde")}` : ""}
            </AppText>
            <AppText variant="bodySmall" numberOfLines={1}>
              {t("transits.throughHouse", { h: houseLabel })} ·{" "}
              {t("transits.remaining", { d: formatDuration(movement.daysInHouse, locale) })}
            </AppText>
          </View>
          <View style={styles.dots}>
            {movement.aspects.slice(0, 4).map((a, i) => (
              <View
                key={`${a.natalPlanet}-${a.aspect}-${i}`}
                style={[styles.dot, { backgroundColor: natureColor(a.nature) }]}
              />
            ))}
          </View>
        </View>
      </BouncyButton>

      {hasOpened ? (
        <View style={open ? undefined : styles.hidden}>
          <TransitReading dto={dto} movement={movement} date={date} locale={locale} />
        </View>
      ) : null}
    </View>
  );
}

function TransitReading({ dto, movement, date, locale }: Props) {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useCachedAsync<TransitDetail>(
    transitKey(dto, movement.planet, date, locale),
    () => astrologyApi.getTransitDetail(dto, movement.planet, locale),
  );

  return (
    <View style={styles.body}>
      {/* Aspects to the natal chart — from the report, instant. */}
      {movement.aspects.length > 0 ? (
        <View style={styles.aspectsBlock}>
          <AppText variant="label" color={colors.text.tertiary}>
            {t("transits.aspectsLabel")}
          </AppText>
          {movement.aspects.map((a, i) => (
            <View key={`${a.natalPlanet}-${a.aspect}-${i}`} style={styles.aspectRow}>
              <Glyph name={movement.planet} size={14} color={colors.gold[200]} />
              <Glyph name={a.aspect} size={13} color={natureColor(a.nature)} />
              <Glyph name={a.natalPlanet} size={14} color={colors.moon} />
              <AppText variant="bodySmall" color={colors.text.tertiary}>
                {t(`planets.${a.natalPlanet}` as "planets.Sun")} · {a.orb.toFixed(1)}°
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <AppText variant="bodySmall" color={colors.text.tertiary}>
          {t("transits.noAspects")}
        </AppText>
      )}

      {loading ? (
        <ShimmerLines lines={4} />
      ) : error ? (
        <BouncyButton onPress={reload} haptic={false}>
          <AppText variant="body" color={colors.gold[300]}>
            {t("reading.retry")}
          </AppText>
        </BouncyButton>
      ) : (
        <MotiView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 260 }}
        >
          <AppText variant="serifBody">{data?.text}</AppText>
        </MotiView>
      )}
    </View>
  );
}

function ordinalHouse(n: number, locale: Locale): string {
  if (locale === "tr") return `${n}.`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  dots: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  body: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  aspectsBlock: {
    gap: spacing.xs,
  },
  aspectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  hidden: {
    height: 0,
    overflow: "hidden",
    opacity: 0,
  },
});
