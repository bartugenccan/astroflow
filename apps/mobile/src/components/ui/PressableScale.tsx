import React, { useCallback } from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";
import { motion } from "../../lib/design-system";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Scale while held. Large cards use ~0.98, small chips/icons ~0.92. */
  scaleTo?: number;
  /** Haptic on press: selection tick (default), light impact, or none. */
  haptic?: "selection" | "light" | "none";
  children?: React.ReactNode;
}

/**
 * Drop-in replacement for a bare `Pressable`: springs down while held, dims a
 * touch, and ticks a haptic on release. It's a plain Pressable underneath (not
 * a gesture-handler Tap), so it nests safely inside ScrollViews and sheets and
 * keeps accessibility roles/labels working.
 */
export function PressableScale({
  style,
  scaleTo = 0.96,
  haptic = "selection",
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const handleIn = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = withSpring(1, motion.spring.snappy);
      onPressIn?.(e);
    },
    [onPressIn, pressed],
  );
  const handleOut = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = withSpring(0, motion.spring.snappy);
      onPressOut?.(e);
    },
    [onPressOut, pressed],
  );
  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (haptic === "selection") Haptics.selectionAsync().catch(() => {});
      else if (haptic === "light")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress?.(e);
    },
    [haptic, onPress],
  );

  const animStyle = useAnimatedStyle(() => ({
    opacity: (disabled ? 0.5 : 1) * (1 - pressed.value * 0.12),
    transform: [{ scale: reduced ? 1 : 1 - pressed.value * (1 - scaleTo) }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handleIn}
      onPressOut={handleOut}
      onPress={handlePress}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
