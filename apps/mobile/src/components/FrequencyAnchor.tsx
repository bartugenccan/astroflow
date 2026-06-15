import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import {
  Canvas,
  Circle,
  RadialGradient,
  vec,
  BlurMask,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "../lib/design-system";
import { EnergyState } from "@astroflow/shared";

interface FrequencyAnchorProps {
  state: EnergyState;
  size?: number;
}

const glowColors: Record<EnergyState, string> = {
  [EnergyState.Harmony]: colors.state.harmony,
  [EnergyState.Momentum]: colors.state.momentum,
  [EnergyState.Stress]: colors.state.stress,
  [EnergyState.Overload]: colors.state.overload,
};

export function FrequencyAnchor({ state, size = 200 }: FrequencyAnchorProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const center = size / 2;
  const color = glowColors[state];
  const innerRadius = size * 0.2;
  const midRadius = size * 0.3;
  const outerRadius = size * 0.42;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Outer glow */}
        <Circle cx={center} cy={center} r={outerRadius + 30} opacity={0.15}>
          <RadialGradient
            c={vec(center, center)}
            r={outerRadius + 30}
            colors={[color, "transparent"]}
          />
        </Circle>

        {/* Mid glow ring */}
        <Circle cx={center} cy={center} r={midRadius + 15} opacity={0.3}>
          <RadialGradient
            c={vec(center, center)}
            r={midRadius + 15}
            colors={[color, "transparent"]}
          />
          <BlurMask blur={12} style="normal" />
        </Circle>

        {/* Outer ring */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          color={color}
          opacity={0.2}
          style="stroke"
          strokeWidth={2}
        >
          <BlurMask blur={4} style="normal" />
        </Circle>

        {/* Mid ring */}
        <Circle
          cx={center}
          cy={center}
          r={midRadius}
          color={color}
          opacity={0.4}
          style="stroke"
          strokeWidth={1.5}
        />

        {/* Inner core */}
        <Circle cx={center} cy={center} r={innerRadius} opacity={0.9}>
          <RadialGradient
            c={vec(center, center)}
            r={innerRadius}
            colors={[color, `${color}44`]}
          />
          <BlurMask blur={6} style="normal" />
        </Circle>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
