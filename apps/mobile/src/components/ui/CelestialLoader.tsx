import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Canvas, Circle, Path, Skia, Group, vec } from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { colors, spacing } from "../../lib/design-system";

interface Props {
  size?: "sm" | "lg";
  label?: string;
}

/**
 * A looping celestial loader: a faint ring with a rotating gold arc (a comet
 * trail), two planets orbiting in opposite directions, and a softly pulsing
 * star at the centre. Pure Skia + Reanimated, so it spins on the UI thread.
 */
export function CelestialLoader({ size = "lg", label }: Props) {
  const dim = size === "lg" ? 120 : 56;
  const center = dim / 2;
  const ringR = dim * 0.38;
  const orbitR = dim * 0.38;

  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [spin, pulse]);

  const arcPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(center, center, ringR);
    return p;
  }, [center, ringR]);

  const rot = useDerivedValue(() => [{ rotate: spin.value * Math.PI * 2 }]);
  const TAU = Math.PI * 2;
  const dotCx = useDerivedValue(() => center + orbitR * Math.cos(spin.value * TAU - Math.PI / 2));
  const dotCy = useDerivedValue(() => center + orbitR * Math.sin(spin.value * TAU - Math.PI / 2));
  const dot2Cx = useDerivedValue(() => center + orbitR * 0.62 * Math.cos(-spin.value * TAU));
  const dot2Cy = useDerivedValue(() => center + orbitR * 0.62 * Math.sin(-spin.value * TAU));
  const coreR = useDerivedValue(() => dim * 0.02 + pulse.value * dim * 0.018);
  const glowR = useDerivedValue(() => dim * 0.06 + pulse.value * dim * 0.06);
  const glowO = useDerivedValue(() => 0.25 + pulse.value * 0.25);

  return (
    <View style={styles.wrap}>
      <View style={{ width: dim, height: dim }}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* faint full ring */}
          <Circle
            cx={center}
            cy={center}
            r={ringR}
            style="stroke"
            strokeWidth={0.75}
            color={colors.gold[600]}
            opacity={0.4}
          />
          {/* rotating gold arc — a comet sweeping the ring */}
          <Group origin={vec(center, center)} transform={rot}>
            <Path
              path={arcPath}
              style="stroke"
              strokeWidth={1.6}
              color={colors.gold[300]}
              start={0}
              end={0.28}
            />
          </Group>
          {/* two orbiting planets, opposite directions */}
          <Circle cx={dotCx} cy={dotCy} r={dim * 0.03} color={colors.gold[200]} />
          <Circle cx={dot2Cx} cy={dot2Cy} r={dim * 0.022} color={colors.moon} opacity={0.85} />
          {/* pulsing core: glow + star */}
          <Circle cx={center} cy={center} r={glowR} color={colors.glow.gold} opacity={glowO} />
          <Circle cx={center} cy={center} r={coreR} color={colors.gold[100]} />
        </Canvas>
      </View>
      {label ? (
        <AppText variant="bodySmall" color={colors.text.tertiary} center style={styles.label}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  label: {
    marginTop: spacing.xs,
  },
});
