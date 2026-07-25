import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import {
  Canvas,
  Circle,
  Path,
  Skia,
  Group,
} from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { MotiView } from "moti";
import { Glyph } from "./Glyph";
import { colors } from "../lib/design-system";

const { width: W } = Dimensions.get("window");
const SIZE = Math.min(W - 48, 320);
const CENTER = SIZE / 2;
const RING_R = SIZE * 0.4;
const ORBIT_R = SIZE * 0.3;

const PLANET_NAMES = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];

interface Props {
  onComplete?: () => void;
}

/**
 * Onboarding reveal: stars converge inward, a gold ring draws itself, then the
 * ten planet glyphs pop in sequence with a haptic tick each.
 */
export function ChartReveal({ onComplete }: Props) {
  const ring = useSharedValue(0);
  const converge = useSharedValue(0);
  const [popped, setPopped] = useState(0);

  // Fixed seeded scatter for the converging stars.
  const stars = useMemo(() => {
    let s = 1337;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    return Array.from({ length: 28 }, () => ({
      angle: rnd() * Math.PI * 2,
      dist: RING_R + rnd() * RING_R * 0.9,
      r: rnd() * 1.3 + 0.5,
      gold: rnd() < 0.3,
    }));
  }, []);

  const ringPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(CENTER, CENTER, RING_R);
    return p;
  }, []);

  const ringEnd = useDerivedValue(() => ring.value);

  useEffect(() => {
    converge.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    ring.value = withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) });

    const timers: ReturnType<typeof setTimeout>[] = [];
    // Pop planets one by one after the ring begins closing.
    for (let i = 0; i < PLANET_NAMES.length; i++) {
      timers.push(
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setPopped(i + 1);
        }, 1100 + i * 160),
      );
    }
    timers.push(
      setTimeout(() => onComplete?.(), 1100 + PLANET_NAMES.length * 160 + 400),
    );
    return () => timers.forEach(clearTimeout);
  }, [converge, ring, onComplete]);

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Converging stars */}
        {stars.map((st, i) => (
          <ConvergingStar key={i} star={st} converge={converge} />
        ))}
        {/* Gold ring drawing in */}
        <Path
          path={ringPath}
          style="stroke"
          strokeWidth={1.4}
          color={colors.gold[300]}
          start={0}
          end={ringEnd}
        />
        {/* Inner faint ring */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={ORBIT_R}
          style="stroke"
          strokeWidth={0.5}
          color={colors.gold[600]}
          opacity={0.35}
        />
        <Group>
          <Circle cx={CENTER} cy={CENTER} r={2.5} color={colors.gold[200]} />
        </Group>
      </Canvas>

      {/* Planet glyphs pop in sequence */}
      {PLANET_NAMES.map((name, i) => {
        const angle = (i / PLANET_NAMES.length) * Math.PI * 2 - Math.PI / 2;
        const x = CENTER + ORBIT_R * Math.cos(angle);
        const y = CENTER + ORBIT_R * Math.sin(angle);
        const show = i < popped;
        return (
          <MotiView
            key={name}
            pointerEvents="none"
            animate={{
              opacity: show ? 1 : 0,
              scale: show ? 1 : 0.2,
            }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            style={[styles.glyphWrap, { left: x - 11, top: y - 11 }]}
          >
            <Glyph name={name} size={22} color={colors.gold[200]} />
          </MotiView>
        );
      })}
    </View>
  );
}

function ConvergingStar({
  star,
  converge,
}: {
  star: { angle: number; dist: number; r: number; gold: boolean };
  converge: { value: number };
}) {
  const cx = useDerivedValue(
    () => CENTER + star.dist * (1 - converge.value) * Math.cos(star.angle),
  );
  const cy = useDerivedValue(
    () => CENTER + star.dist * (1 - converge.value) * Math.sin(star.angle),
  );
  const opacity = useDerivedValue(() => 0.3 + converge.value * 0.5);
  return (
    <Circle
      cx={cx}
      cy={cy}
      r={star.r}
      color={star.gold ? colors.gold[200] : colors.text.primary}
      opacity={opacity}
    />
  );
}

const styles = StyleSheet.create({
  glyphWrap: {
    position: "absolute",
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
