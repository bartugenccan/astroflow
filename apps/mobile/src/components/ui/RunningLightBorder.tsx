import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { BlurMask, Canvas, RoundedRect, SweepGradient, vec } from "@shopify/react-native-skia";
import { colors, radii } from "../../lib/design-system";

/** How far the glow may spill past the card edge. */
const BLEED = 10;

const RING_COLORS = [
  "rgba(150,118,47,0.15)",
  "rgba(247,240,221,0.95)",
  colors.gold[400],
  "rgba(150,118,47,0.15)",
  "rgba(150,118,47,0.15)",
];

interface Props {
  children: React.ReactNode;
  /** Faster lap and a stronger glow — for "this needs you now". */
  intense?: boolean;
  radius?: number;
  /** Style of the inner card (background, padding…). It sits 1.5pt inside the light. */
  cardStyle?: StyleProp<ViewStyle>;
}

/**
 * The headline-feature frame: a gold light runs around the card's border
 * forever (a Skia sweep gradient on a rounded-rect stroke, plus a soft glow
 * that follows it). Holds still at a fixed angle under Reduce Motion.
 */
export function RunningLightBorder({ children, intense = false, radius = radii.lg, cardStyle }: Props) {
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const angle = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(angle);
      angle.value = Math.PI / 4;
      return;
    }
    angle.value = 0;
    angle.value = withRepeat(
      withTiming(Math.PI * 2, { duration: intense ? 3200 : 6000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(angle);
  }, [reduced, intense, angle]);
  const shaderTransform = useDerivedValue(() => [{ rotate: angle.value }]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  const cw = size.w + BLEED * 2;
  const ch = size.h + BLEED * 2;
  const center = vec(cw / 2, ch / 2);

  return (
    <View onLayout={onLayout} style={{ borderRadius: radius }}>
      {size.w > 0 ? (
        <Canvas style={[styles.canvas, { width: cw, height: ch }]} pointerEvents="none">
          {/* Soft outer glow that follows the running light */}
          <RoundedRect
            x={BLEED}
            y={BLEED}
            width={size.w}
            height={size.h}
            r={radius}
            style="stroke"
            strokeWidth={intense ? 6 : 4}
            opacity={intense ? 0.75 : 0.5}
          >
            <SweepGradient c={center} colors={RING_COLORS} origin={center} transform={shaderTransform} />
            <BlurMask blur={intense ? 9 : 6} style="normal" />
          </RoundedRect>
          {/* Crisp border */}
          <RoundedRect
            x={BLEED + 0.75}
            y={BLEED + 0.75}
            width={size.w - 1.5}
            height={size.h - 1.5}
            r={radius}
            style="stroke"
            strokeWidth={1.5}
          >
            <SweepGradient c={center} colors={RING_COLORS} origin={center} transform={shaderTransform} />
          </RoundedRect>
        </Canvas>
      ) : null}
      <View style={[styles.card, { borderRadius: radius - 1 }, cardStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: "absolute",
    left: -BLEED,
    top: -BLEED,
  },
  card: {
    margin: 1.5,
    backgroundColor: colors.ink[900],
  },
});
