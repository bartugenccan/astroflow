import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { AppText } from "./ui/AppText";
import { colors, fonts } from "../lib/design-system";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreRingProps {
  score: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  animate?: boolean;
}

/**
 * Animated gold arc ring showing a 0-100 score. Sweeps from empty to the score
 * on mount. Reused by compatibility (and any future scored surface).
 */
export function ScoreRing({
  score,
  size = 160,
  stroke = 10,
  label,
  animate = true,
}: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const progress = useSharedValue(animate ? 0 : clamped / 100);

  useEffect(() => {
    if (animate) {
      progress.value = withTiming(clamped / 100, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = clamped / 100;
    }
  }, [clamped, animate, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="scoreRingGold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.gold[300]} />
            <Stop offset="1" stopColor={colors.gold[500]} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={colors.border.hairlineStrong}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke="url(#scoreRingGold)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // start at 12 o'clock
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <AppText
          variant="display"
          style={{ fontFamily: fonts.serif, color: colors.text.primary }}
        >
          {Math.round(clamped)}
        </AppText>
        {label ? (
          <AppText variant="label" color={colors.text.tertiary}>
            {label}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
