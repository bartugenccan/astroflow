import React, { useEffect } from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { colors, radii, motion } from "../../lib/design-system";

interface ScoreBarProps {
  /** 0-100. */
  value: number;
  delay?: number;
  color?: string;
  height?: number;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Thin 0-100 fill that eases in from empty (and glides between values when
 * the score changes, e.g. switching life area). Reduce-motion snaps it.
 */
export function ScoreBar({
  value,
  delay = 0,
  color = colors.gold[300],
  height = 4,
  trackColor = colors.border.hairline,
  style,
}: ScoreBarProps) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const fill = useSharedValue(reduced ? clamped : 0);

  useEffect(() => {
    fill.value = reduced
      ? clamped
      : withDelay(
          delay,
          withTiming(clamped, {
            duration: motion.duration.slow,
            easing: Easing.out(Easing.cubic),
          }),
        );
  }, [clamped, delay, reduced, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value}%`,
  }));

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }, style]}
    >
      <Animated.View
        style={[styles.fill, { borderRadius: height / 2, backgroundColor: color }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
    borderRadius: radii.pill,
  },
  fill: {
    height: "100%",
  },
});
