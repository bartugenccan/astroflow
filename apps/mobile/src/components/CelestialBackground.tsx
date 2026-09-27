import React, { useEffect, useMemo } from "react";
import { StyleSheet, Dimensions } from "react-native";
import {
  Canvas,
  Circle,
  Path,
  RadialGradient,
  vec,
  Group,
  Fill,
  Line,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  useReducedMotion,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

type Variant = "default" | "dense" | "still";

interface Star {
  x: number;
  y: number;
  r: number;
  base: number; // base opacity
  amp: number; // twinkle amplitude
  speed: number; // cycles per loop
  phase: number;
  gold: boolean;
}

interface Constellation {
  points: [number, number][];
}

function makeStars(count: number, rng: () => number): Star[] {
  return Array.from({ length: count }, () => ({
    x: rng() * W,
    y: rng() * H,
    r: rng() * 1.4 + 0.5,
    base: rng() * 0.4 + 0.25,
    amp: rng() * 0.4 + 0.2,
    speed: rng() * 2 + 1,
    phase: rng() * Math.PI * 2,
    gold: rng() < 0.22,
  }));
}

/** Seeded PRNG so the star field is stable across renders (no Math.random cascade). */
function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CONSTELLATIONS: Constellation[] = [
  {
    points: [
      [W * 0.16, H * 0.14],
      [W * 0.24, H * 0.19],
      [W * 0.2, H * 0.27],
      [W * 0.29, H * 0.24],
      [W * 0.34, H * 0.16],
    ],
  },
  {
    points: [
      [W * 0.72, H * 0.66],
      [W * 0.8, H * 0.62],
      [W * 0.85, H * 0.7],
      [W * 0.78, H * 0.76],
    ],
  },
];

const GOLD = "#E7CD8F";
const GOLD_BRIGHT = "#F7F0DD";
const STAR_WHITE = "#F3EFE4";

interface Props {
  variant?: Variant;
}

/**
 * Ambient night-sky layer: ink base, twinkling gold/white stars, and a couple
 * of fine constellations. Twinkle is driven through `useDerivedValue` feeding
 * Skia opacity props — never by reading `.value` during React render.
 */
export function CelestialBackground({ variant = "default" }: Props) {
  const count = variant === "dense" ? 90 : variant === "still" ? 50 : 64;
  const stars = useMemo(() => makeStars(count, seededRng(0x9e3779b1 ^ count)), [count]);

  const clock = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Reduce Motion: the stars hold still instead of twinkling forever.
    if (variant === "still" || reduced) return;
    clock.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(clock);
  }, [clock, variant, reduced]);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Fill color="#060810" />

      {/* Soft indigo glow, upper area */}
      <Circle cx={W * 0.7} cy={H * 0.18} r={W * 0.7} opacity={0.5}>
        <RadialGradient
          c={vec(W * 0.7, H * 0.18)}
          r={W * 0.7}
          colors={["#141B38", "transparent"]}
        />
      </Circle>

      {/* Warm gold glow, lower area */}
      <Circle cx={W * 0.2} cy={H * 0.9} r={W * 0.75} opacity={0.16}>
        <RadialGradient
          c={vec(W * 0.2, H * 0.9)}
          r={W * 0.75}
          colors={["#3A2E12", "transparent"]}
        />
      </Circle>

      {/* Constellations — fine gold linework */}
      {CONSTELLATIONS.map((c, ci) => (
        <Group key={`c-${ci}`} opacity={variant === "dense" ? 0.5 : 0.32}>
          {c.points.slice(1).map((p, i) => (
            <Line
              key={`l-${ci}-${i}`}
              p1={vec(c.points[i][0], c.points[i][1])}
              p2={vec(p[0], p[1])}
              color={GOLD}
              strokeWidth={0.6}
            />
          ))}
          {c.points.map((p, i) => (
            <Circle key={`n-${ci}-${i}`} cx={p[0]} cy={p[1]} r={1.6} color={GOLD} />
          ))}
        </Group>
      ))}

      {/* Twinkling stars */}
      {stars.map((s, i) => (
        <TwinkleStar key={i} star={s} clock={clock} still={variant === "still"} />
      ))}
    </Canvas>
  );
}

function TwinkleStar({
  star,
  clock,
  still,
}: {
  star: Star;
  clock: { value: number };
  still: boolean;
}) {
  const opacity = useDerivedValue(() => {
    "worklet";
    if (still) return star.base + star.amp * 0.5;
    const t = Math.sin(clock.value * star.speed + star.phase) * 0.5 + 0.5;
    return star.base + star.amp * t;
  });

  return (
    <Circle
      cx={star.x}
      cy={star.y}
      r={star.r}
      color={star.gold ? GOLD_BRIGHT : STAR_WHITE}
      opacity={opacity}
    />
  );
}
