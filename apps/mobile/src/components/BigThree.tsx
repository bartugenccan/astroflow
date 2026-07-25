import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./ui/AppText";
import { Glyph } from "./Glyph";
import { useTranslation } from "../i18n";
import { colors, spacing, radii } from "../lib/design-system";

interface BigThreeProps {
  sunSign: string;
  moonSign: string;
  risingSign: string;
}

/** The Sun / Moon / Rising trio — each a glyph in a thin gold ring + sign name. */
export function BigThree({ sunSign, moonSign, risingSign }: BigThreeProps) {
  const { t } = useTranslation();

  const items = [
    { key: "sun", label: t("bigThree.sun"), sign: sunSign },
    { key: "moon", label: t("bigThree.moon"), sign: moonSign },
    { key: "rising", label: t("bigThree.rising"), sign: risingSign },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.key} style={styles.item}>
          <View style={styles.ring}>
            <Glyph name={item.sign} size={28} color={colors.gold[300]} />
          </View>
          <AppText variant="label" color={colors.text.tertiary} style={styles.label}>
            {item.label}
          </AppText>
          <AppText variant="bodySmall" color={colors.text.primary}>
            {t(`signs.${item.sign}` as "signs.Aries")}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  ring: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    backgroundColor: colors.ink[900],
  },
  label: {
    marginTop: spacing.xs,
  },
});
