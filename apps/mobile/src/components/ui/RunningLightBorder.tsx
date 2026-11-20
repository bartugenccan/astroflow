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
import { art, colors, palette, radii, surface, type Tone } from "../../lib/design-system";
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

/** A tone's light: its own colour running, with a white-hot head. */
function ringColors(tone?: Tone): string[] {
  if (!tone) return RING_COLORS;
  const p = palette[tone];
  return [p.soft, p.face, art.sparkle, p.face, p.soft, p.soft];
}

interface Props {
  children: React.ReactNode;
  /** Faster lap and a stronger glow — for "this needs you now". */
  intense?: boolean;
  radius?: number;
  /** The light's colour, from the palette. Without one it runs gold. */
  tone?: Tone;
  /** Style of the inner card (background, padding…). It sits 1.5pt inside the light. */
  cardStyle?: StyleProp<ViewStyle>;
}

/**
 * The light's lap: one turn every 6 s (3.2 s when intense). Holds at a fixed
 * angle under Reduce Motion and rests while its screen isn't the one on view.
 */
function useLap(intense: boolean) {
  const reduced = useReducedMotion();
  const active = useScreenActive();
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
  return useDerivedValue(() => [{ rotate: angle.value }]);
}

/**
 * The same running light, drawn inside a card instead of around it: put it
 * right after the card's backdrop (it fills the card absolutely and ignores
 * touches). The light runs along the inner edge of the card's own border and
 * glows inward, so there is no gap around the card and it moves with the card
 * when it is pressed. `radius` is the card's corner radius.
 */
export function RunningEdgeLight({ tone, radius = radii.xl, intense = false }: { tone?: Tone; radius?: number; intense?: boolean }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const shaderTransform = useLap(intense);
  const ring = ringColors(tone);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };
  // Inside a 2pt border the inner corners are 2pt tighter.
  const r = Math.max(0, radius - 2);
  const center = vec(size.w / 2, size.h / 2);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size.w > 0 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Wide, faint strokes centred on the edge: only their inner half
              shows, as a glow that follows the light into the card. */}
          <RoundedRect x={0} y={0} width={size.w} height={size.h} r={r} style="stroke" strokeWidth={intense ? 18 : 14} opacity={intense ? 0.24 : 0.16}>
            <SweepGradient c={center} colors={ring} origin={center} transform={shaderTransform} />
          </RoundedRect>
          <RoundedRect x={0} y={0} width={size.w} height={size.h} r={r} style="stroke" strokeWidth={6} opacity={intense ? 0.6 : 0.42}>
            <SweepGradient c={center} colors={ring} origin={center} transform={shaderTransform} />
          </RoundedRect>
          {/* The crisp light itself, hugging the border. */}
          <RoundedRect x={1} y={1} width={size.w - 2} height={size.h - 2} r={Math.max(0, r - 1)} style="stroke" strokeWidth={2}>
            <SweepGradient c={center} colors={ring} origin={center} transform={shaderTransform} />
          </RoundedRect>
        </Canvas>
      ) : null}
    </View>
  );
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
export function RunningLightBorder({ children, intense = false, radius = radii.lg, tone, cardStyle }: Props) {
  const ring = ringColors(tone);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const shaderTransform = useLap(intense);

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
            <SweepGradient c={center} colors={ring} origin={center} transform={shaderTransform} />
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
            <SweepGradient c={center} colors={ring} origin={center} transform={shaderTransform} />
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
            <SweepGradient c={center} colors={ring} origin={center} transform={shaderTransform} />
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
