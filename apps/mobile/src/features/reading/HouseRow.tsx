import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { PressableScale } from "../../components/ui/PressableScale";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { astrologyApi } from "../../services/astrologyApi";
import { houseKey } from "../../services/interpretationCache";
import { houseTags, primaryHouseTag } from "./houseThemes";
import {
  CreateBirthProfileDto,
  HousePlacement,
  HouseInterpretation,
} from "../../services/types";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { houseLabel } from "../../lib/astroLanguage";
import { useTranslation, Locale } from "../../i18n";
import { colors, spacing, motion } from "../../lib/design-system";

interface Props {
  dto: CreateBirthProfileDto;
  house: HousePlacement;
  locale: Locale;
}

/** Shared expand/collapse motion for the reading's accordion rows. */
export function useExpandMotion(open: boolean) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    progress.value = reduced ? (open ? 1 : 0) : withSpring(open ? 1 : 0, motion.spring.snappy);
  }, [open, reduced, progress]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return {
    chevronStyle,
    layout: reduced ? undefined : LinearTransition.springify()
      .damping(motion.spring.gentle.damping)
      .stiffness(motion.spring.gentle.stiffness),
    entering: reduced ? undefined : FadeInDown.duration(motion.duration.base),
    exiting: reduced ? undefined : FadeOut.duration(motion.duration.fast),
  };
}

/** One expandable house card. Header renders from chart data; the AI reading
 *  is fetched (or read from the warm cache) when the card is opened. */
export function HouseRow({ dto, house, locale }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { chevronStyle, layout, entering, exiting } = useExpandMotion(open);

  const rulerName = t(`planets.${house.ruler}` as "planets.Sun");
  const signName = t(`signs.${house.sign}` as "signs.Aries");
  const isEmpty = house.planetsInHouse.length === 0;
  const primaryTag = primaryHouseTag(locale, house.house);

  return (
    <Animated.View layout={layout} style={styles.wrap}>
      <PressableScale
        onPress={() => setOpen((o) => !o)}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.header}>
          <View style={styles.num}>
            <AppText variant="numeric" color={colors.gold[300]}>
              {house.house}
            </AppText>
          </View>
          <Glyph name={house.sign} size={20} color={colors.gold[200]} />
          <View style={styles.meta}>
            <AppText variant="heading" color={colors.text.primary}>
              {houseLabel(t, locale, house.house)} · {signName}
            </AppText>
            {primaryTag ? (
              <View style={styles.tag}>
                <AppText variant="label" color={colors.gold[300]}>
                  {primaryTag}
                </AppText>
              </View>
            ) : null}
            <AppText variant="bodySmall">
              {t("reading.rulerLabel")}: {rulerName}
            </AppText>
          </View>
          <View style={styles.right}>
            <View style={styles.planetGlyphs}>
              {isEmpty ? (
                <AppText variant="bodySmall" color={colors.text.tertiary}>
                  {t("reading.emptyHouse")}
                </AppText>
              ) : (
                house.planetsInHouse
                  .slice(0, 4)
                  .map((p) => (
                    <Glyph key={p} name={p} size={15} color={colors.moon} />
                  ))
              )}
            </View>
            <Animated.View style={chevronStyle}>
              <Ionicons name="chevron-down" size={16} color={colors.text.tertiary} />
            </Animated.View>
          </View>
        </View>
      </PressableScale>

      {open ? (
        <Animated.View entering={entering} exiting={exiting}>
          <HouseReading dto={dto} house={house.house} locale={locale} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function HouseReading({
  dto,
  house,
  locale,
}: {
  dto: CreateBirthProfileDto;
  house: number;
  locale: Locale;
}) {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useCachedAsync<HouseInterpretation>(
    houseKey(dto, house, locale),
    () => astrologyApi.getHouseInterpretation(dto, house, locale),
  );

  const tags = houseTags(locale, house);

  return (
    <View style={styles.body}>
      {/* Full theme set — wraps to as many rows as needed. */}
      {tags.length > 0 ? (
        <View style={styles.themesBlock}>
          <AppText variant="label" color={colors.text.tertiary}>
            {t("reading.themesLabel")}
          </AppText>
          <View style={styles.themesRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.themeChip}>
                <AppText variant="label" color={colors.gold[300]}>
                  {tag}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {loading ? (
        <ShimmerLines lines={4} />
      ) : error ? (
        <PressableScale
          onPress={reload}
          haptic="none"
          style={styles.retry}
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color={colors.gold[300]} />
          <AppText variant="body" color={colors.gold[300]}>
            {t("reading.retry")}
          </AppText>
        </PressableScale>
      ) : (
        <AppText variant="serifBody">{data?.text}</AppText>
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
  num: {
    width: 22,
    alignItems: "center",
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  right: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  tag: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  planetGlyphs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  body: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  themesBlock: {
    gap: spacing.sm,
  },
  themesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  themeChip: {
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
