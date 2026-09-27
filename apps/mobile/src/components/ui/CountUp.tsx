import React, { useEffect, useState } from "react";
import { TextStyle, StyleProp } from "react-native";
import {
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
  useAnimatedReaction,
  runOnJS,
  useReducedMotion,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { typography } from "../../lib/design-system";

interface CountUpProps {
  value: number;
  animate?: boolean;
  delay?: number;
  duration?: number;
  variant?: keyof typeof typography;
  color?: string;
  style?: StyleProp<TextStyle>;
  suffix?: string;
}

/**
 * A number that counts up to its value. Driven on the UI thread and only
 * re-renders when the displayed integer changes, so it stays cheap even when
 * several run at once (compatibility bars, streaks, the birthday countdown).
 */
export function CountUp({
  value,
  animate = true,
  delay = 0,
  duration = 1100,
  variant = "heading",
  color,
  style,
  suffix = "",
}: CountUpProps) {
  const reduced = useReducedMotion();
  const skip = !animate || reduced;
  const v = useSharedValue(skip ? value : 0);
  const [shown, setShown] = useState(skip ? value : 0);

  useEffect(() => {
    if (skip) {
      v.value = value;
      setShown(value);
      return;
    }
    v.value = withDelay(delay, withTiming(value, { duration, easing: Easing.out(Easing.cubic) }));
  }, [value, skip, delay, duration, v]);

  useAnimatedReaction(
    () => Math.round(v.value),
    (cur, prev) => {
      if (cur !== prev) runOnJS(setShown)(cur);
    },
  );

  return (
    <AppText variant={variant} color={color} style={style}>
      {shown}
      {suffix}
    </AppText>
  );
}
