import React, { useCallback } from "react";
import { StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";

/** Where a focus transition starts — deliberately never fully transparent. */
const FROM_OPACITY = 0.55;
const FROM_Y = 6;

/**
 * Soft entrance each time a tab comes into focus: content eases from 55%
 * opacity and a few px low into place. It replaces the navigator's own fade,
 * which could stall at opacity 0 and leave a tab black; starting at 0.55 means
 * the content is always visible even if the animation is cut short.
 */
export function FocusFade({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      if (reduced) {
        p.value = 1;
        return;
      }
      p.value = 0;
      p.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    }, [reduced, p]),
  );

  const style = useAnimatedStyle(() => ({
    opacity: FROM_OPACITY + (1 - FROM_OPACITY) * p.value,
    transform: [{ translateY: (1 - p.value) * FROM_Y }],
  }));

  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
