import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "./ui/AppText";
import { Glyph } from "./Glyph";
import { TermInfo } from "./TermInfo";
import { useTranslation } from "../i18n";
import { colors, spacing, radii, motion } from "../lib/design-system";

interface BigThreeProps {
  sunSign: string;
  moonSign: string;
  risingSign: string;
  /** Show the glossary ⓘ beside each label (off for captured/static contexts). */
  showInfo?: boolean;
  /** Pop the three rings in one after another on mount. */
  animate?: boolean;
}

type ItemKey = "sun" | "moon" | "rising";

/** The Sun / Moon / Rising trio — each a glyph in a thin gold ring + sign name. */
export function BigThree({
  sunSign,
  moonSign,
  risingSign,
  showInfo = true,
  animate = true,
}: BigThreeProps) {
  const { t } = useTranslation();

  const items: { key: ItemKey; label: string; sign: string }[] = [
    { key: "sun", label: t("bigThree.sun"), sign: sunSign },
    { key: "moon", label: t("bigThree.moon"), sign: moonSign },
    { key: "rising", label: t("bigThree.rising"), sign: risingSign },
  ];

  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <View key={item.key} style={styles.item}>
          <PopRing index={i} animate={animate}>
            <Glyph name={item.sign} size={28} color={colors.gold[300]} />
          </PopRing>
          <View style={styles.labelRow}>
            <AppText variant="label" color={colors.text.tertiary} style={styles.label}>
              {item.label}
            </AppText>
            {showInfo ? <TermInfo term={item.key} size={13} /> : null}
          </View>
          <AppText variant="bodySmall" color={colors.text.primary} center>
            {t(`signs.${item.sign}` as "signs.Aries")}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Gold ring that springs from 0.8 → 1 with a staggered fade (reduce-motion: static). */
function PopRing({
  index,
  animate,
  children,
}: {
  index: number;
  animate: boolean;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const still = !animate || reduced;
  const p = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) {
      p.value = 1;
      return;
    }
    p.value = withDelay(120 + index * motion.stagger * 1.5, withSpring(1, motion.spring.mystic));
  }, [still, index, p]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.4),
    transform: [{ scale: 0.8 + p.value * 0.2 }],
  }));

  return <Animated.View style={[styles.ring, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  item: {
    flex: 1,
    minWidth: 0,
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginTop: spacing.xs,
    maxWidth: "100%",
  },
  label: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: "center",
  },
});
