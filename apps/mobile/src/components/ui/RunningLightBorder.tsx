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
import { Canvas, RoundedRect, SweepGradient, vec } from "@shopify/react-native-skia";
import { colors, radii, surface } from "../../lib/design-system";
import { useScreenActive } from "../ScreenActive";

/** How far the glow may spill past the card edge. */
const BLEED = 10;

const RING_COLORS = [
  colors.glow.ringDim,
  colors.glow.ringBright,
  colors.star[400],
  colors.glow.ringDim,
  colors.glow.ringDim,
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
 * (a Skia sweep gradient on a rounded-rect stroke, plus a soft glow that
 * follows it). Holds still at a fixed angle under Reduce Motion, and rests
 * while its screen or pane isn't the one on view.
 *
 * The glow is two wide, faint strokes rather than a `BlurMask`: a blur under a
 * rotating shader had to be re-rasterised on every frame of the lap.
 */
export function RunningLightBorder({ children, intense = false, radius = radii.lg, cardStyle }: Props) {
  const reduced = useReducedMotion();
  const active = useScreenActive();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const angle = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(angle);
      angle.value = Math.PI / 4;
      return;
    }
    if (!active) {
      // Hold where the light is; resume from here when the screen comes back.
      cancelAnimation(angle);
      return;
    }
    const from = angle.value % (Math.PI * 2);
    angle.value = from;
    angle.value = withRepeat(
      withTiming(from + Math.PI * 2, { duration: intense ? 3200 : 6000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(angle);
  }, [reduced, active, intense, angle]);
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
          {/* Soft outer glow that follows the running light: a wide faint
              halo under a narrower, brighter one. */}
          <RoundedRect
            x={BLEED}
            y={BLEED}
            width={size.w}
            height={size.h}
            r={radius}
            style="stroke"
            strokeWidth={intense ? 14 : 10}
            opacity={intense ? 0.22 : 0.14}
          >
            <SweepGradient c={center} colors={RING_COLORS} origin={center} transform={shaderTransform} />
          </RoundedRect>
          <RoundedRect
            x={BLEED}
            y={BLEED}
            width={size.w}
            height={size.h}
            r={radius}
            style="stroke"
            strokeWidth={intense ? 6 : 4}
            opacity={intense ? 0.5 : 0.32}
          >
            <SweepGradient c={center} colors={RING_COLORS} origin={center} transform={shaderTransform} />
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
    backgroundColor: surface.card,
  },
});
