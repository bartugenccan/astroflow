import React, { useMemo } from "react";
import { Canvas, Circle, Group, Path, Skia } from "@shopify/react-native-skia";
import { colors } from "../lib/design-system";

interface MoonPhaseProps {
  size?: number;
  date?: Date;
}

/** Synodic phase 0..1 (0 = new moon, 0.5 = full). Simple mean-cycle approximation. */
export function moonIllumination(date: Date): number {
  const synodic = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // days
  const days = date.getTime() / 86400000;
  const phase = ((days - knownNewMoon) % synodic) / synodic;
  return (phase + 1) % 1;
}

export type MoonPhaseKey =
  | "new"
  | "waxingCrescent"
  | "firstQuarter"
  | "waxingGibbous"
  | "full"
  | "waningGibbous"
  | "lastQuarter"
  | "waningCrescent";

/** Phase 0..1 → i18n key under `moonPhase.*`. */
export function moonPhaseKey(phase: number): MoonPhaseKey {
  if (phase < 0.03 || phase > 0.97) return "new";
  if (phase < 0.22) return "waxingCrescent";
  if (phase < 0.28) return "firstQuarter";
  if (phase < 0.47) return "waxingGibbous";
  if (phase < 0.53) return "full";
  if (phase < 0.72) return "waningGibbous";
  if (phase < 0.78) return "lastQuarter";
  return "waningCrescent";
}

/** Silver moon disc with a shadow terminator drawn from the current phase. */
export function MoonPhase({ size = 28, date }: MoonPhaseProps) {
  const phase = useMemo(() => moonIllumination(date ?? new Date()), [date]);
  const r = size / 2;
  const cx = r;
  const cy = r;

  // Terminator: offset a shadow disc across the face based on phase.
  const shadowPath = useMemo(() => {
    const p = Skia.Path.Make();
    // fraction of face lit: 0 at new, 1 at full
    const lit = 1 - Math.abs(phase - 0.5) * 2;
    // waxing (phase<0.5) lights the right side; waning lights the left.
    const waxing = phase < 0.5;
    const offset = (1 - lit) * r * (waxing ? 1 : -1);
    p.addCircle(cx + offset, cy, r);
    return p;
  }, [phase, cx, cy, r]);

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Lit disc */}
      <Circle cx={cx} cy={cy} r={r} color={colors.moon} />
      {/* Shadow, clipped to the moon face */}
      <Group
        clip={(() => {
          const c = Skia.Path.Make();
          c.addCircle(cx, cy, r);
          return c;
        })()}
      >
        <Path path={shadowPath} color={colors.ink[800]} opacity={0.92} />
      </Group>
      {/* Rim */}
      <Circle cx={cx} cy={cy} r={r - 0.5} style="stroke" strokeWidth={0.5} color={colors.gold[600]} opacity={0.4} />
    </Canvas>
  );
}
