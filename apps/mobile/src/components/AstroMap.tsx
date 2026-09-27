import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions, StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, Path, Line, Text as SvgText, G } from "react-native-svg";
import Animated, {
  Easing,
  Extrapolation,
  SharedValue,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { HousePlacement, PlanetPlacement, Aspect } from "../services/types";
import { GlyphGroup } from "./Glyph";
import { PressableScale } from "./ui/PressableScale";
import { useTranslation, TranslationKey } from "../i18n";
import { colors, fonts, motion } from "../lib/design-system";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_SIZE = SCREEN_WIDTH - 56;
const CENTER = CHART_SIZE / 2;
const OUTER_RADIUS = CENTER - 18;
const INNER_RADIUS = CENTER * 0.32;
const PLANET_ORBIT_RADIUS = CENTER * 0.54;
const SLICE_RADIUS = OUTER_RADIUS - 3;
/** Box around each planet marker — also its tap target (~20px radius). */
const MARKER = 44;
const MARKER_C = MARKER / 2;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const ELEMENT_OF: Record<string, keyof typeof colors.element> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire",
  Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air",
  Cancer: "water", Scorpio: "water", Pisces: "water",
};

function signColor(sign: string): string {
  return colors.element[ELEMENT_OF[sign] ?? "air"];
}

interface AstroMapProps {
  houses: HousePlacement[];
  planets: PlanetPlacement[];
  aspects?: Aspect[];
  ascendantSign: string;
  ascendantDegree: number;
  selectedPlanet?: string | null;
  onPlanetPress?: (planet: PlanetPlacement) => void;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const largeArc = (end - start + 360) % 360 > 180 ? "1" : "0";
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 0 ${e.x} ${e.y} Z`;
}

function absDegree(sign: string, degree: number): number {
  return (SIGNS.indexOf(sign) * 30 + degree) % 360;
}

// ─── Shared wheel entrance ────────────────────────────────────────────────────
// One linear 0→1 progress value drives every phase of the reveal; each layer
// reads its own window of it and applies its own easing. With reduce-motion the
// value starts (and stays) at 1, so the final chart renders immediately.

const easeOut = Easing.out(Easing.cubic);
const easeOutBack = Easing.out(Easing.back(1.3));

/** Normalized, clamped position of `p` inside the [start, end] window. */
function windowOf(p: number, start: number, end: number): number {
  "worklet";
  return interpolate(p, [start, end], [0, 1], Extrapolation.CLAMP);
}

export function useWheelEntrance() {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, {
      duration: motion.duration.reveal,
      easing: Easing.linear,
    });
    return () => cancelAnimation(progress);
  }, [reduced, progress]);

  /** The linework: turns in ~30° while it scales up and fades in. */
  const wheelStyle = useAnimatedStyle(() => {
    const e = easeOut(windowOf(progress.value, 0, 0.6));
    return {
      opacity: windowOf(progress.value, 0, 0.3),
      transform: [{ rotate: `${(1 - e) * -30}deg` }, { scale: 0.86 + e * 0.14 }],
    };
  });

  /** Lines (aspects) fade in once the planets have landed. */
  const linesStyle = useAnimatedStyle(() => ({
    opacity: easeOut(windowOf(progress.value, 0.7, 1)),
  }));

  return { progress, wheelStyle, linesStyle, reduced };
}

/** A whole layer blooming outward from the wheel's center (cheap: one transform). */
export function useBloomStyle(
  progress: SharedValue<number>,
  start: number,
  end: number,
  fromScale: number,
) {
  return useAnimatedStyle(() => {
    const w = windowOf(progress.value, start, end);
    return {
      opacity: Math.min(1, w * 1.6),
      transform: [{ scale: fromScale + (1 - fromScale) * easeOutBack(w) }],
    };
  });
}

/** The natal wheel — gold linework, element-tinted signs, animated entrance. */
export function AstroMap({
  houses,
  planets,
  aspects = [],
  ascendantSign,
  ascendantDegree,
  selectedPlanet,
  onPlanetPress,
}: AstroMapProps) {
  const { t } = useTranslation();
  const ascAbs = absDegree(ascendantSign, ascendantDegree);
  const { progress, wheelStyle, linesStyle, reduced } = useWheelEntrance();

  const planetPos = (planet: PlanetPlacement) =>
    polar(
      CENTER,
      CENTER,
      PLANET_ORBIT_RADIUS,
      (absDegree(planet.sign, planet.degree) - ascAbs + 360) % 360,
    );

  const ascTip = polar(CENTER, CENTER, OUTER_RADIUS + 14, 0);
  const ascLabel = polar(CENTER, CENTER, OUTER_RADIUS + 24, 0);

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        {/* Linework — rotates/scales in */}
        <Animated.View style={[StyleSheet.absoluteFill, wheelStyle]}>
          <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
            {/* Rings */}
            <Circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 8} fill="none" stroke={colors.border.hairline} strokeWidth={0.5} />
            <Circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS} fill="none" stroke={colors.gold[400]} strokeWidth={1} opacity={0.5} />
            <Circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill="none" stroke={colors.gold[600]} strokeWidth={0.8} opacity={0.4} />
            <Circle cx={CENTER} cy={CENTER} r={PLANET_ORBIT_RADIUS} fill="none" stroke={colors.border.inner} strokeWidth={0.5} />

            {/* House slices */}
            {houses.map((house) => {
              const idx = house.house - 1;
              const start = (ascAbs + idx * 30) % 360;
              const end = (start + 30) % 360;
              const mid = ((start + end) / 2 + 360) % 360;
              const labelPos = polar(CENTER, CENTER, OUTER_RADIUS * 0.72, mid);
              const tint = signColor(house.sign);
              const cusp = polar(CENTER, CENTER, OUTER_RADIUS, start);

              return (
                <G key={`slice-${house.house}`}>
                  <Path d={describeSlice(CENTER, CENTER, SLICE_RADIUS, start, end)} fill={tint} opacity={0.05} />
                  <Line x1={CENTER} y1={CENTER} x2={cusp.x} y2={cusp.y} stroke={colors.border.hairline} strokeWidth={0.5} />
                  <SvgText x={labelPos.x} y={labelPos.y - 4} fill={tint} fontSize={11} fontFamily={fonts.sansSemiBold} textAnchor="middle" opacity={0.85}>
                    {house.house}
                  </SvgText>
                  <SvgText x={labelPos.x} y={labelPos.y + 9} fill={colors.text.tertiary} fontSize={7} fontFamily={fonts.sans} textAnchor="middle">
                    {t(`signsShort.${house.sign}` as TranslationKey)}
                  </SvgText>
                </G>
              );
            })}

            {/* Ascendant marker */}
            <Line x1={CENTER} y1={CENTER} x2={ascTip.x} y2={ascTip.y} stroke={colors.gold[300]} strokeWidth={1.6} />
            <SvgText x={ascLabel.x} y={ascLabel.y + 4} fill={colors.gold[300]} fontSize={10} fontFamily={fonts.sansSemiBold} textAnchor="middle">
              {t("chart.ascShort")}
            </SvgText>

            {/* Center medallion */}
            <Circle cx={CENTER} cy={CENTER} r={3} fill={colors.gold[300]} opacity={0.7} />
          </Svg>
        </Animated.View>

        {/* Aspect lines — fade in after the planets land */}
        <Animated.View style={[StyleSheet.absoluteFill, linesStyle]} pointerEvents="none">
          <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
            {aspects.map((aspect, i) => {
              const p1 = planets.find((p) => p.name === aspect.planet1);
              const p2 = planets.find((p) => p.name === aspect.planet2);
              if (!p1 || !p2) return null;
              const pos1 = planetPos(p1);
              const pos2 = planetPos(p2);
              const lineColor =
                aspect.type === "harmonic"
                  ? colors.semantic.harmonic
                  : aspect.type === "challenging"
                    ? colors.semantic.challenging
                    : colors.semantic.neutral;
              return (
                <Line
                  key={`aspect-${i}`}
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  stroke={lineColor}
                  strokeWidth={0.6}
                  opacity={0.25}
                  strokeDasharray={aspect.type === "challenging" ? "3,3" : undefined}
                />
              );
            })}
          </Svg>
        </Animated.View>

        {/* Planets — each flies out from the center to its place */}
        {planets.map((planet, i) => (
          <PlanetMarker
            key={`planet-${planet.name}`}
            planet={planet}
            pos={planetPos(planet)}
            index={i}
            count={planets.length}
            progress={progress}
            selected={selectedPlanet === planet.name}
            reduced={reduced}
            label={t(`planets.${planet.name}` as TranslationKey)}
            onPress={onPlanetPress}
          />
        ))}
      </View>
    </View>
  );
}

function PlanetMarker({
  planet,
  pos,
  index,
  count,
  progress,
  selected,
  reduced,
  label,
  onPress,
}: {
  planet: PlanetPlacement;
  pos: { x: number; y: number };
  index: number;
  count: number;
  progress: SharedValue<number>;
  selected: boolean;
  reduced: boolean;
  label: string;
  onPress?: (planet: PlanetPlacement) => void;
}) {
  // Stagger inside the 0.25–0.85 slice of the reveal, whatever the planet count.
  const spread = 0.2;
  const start = 0.25 + (count > 1 ? (index / (count - 1)) * spread : 0);
  const end = start + 0.4;
  const dx = CENTER - pos.x;
  const dy = CENTER - pos.y;

  const flyStyle = useAnimatedStyle(() => {
    const w = windowOf(progress.value, start, end);
    const e = easeOutBack(w);
    return {
      opacity: Math.min(1, w * 2),
      transform: [
        { translateX: dx * (1 - e) },
        { translateY: dy * (1 - e) },
        { scale: 0.6 + 0.4 * Math.min(1, e) },
      ],
    };
  });

  const boxStyle: StyleProp<ViewStyle> = {
    left: pos.x - MARKER_C,
    top: pos.y - MARKER_C,
  };

  return (
    <Animated.View style={[styles.marker, boxStyle, flyStyle]}>
      <PressableScale
        onPress={() => onPress?.(planet)}
        haptic="light"
        scaleTo={0.85}
        hitSlop={4}
        style={styles.markerHit}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
      >
        {selected ? <SelectedPulse reduced={reduced} /> : null}
        <Svg width={MARKER} height={MARKER} viewBox={`0 0 ${MARKER} ${MARKER}`}>
          {selected ? (
            <Circle cx={MARKER_C} cy={MARKER_C} r={14} fill={colors.gold[300]} opacity={0.18} />
          ) : null}
          <Circle cx={MARKER_C} cy={MARKER_C} r={4.5} fill={colors.ink[900]} stroke={colors.gold[300]} strokeWidth={1} />
          <GlyphGroup name={planet.name} x={MARKER_C} y={MARKER_C - 13} size={14} color={colors.gold[200]} />
          {planet.retrograde ? (
            <GlyphGroup name="Retrograde" x={MARKER_C} y={MARKER_C + 13} size={10} color={colors.semantic.challenging} />
          ) : null}
        </Svg>
      </PressableScale>
    </Animated.View>
  );
}

/** Soft expanding ring around the selected planet (static ring when reduced). */
function SelectedPulse({ reduced }: { reduced: boolean }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: motion.duration.reveal, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);

  const style = useAnimatedStyle(() =>
    reduced
      ? { opacity: 0.45, transform: [{ scale: 1.1 }] }
      : {
          opacity: 0.55 * (1 - pulse.value),
          transform: [{ scale: 0.9 + pulse.value * 0.8 }],
        },
  );

  return <Animated.View pointerEvents="none" style={[styles.pulse, style]} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  stage: {
    width: CHART_SIZE,
    height: CHART_SIZE,
  },
  marker: {
    position: "absolute",
    width: MARKER,
    height: MARKER,
  },
  markerHit: {
    width: MARKER,
    height: MARKER,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold[300],
    left: MARKER_C - 14,
    top: MARKER_C - 14,
  },
});
