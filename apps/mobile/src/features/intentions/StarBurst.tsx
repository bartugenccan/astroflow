import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  useReducedMotion,
  SharedValue,
} from "react-native-reanimated";
import { colors } from "../../lib/design-system";

const DURATION = 720;

interface StarBurstProps {
  /** Change this to replay the burst (e.g. a counter bumped on each completion). */
  playKey: number;
  /** Number of stars in the ring. */
  count?: number;
  /** How far (px) the stars travel from the centre. */
  radius?: number;
  /** Multiplies each star's size — the tab bar uses small ones (~0.55). */
  starScale?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A small celebratory scatter of gold stars that fly out from the centre and
 * fade — played once per `playKey`. It's absolutely positioned and ignores
 * touches, so drop it over whatever just "completed". With reduce-motion on,
 * the stars simply fade in place instead of travelling.
 */
export function StarBurst({
  playKey,
  count = 10,
  radius = 64,
  starScale = 1,
  style,
}: StarBurstProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  // Deterministic-but-irregular spread so it reads organic, not a clock face.
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const jitter = ((i * 37) % 11) / 11 - 0.5;
        return {
          angle: (i / count) * Math.PI * 2 + jitter * 0.5,
          dist: radius * (0.7 + (((i * 53) % 7) / 7) * 0.45),
          size: Math.max(4, Math.round((9 + ((i * 29) % 3) * 3) * starScale)),
          lag: ((i * 17) % 5) * 0.03,
        };
      }),
    [count, radius, starScale],
  );

  useEffect(() => {
    if (playKey <= 0) return;
    progress.value = 0;
    progress.value = withDelay(
      60,
      withTiming(1, {
        duration: reduced ? 500 : DURATION,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [playKey, reduced, progress]);

  if (playKey <= 0) return null;

  return (
    <View pointerEvents="none" style={[styles.layer, style]}>
      {stars.map((s, i) => (
        <Star key={`${playKey}-${i}`} progress={progress} reduced={reduced} {...s} />
      ))}
    </View>
  );
}

function Star({
  progress,
  reduced,
  angle,
  dist,
  size,
  lag,
}: {
  progress: SharedValue<number>;
  reduced: boolean;
  angle: number;
  dist: number;
  size: number;
  lag: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (progress.value - lag) / (1 - lag)));
    const travel = reduced ? 0.75 : p;
    const opacity = reduced
      ? interpolate(p, [0, 0.3, 1], [0, 1, 0])
      : interpolate(p, [0, 0.15, 0.6, 1], [0, 1, 0.9, 0]);
    return {
      opacity,
      transform: [
        { translateX: Math.cos(angle) * dist * travel },
        { translateY: Math.sin(angle) * dist * travel },
        { scale: reduced ? 1 : interpolate(p, [0, 0.3, 1], [0.3, 1.1, 0.6]) },
        { rotate: `${reduced ? 0 : p * 140}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.star, style]}>
      <Ionicons name="star" size={size} color={colors.gold[200]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  star: {
    position: "absolute",
  },
});
