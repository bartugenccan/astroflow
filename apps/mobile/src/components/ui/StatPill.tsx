import React, { useEffect, useRef } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { motion, palette, spacing, Tone } from "../../lib/design-system";

interface StatPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  tone?: Tone;
  /** Spoken label, e.g. "7 day streak". */
  accessibilityLabel: string;
  /** Dim when the stat is "off" (streak at 0, energy empty). */
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Compact icon + number counter (streak flame, Yıldız Tozu, Işık). Pops when it grows. */
export function StatPill({
  icon,
  value,
  tone = "star",
  accessibilityLabel,
  muted,
  style,
}: StatPillProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const prev = useRef(value);
  const p = palette[tone];

  useEffect(() => {
    const grew =
      typeof value === "number" && typeof prev.current === "number" && value > prev.current;
    prev.current = value;
    if (grew && !reduced) {
      scale.value = withSequence(
        withSpring(1.25, motion.spring.bouncy),
        withSpring(1, motion.spring.snappy),
      );
    }
  }, [value, reduced, scale]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[styles.pill, anim, muted && styles.muted, style]}
    >
      <Ionicons name={icon} size={18} color={p.face} />
      <AppText variant="heading" color={p.face} style={styles.value}>
        {String(value)}
      </AppText>
    </Animated.View>
  );
}

export function StatRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    minHeight: 32,
  },
  value: { fontSize: 16 },
  muted: { opacity: 0.45 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
