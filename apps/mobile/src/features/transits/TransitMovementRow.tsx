import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "../../components/ui/PressableScale";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { TermInfo } from "../../components/TermInfo";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { EnterView } from "../../lib/motion";
import { astrologyApi } from "../../services/astrologyApi";
import { transitKey } from "../../services/interpretationCache";
import {
  CreateBirthProfileDto,
  TransitMovement,
  TransitDetail,
} from "../../services/types";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { aspectPhrase, aspectStrength, houseLabel } from "../../lib/astroLanguage";
import { useTranslation, Locale } from "../../i18n";
import { colors, spacing, radii, motion } from "../../lib/design-system";
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

/** Layout spring for rows that grow/shrink (and their siblings sliding along). */
export const rowLayoutTransition = LinearTransition.springify()
  .damping(motion.spring.gentle.damping)
  .stiffness(motion.spring.gentle.stiffness)
  .mass(motion.spring.gentle.mass);

/** One expandable transiting-planet card. Header renders from the report;
 *  the AI reading is fetched lazily on first open (and stays in the cache). */
export function TransitMovementRow({ dto, movement, date, locale }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  const planetName = t(`planets.${movement.planet}` as "planets.Sun");
  const signName = t(`signs.${movement.sign}` as "signs.Aries");
  const houseText = houseLabel(t, locale, movement.natalHouse);

  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = reduced ? (open ? 1 : 0) : withSpring(open ? 1 : 0, motion.spring.snappy);
  }, [open, reduced, rot]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 180}deg` }],
  }));

  return (
    <Animated.View
      style={styles.wrap}
      layout={reduced ? undefined : rowLayoutTransition}
    >
      <PressableScale
        onPress={() => setOpen((o) => !o)}
        scaleTo={0.98}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Glyph name={movement.planet} size={24} color={colors.gold[200]} />
        <View style={styles.meta}>
          <View style={styles.titleLine}>
            <AppText
              variant="heading"
              color={colors.text.primary}
              numberOfLines={2}
              style={styles.titleText}
            >
              {planetName} · {signName}
            </AppText>
            {movement.retrograde ? (
              <View
                style={styles.rxPill}
                accessible
                accessibilityLabel={t("transits.retrogradeA11y")}
              >
                <Glyph name="Retrograde" size={11} color={colors.moon} />
              </View>
            ) : null}
          </View>
          <AppText variant="bodySmall" numberOfLines={2}>
            {t("transits.throughHouse", { h: houseText })} ·{" "}
            {t("transits.remaining", { d: formatDuration(movement.daysInHouse, locale) })}
          </AppText>
        </View>
        <View style={styles.side}>
          <View style={styles.dots}>
            {movement.aspects.slice(0, 4).map((a, i) => (
              <View
                key={`${a.natalPlanet}-${a.aspect}-${i}`}
                style={[styles.dot, { backgroundColor: natureColor(a.nature) }]}
              />
            ))}
          </View>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={16} color={colors.text.tertiary} />
          </Animated.View>
        </View>
      </PressableScale>

      {open ? (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(motion.duration.base)}
          exiting={reduced ? undefined : FadeOut.duration(motion.duration.fast)}
        >
          <TransitReading dto={dto} movement={movement} date={date} locale={locale} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function TransitReading({ dto, movement, date, locale }: Props) {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useCachedAsync<TransitDetail>(
    transitKey(dto, movement.planet, date, locale),
    () => astrologyApi.getTransitDetail(dto, movement.planet, locale),
  );
  const planetName = t(`planets.${movement.planet}` as "planets.Sun");

  return (
    <View style={styles.body}>
      {movement.retrograde ? (
        <View style={styles.rxHint}>
          <View style={styles.rxPill}>
            <Glyph name="Retrograde" size={11} color={colors.moon} />
          </View>
          <AppText variant="bodySmall" color={colors.text.secondary} style={styles.flexText}>
            {t("astro.retrogradeHint")}
          </AppText>
          <TermInfo term="retrograde" size={14} />
        </View>
      ) : null}

      {/* Aspects to the natal chart — from the report, instant. */}
      {movement.aspects.length > 0 ? (
        <View style={styles.aspectsBlock}>
          <View style={styles.labelRow}>
            <AppText variant="labelLong" color={colors.text.tertiary} style={styles.flexText}>
              {t("transits.aspectsLabel")}
            </AppText>
            <TermInfo term="aspect" size={14} />
          </View>
          {movement.aspects.map((a, i) => {
            const natal = t(`planets.${a.natalPlanet}` as "planets.Sun");
            return (
              <View key={`${a.natalPlanet}-${a.aspect}-${i}`} style={styles.aspectRow}>
                <View style={styles.aspectGlyphs}>
                  <Glyph name={movement.planet} size={14} color={colors.gold[200]} />
                  <Glyph name={a.aspect} size={13} color={natureColor(a.nature)} />
                  <Glyph name={a.natalPlanet} size={14} color={colors.moon} />
                </View>
                <View style={styles.flexText}>
                  <AppText variant="bodySmall" color={colors.text.secondary}>
                    {aspectPhrase(t, a.aspect, planetName, natal)}
                  </AppText>
                  <AppText variant="bodySmall" color={colors.text.tertiary}>
                    {aspectStrength(t, a.orb)} · {Math.abs(a.orb).toFixed(1)}°
                  </AppText>
                </View>
              </View>
            );
          })}
          <View style={styles.labelRow}>
            <AppText variant="bodySmall" color={colors.text.tertiary} style={styles.flexText}>
              {t("transits.orbHint")}
            </AppText>
            <TermInfo term="orb" size={14} />
          </View>
        </View>
      ) : (
        <AppText variant="bodySmall" color={colors.text.tertiary}>
          {t("transits.noAspects")}
        </AppText>
      )}

      {loading ? (
        <ShimmerLines lines={4} />
      ) : error ? (
        <PressableScale onPress={reload} haptic="none" style={styles.retry}>
          <Ionicons name="refresh" size={16} color={colors.gold[300]} />
          <AppText variant="body" color={colors.gold[300]}>
            {t("reading.retry")}
          </AppText>
        </PressableScale>
      ) : (
        <EnterView distance={6}>
          <AppText variant="serifBody">{data?.text}</AppText>
        </EnterView>
      )}
    </View>
  );
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
    gap: 2,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  titleText: {
    flexShrink: 1,
    minWidth: 0,
  },
  rxPill: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.moon,
  },
  side: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  dots: {
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
  rxHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  aspectsBlock: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  aspectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  aspectGlyphs: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },
  flexText: {
    flex: 1,
    minWidth: 0,
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
