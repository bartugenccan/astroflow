import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../lib/design-system";

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  total: number;
  current: number; // 0-based index of the active step
}

const NODE_GAP = 46;
const R = 4;

/** Onboarding step indicator: stars connected by lines that light as steps complete. */
export function ConstellationProgress({ total, current }: Props) {
  const width = (total - 1) * NODE_GAP + R * 2 + 8;
  const cy = 12;
  const progress = useDerivedValue(() =>
    withTiming(current, { duration: 400 }),
  );

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={24}>
        {Array.from({ length: total - 1 }).map((_, i) => (
          <SegmentLine key={`seg-${i}`} index={i} cy={cy} progress={progress} />
        ))}
        {Array.from({ length: total }).map((_, i) => (
          <Node key={`node-${i}`} index={i} cy={cy} progress={progress} />
        ))}
      </Svg>
    </View>
  );
}

function SegmentLine({
  index,
  cy,
  progress,
}: {
  index: number;
  cy: number;
  progress: { value: number };
}) {
  const x1 = R + 4 + index * NODE_GAP;
  const x2 = x1 + NODE_GAP;
  const animatedProps = useAnimatedProps(() => ({
    opacity: progress.value > index ? 0.7 : 0.12,
  }));
  return (
    <AnimatedLine
      x1={x1}
      y1={cy}
      x2={x2}
      y2={cy}
      stroke={colors.gold[300]}
      strokeWidth={0.8}
      animatedProps={animatedProps}
    />
  );
}

function Node({
  index,
  cy,
  progress,
}: {
  index: number;
  cy: number;
  progress: { value: number };
}) {
  const cx = R + 4 + index * NODE_GAP;
  const animatedProps = useAnimatedProps(() => {
    const active = progress.value >= index;
    return {
      r: active ? R : R - 1.2,
      opacity: active ? 1 : 0.3,
    };
  });
  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      fill={colors.gold[300]}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
});
