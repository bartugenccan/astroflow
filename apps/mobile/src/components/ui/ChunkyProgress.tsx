import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors, motion, palette, surface, Tone } from "../../lib/design-system";

interface ChunkyProgressProps {
  /** 0 → 1 */
  value: number;
  tone?: Tone;
  height?: number;
  /** Split the bar into N segments (e.g. a daily target of 3 check-ins). */
  segments?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Duolingo-style fat progress bar: a dark track, a candy fill with a glossy
 * highlight stripe, springing to its new value.
 */
export function ChunkyProgress({
  value,
  tone = "star",
  height = 16,
  segments,
  style,
  accessibilityLabel,
}: ChunkyProgressProps) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  const fill = useSharedValue(reduced ? clamped : 0);
  const p = palette[tone];

  useEffect(() => {
    fill.value = reduced ? clamped : withSpring(clamped, motion.spring.gentle);
  }, [clamped, reduced, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  if (segments && segments > 1) {
    const done = Math.round(clamped * segments);
    return (
      <View
        style={[styles.segRow, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: segments, now: done }}
      >
        {Array.from({ length: segments }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { height, borderRadius: height / 2 },
              { backgroundColor: i < done ? p.face : surface.slab },
            ]}
          >
            {i < done ? (
              <View style={[styles.gloss, { height: height * 0.28, borderRadius: height }]} />
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: p.face, borderRadius: height / 2 }, fillStyle]}
      >
        <View style={[styles.gloss, { height: height * 0.28, borderRadius: height }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: surface.slab,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    overflow: "hidden",
  },
  gloss: {
    position: "absolute",
    top: 3,
    left: 8,
    right: 8,
    backgroundColor: colors.overlay.gloss,
  },
  segRow: { flexDirection: "row", gap: 6 },
  segment: { flex: 1, overflow: "hidden" },
});
