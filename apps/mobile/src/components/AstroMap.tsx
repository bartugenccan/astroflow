import React, { useCallback, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Path, Line, Text as SvgText, G } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { HousePlacement, PlanetPlacement, Aspect } from "../services/types";
import { GlyphGroup } from "./Glyph";
import { colors, fonts, motion } from "../lib/design-system";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_SIZE = SCREEN_WIDTH - 56;
const CENTER = CHART_SIZE / 2;
const OUTER_RADIUS = CENTER - 18;
const INNER_RADIUS = CENTER * 0.32;
const PLANET_ORBIT_RADIUS = CENTER * 0.54;
const SLICE_RADIUS = OUTER_RADIUS - 3;

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
  const ascAbs = absDegree(ascendantSign, ascendantDegree);

  const entrance = useSharedValue(0);
  useEffect(() => {
    entrance.value = withSpring(1, motion.spring.slow);
  }, [entrance]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { rotate: `${(1 - entrance.value) * -20}deg` },
      { scale: 0.9 + entrance.value * 0.1 },
    ],
  }));

  const handlePlanetTap = useCallback(
    (planet: PlanetPlacement) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPlanetPress?.(planet);
    },
    [onPlanetPress],
  );

  return (
    <View style={styles.container}>
      <Animated.View style={animStyle}>
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

            return (
              <G key={`slice-${house.house}`}>
                <Path d={describeSlice(CENTER, CENTER, SLICE_RADIUS, start, end)} fill={tint} opacity={0.05} />
                <Line
                  x1={CENTER}
                  y1={CENTER}
                  x2={polar(CENTER, CENTER, OUTER_RADIUS, start).x}
                  y2={polar(CENTER, CENTER, OUTER_RADIUS, start).y}
                  stroke={colors.border.hairline}
                  strokeWidth={0.5}
                />
                <SvgText x={labelPos.x} y={labelPos.y - 4} fill={tint} fontSize={11} fontFamily={fonts.sansSemiBold} textAnchor="middle" opacity={0.85}>
                  {house.house}
                </SvgText>
                <SvgText x={labelPos.x} y={labelPos.y + 9} fill={colors.text.tertiary} fontSize={7} fontFamily={fonts.sans} textAnchor="middle">
                  {house.sign.substring(0, 3).toUpperCase()}
                </SvgText>
              </G>
            );
          })}

          {/* Ascendant marker */}
          <Line
            x1={CENTER}
            y1={CENTER}
            x2={polar(CENTER, CENTER, OUTER_RADIUS + 14, 0).x}
            y2={polar(CENTER, CENTER, OUTER_RADIUS + 14, 0).y}
            stroke={colors.gold[300]}
            strokeWidth={1.6}
          />
          <SvgText x={polar(CENTER, CENTER, OUTER_RADIUS + 24, 0).x} y={polar(CENTER, CENTER, OUTER_RADIUS + 24, 0).y + 4} fill={colors.gold[300]} fontSize={10} fontFamily={fonts.sansSemiBold} textAnchor="middle">
            ASC
          </SvgText>

          {/* Aspect lines */}
          {aspects.map((aspect, i) => {
            const p1 = planets.find((p) => p.name === aspect.planet1);
            const p2 = planets.find((p) => p.name === aspect.planet2);
            if (!p1 || !p2) return null;
            const a1 = (absDegree(p1.sign, p1.degree) - ascAbs + 360) % 360;
            const a2 = (absDegree(p2.sign, p2.degree) - ascAbs + 360) % 360;
            const pos1 = polar(CENTER, CENTER, PLANET_ORBIT_RADIUS, a1);
            const pos2 = polar(CENTER, CENTER, PLANET_ORBIT_RADIUS, a2);
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

          {/* Planets */}
          {planets.map((planet) => {
            const angle = (absDegree(planet.sign, planet.degree) - ascAbs + 360) % 360;
            const pos = polar(CENTER, CENTER, PLANET_ORBIT_RADIUS, angle);
            const isSelected = selectedPlanet === planet.name;
            return (
              <G key={`planet-${planet.name}`} onPress={() => handlePlanetTap(planet)}>
                {/* Enlarged transparent hit target (~20px) for easy tapping */}
                <Circle cx={pos.x} cy={pos.y} r={20} fill="transparent" />
                {isSelected ? (
                  <Circle cx={pos.x} cy={pos.y} r={14} fill={colors.gold[300]} opacity={0.18} />
                ) : null}
                <Circle cx={pos.x} cy={pos.y} r={4.5} fill={colors.ink[900]} stroke={colors.gold[300]} strokeWidth={1} />
                <GlyphGroup
                  name={planet.name}
                  x={pos.x}
                  y={pos.y - 13}
                  size={14}
                  color={colors.gold[200]}
                />
                {planet.retrograde ? (
                  <GlyphGroup
                    name="Retrograde"
                    x={pos.x}
                    y={pos.y + 13}
                    size={10}
                    color={colors.semantic.challenging}
                  />
                ) : null}
              </G>
            );
          })}

          {/* Center medallion */}
          <Circle cx={CENTER} cy={CENTER} r={3} fill={colors.gold[300]} opacity={0.7} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
