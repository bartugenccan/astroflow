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

/** How far below its place a tab starts when it comes into focus. */
const FROM_Y = 6;

/**
 * Soft entrance each time a tab comes into focus: content settles a few px
 * up into place. Transform only — an opacity below 1 on the whole tab made iOS
 * composite the entire screen offscreen for every frame of the switch. The
 * content is fully visible from the first frame, so a cut-short animation can
 * never leave a tab blank.
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
    transform: [{ translateY: (1 - p.value) * FROM_Y }],
  }));

  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
