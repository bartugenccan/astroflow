import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { BouncyButton } from "../../components/ui/BouncyButton";
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
import { useTranslation, Locale } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

interface Props {
  dto: CreateBirthProfileDto;
  house: HousePlacement;
  locale: Locale;
}

/** One expandable house card. Header renders from chart data; the AI reading
 *  is fetched lazily the first time the card is opened, then kept mounted. */
export function HouseRow({ dto, house, locale }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const rulerName = t(`planets.${house.ruler}` as "planets.Sun");
  const signName = t(`signs.${house.sign}` as "signs.Aries");
  const isEmpty = house.planetsInHouse.length === 0;
  const primaryTag = primaryHouseTag(locale, house.house);

  const toggle = () => {
    setOpen((o) => !o);
    setHasOpened(true);
  };

  return (
    <View style={styles.wrap}>
      <BouncyButton onPress={toggle} scaleTo={0.99}>
        <View style={styles.header}>
          <View style={styles.num}>
            <AppText variant="numeric" color={colors.gold[300]}>
              {house.house}
            </AppText>
          </View>
          <Glyph name={house.sign} size={20} color={colors.gold[200]} />
          <View style={styles.meta}>
            <AppText variant="heading" color={colors.text.primary}>
              {t("reading.house", { n: house.house })} · {signName}
            </AppText>
            <AppText variant="bodySmall" numberOfLines={1}>
              {t("reading.rulerLabel")}: {rulerName}
            </AppText>
          </View>
          <View style={styles.right}>
            {primaryTag ? (
              <View style={styles.tag}>
                <AppText variant="label" color={colors.gold[300]}>
                  {primaryTag}
                </AppText>
              </View>
            ) : null}
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
          </View>
        </View>
      </BouncyButton>

      {hasOpened ? (
        <View style={open ? undefined : styles.hidden}>
          <HouseReading dto={dto} house={house.house} locale={locale} />
        </View>
      ) : null}
    </View>
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
  },
  right: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  tag: {
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
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  hidden: {
    height: 0,
    overflow: "hidden",
    opacity: 0,
  },
});
