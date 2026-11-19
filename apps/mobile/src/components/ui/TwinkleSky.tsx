import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Canvas, Circle, Group, LinearGradient, Path, Rect, vec } from "@shopify/react-native-skia";
import { art } from "../../lib/design-system";
import { useScreenActive } from "../ScreenActive";

interface Props {
  /** The tone's face colour: it washes in from the top-right corner. */
  color: string;
  /** How many stars (a handful reads as "sky"; more reads as noise). */
  stars?: number;
  /** Seed for the star layout, so one card keeps the same sky between renders. */
  seed?: string;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  /** A four-point sparkle instead of a dot. */
  sparkle: boolean;
}

/** Small deterministic PRNG (mulberry32) from a string seed. */
function rng(seed: string) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.28;
  return `M ${cx} ${cy - r} Q ${cx + k} ${cy - k} ${cx + r} ${cy} Q ${cx + k} ${cy + k} ${cx} ${cy + r} Q ${cx - k} ${cy + k} ${cx - r} ${cy} Q ${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

/**
 * A card backdrop that makes a plain tinted card read as a window onto the
 * night sky: the tone's colour washes in from the top-right and a few stars
 * twinkle. Stars are luminous, so they may shine; the card keeps its hard
 * slab. Fills its parent absolutely (put it first, give the parent
 * `overflow: "hidden"`), ignores touches, holds still under Reduce Motion and
 * rests while its screen is not on view.
 */
export function TwinkleSky({ color, stars = 7, seed = "sky" }: Props) {
  const reduced = useReducedMotion();
  const active = useScreenActive();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const clock = useSharedValue(0);

  useEffect(() => {
    if (reduced || !active) {
      cancelAnimation(clock);
      return;
    }
    const from = clock.value % 1;
    clock.value = from;
    clock.value = withRepeat(withTiming(from + 1, { duration: 5200, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [reduced, active, clock]);

  const field = useMemo<Star[]>(() => {
    if (!size.w || !size.h) return [];
    const rand = rng(seed);
    return Array.from({ length: stars }, (_, i) => {
      // Keep stars off the left column, where the text sits; they live in the right ~45%.
      const x = size.w * (0.55 + rand() * 0.42);
      const y = size.h * (0.08 + rand() * 0.84);
      const sparkle = i % 3 === 0;
      return { x, y, r: sparkle ? 4 + rand() * 3 : 1 + rand() * 1.4, phase: rand(), sparkle };
    });
  }, [size.w, size.h, stars, seed]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size.w > 0 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={size.w} height={size.h}>
            <LinearGradient
              start={vec(size.w, 0)}
              end={vec(size.w * 0.25, size.h)}
              colors={[`${color}59`, `${color}14`, `${color}00`]}
            />
          </Rect>
          {field.map((s, i) => (
            <TwinkleStar key={i} star={s} clock={clock} still={reduced} />
          ))}
        </Canvas>
      ) : null}
    </View>
  );
}

function TwinkleStar({ star, clock, still }: { star: Star; clock: SharedValue<number>; still: boolean }) {
  const opacity = useDerivedValue(() => {
    if (still) return 0.75;
    const wave = 0.5 + 0.5 * Math.sin((clock.value + star.phase) * Math.PI * 2);
    return 0.25 + 0.75 * wave;
  });
  if (star.sparkle) {
    return (
      <Group opacity={opacity}>
        <Circle cx={star.x} cy={star.y} r={star.r * 1.6} color={`${art.sparkle}1F`} />
        <Path path={sparklePath(star.x, star.y, star.r)} color={art.sparkle} />
      </Group>
    );
  }
  return <Circle cx={star.x} cy={star.y} r={star.r} color={art.sparkle} opacity={opacity} />;
}
