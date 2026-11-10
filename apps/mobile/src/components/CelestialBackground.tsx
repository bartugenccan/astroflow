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
  withDelay,
  useReducedMotion,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

import { art, colors, surface } from "../lib/design-system";

const { width: W, height: H } = Dimensions.get("window");

type Variant = "default" | "dense" | "still";

interface Star {
  x: number;
  y: number;
  r: number;
  /** Peak opacity; the star's twinkle group dims it from here. */
  peak: number;
  gold: boolean;
}

/** A set of stars that twinkle together: one animated value for many circles. */
interface TwinkleGroup {
  stars: Star[];
  /** Whole cycles per clock loop — an integer, so the loop has no seam. */
  speed: number;
  phase: number;
}

interface Constellation {
  points: [number, number][];
}

/**
 * Stars are dealt into a handful of groups that share a twinkle. One animated
 * value per star meant 64+ worklets running every frame on the UI thread (and
 * twice that while a stack screen with its own background slides in); a few
 * interleaved groups read the same to the eye at a fraction of the cost.
 */
const TWINKLE_GROUPS = 6;
/** How far a group dims at the bottom of its twinkle (fraction of peak). */
const TWINKLE_FLOOR = 0.4;

function makeGroups(count: number, rng: () => number): TwinkleGroup[] {
  const groups: TwinkleGroup[] = Array.from({ length: TWINKLE_GROUPS }, () => ({
    stars: [],
    speed: 1 + Math.floor(rng() * 3),
    phase: rng() * Math.PI * 2,
  }));
  for (let i = 0; i < count; i++) {
    groups[i % TWINKLE_GROUPS].stars.push({
      x: rng() * W,
      y: rng() * H,
      r: rng() * 1.4 + 0.5,
      peak: rng() * 0.4 + 0.55,
      gold: rng() < 0.22,
    });
  }
  return groups;
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

const GOLD = colors.star[300];
const GOLD_BRIGHT = colors.star[100];
const STAR_WHITE = colors.text.primary;

interface Props {
  variant?: Variant;
  /**
   * Stop twinkling (the field stays drawn, frozen). For a background that is
   * covered — e.g. the tab navigator's while a stack screen sits on top — so
   * it stops costing frames nobody sees.
   */
  paused?: boolean;
  /** Nova look (Aster's stage-5 ability): a warm gold nebula rises in the middle of the sky. */
  nova?: boolean;
}

/**
 * Twinkling waits this long after the sky mounts or resumes, so a screen
 * sliding in (or a tab coming back) doesn't redraw the stars on every frame of
 * its transition.
 */
const TWINKLE_START_DELAY = 450;

/**
 * Ambient night-sky layer: ink base, twinkling gold/white stars, and a couple
 * of fine constellations. Twinkle is driven through `useDerivedValue` feeding
 * Skia opacity props — never by reading `.value` during React render.
 *
 * Two canvases: the nebulae and constellations never change, so they live on a
 * canvas that is drawn once; only the small star canvas redraws while the
 * stars twinkle. (One canvas re-rasterised two full-screen radial gradients
 * every frame.)
 */
export function CelestialBackground({ variant = "default", paused = false, nova = false }: Props) {
  // A calm sky: few stars, so the content — not the backdrop — holds the eye.
  const count = variant === "dense" ? 60 : variant === "still" ? 32 : 36;
  const groups = useMemo(() => makeGroups(count, seededRng(0x9e3779b1 ^ count)), [count]);

  const clock = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Reduce Motion: the stars hold still instead of twinkling forever.
    if (variant === "still" || reduced || paused) return;
    // Every group's speed is a whole number of cycles per loop, so restarting
    // from 0 lands on the same twinkle the loop would have reached anyway.
    clock.value = 0;
    clock.value = withDelay(
      TWINKLE_START_DELAY,
      withRepeat(withTiming(Math.PI * 2, { duration: 12000, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(clock);
  }, [clock, variant, reduced, paused]);

  return (
    <>
      <StaticSky dense={variant === "dense"} nova={nova} />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {groups.map((group, i) => (
          <TwinkleGroupLayer key={i} group={group} clock={clock} still={variant === "still"} />
        ))}
      </Canvas>
    </>
  );
}

/** The parts of the sky that never move: drawn once, never redrawn. */
const StaticSky = React.memo(function StaticSky({ dense, nova }: { dense: boolean; nova: boolean }) {
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill color={surface.base} />

      {/* Violet nebula, upper area */}
      <Circle cx={W * 0.75} cy={H * 0.12} r={W * 0.8} opacity={0.4}>
        <RadialGradient
          c={vec(W * 0.75, H * 0.12)}
          r={W * 0.8}
          colors={[art.nebulaViolet, "transparent"]}
        />
      </Circle>

      {nova ? (
        <Circle cx={W * 0.5} cy={H * 0.45} r={W * 0.9} opacity={0.22}>
          <RadialGradient c={vec(W * 0.5, H * 0.45)} r={W * 0.9} colors={[GOLD, "transparent"]} />
        </Circle>
      ) : null}

      {/* Candy-pink nebula, lower area */}
      <Circle cx={W * 0.15} cy={H * 0.88} r={W * 0.8} opacity={0.2}>
        <RadialGradient
          c={vec(W * 0.15, H * 0.88)}
          r={W * 0.8}
          colors={[art.nebulaPink, "transparent"]}
        />
      </Circle>

      {/* Constellations — fine gold linework */}
      {CONSTELLATIONS.map((c, ci) => (
        <Group key={`c-${ci}`} opacity={dense ? 0.4 : 0.22}>
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
    </Canvas>
  );
});

function TwinkleGroupLayer({
  group,
  clock,
  still,
}: {
  group: TwinkleGroup;
  clock: { value: number };
  still: boolean;
}) {
  const { speed, phase } = group;
  const opacity = useDerivedValue(() => {
    "worklet";
    if (still) return (1 + TWINKLE_FLOOR) / 2;
    const t = Math.sin(clock.value * speed + phase) * 0.5 + 0.5;
    return TWINKLE_FLOOR + (1 - TWINKLE_FLOOR) * t;
  });

  return (
    <Group opacity={opacity}>
      {group.stars.map((star, i) => (
        <Circle
          key={i}
          cx={star.x}
          cy={star.y}
          r={star.r}
          color={star.gold ? GOLD_BRIGHT : STAR_WHITE}
          opacity={star.peak}
        />
      ))}
    </Group>
  );
}
