import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Path, Line, Text as SvgText, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { NatalChartData, TransitReport } from "../services/types";
import { GlyphGroup } from "./Glyph";
import { SIGNS, absLongitude } from "../lib/zodiac";
import { colors, fonts, motion } from "../lib/design-system";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_SIZE = SCREEN_WIDTH - 56;
const CENTER = CHART_SIZE / 2;
const OUTER_RADIUS = CENTER - 18;
const ZODIAC_GLYPH_R = OUTER_RADIUS - 13;
const ZODIAC_INNER = OUTER_RADIUS - 27;
const TRANSIT_ORBIT = CENTER * 0.64;
const NATAL_ORBIT = CENTER * 0.4;
const INNER_RADIUS = CENTER * 0.2;

const ELEMENT_OF: Record<string, keyof typeof colors.element> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire",
  Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air",
  Cancer: "water", Scorpio: "water", Pisces: "water",
};

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

function natureColor(nature: string): string {
  return nature === "harmonic"
    ? colors.semantic.harmonic
    : nature === "challenging"
      ? colors.semantic.challenging
      : colors.semantic.neutral;
}

interface Props {
  natal: NatalChartData;
  report: TransitReport;
}

/**
 * Transit bi-wheel: your natal planets on the inner orbit, today's transiting
 * planets on the outer orbit, a zodiac sign ring, natal house wedges, and lines
 * for the transit→natal aspects. Rotated so the natal Ascendant sits at top.
 */
export function TransitWheel({ natal, report }: Props) {
  const ascAbs = absLongitude(
    natal.angles.ascendant.sign,
    natal.angles.ascendant.degree,
    natal.angles.ascendant.minute,
  );
  const rel = (abs: number) => (abs - ascAbs + 360) % 360;

  const entrance = useSharedValue(0);
  useEffect(() => {
    entrance.value = withSpring(1, motion.spring.slow);
  }, [entrance]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ scale: 0.92 + entrance.value * 0.08 }],
  }));

  const natalAngle = (name: string): number | null => {
    const p = natal.planets.find((pl) => pl.name === name);
    return p ? rel(absLongitude(p.sign, p.degree, p.minute)) : null;
  };

  return (
    <View style={styles.container}>
      <Animated.View style={animStyle}>
        <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
          {/* Rings */}
          <Circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 6} fill="none" stroke={colors.border.hairline} strokeWidth={0.5} />
          <Circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS} fill="none" stroke={colors.gold[400]} strokeWidth={1} opacity={0.5} />
          <Circle cx={CENTER} cy={CENTER} r={ZODIAC_INNER} fill="none" stroke={colors.gold[600]} strokeWidth={0.6} opacity={0.4} />
          <Circle cx={CENTER} cy={CENTER} r={TRANSIT_ORBIT} fill="none" stroke={colors.border.inner} strokeWidth={0.5} />
          <Circle cx={CENTER} cy={CENTER} r={NATAL_ORBIT} fill="none" stroke={colors.border.inner} strokeWidth={0.5} />
          <Circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill="none" stroke={colors.gold[600]} strokeWidth={0.7} opacity={0.4} />

          {/* Zodiac sign ring — 12 sectors at real sign boundaries */}
          {SIGNS.map((sign, i) => {
            const boundary = rel(i * 30);
            const mid = rel(i * 30 + 15);
            const gpos = polar(CENTER, CENTER, ZODIAC_GLYPH_R, mid);
            const b = polar(CENTER, CENTER, OUTER_RADIUS, boundary);
            const bi = polar(CENTER, CENTER, ZODIAC_INNER, boundary);
            return (
              <G key={`sign-${sign}`}>
                <Line x1={bi.x} y1={bi.y} x2={b.x} y2={b.y} stroke={colors.border.hairline} strokeWidth={0.5} />
                <GlyphGroup name={sign} x={gpos.x} y={gpos.y} size={13} color={colors.element[ELEMENT_OF[sign]]} />
              </G>
            );
          })}

          {/* Natal house wedges (30° whole-sign from ASC, matching the natal wheel) */}
          {natal.houses.map((house) => {
            const idx = house.house - 1;
            const start = (idx * 30) % 360;
            const end = start + 30;
            const mid = start + 15;
            const labelPos = polar(CENTER, CENTER, NATAL_ORBIT + 22, mid);
            const cusp = polar(CENTER, CENTER, ZODIAC_INNER, start);
            return (
              <G key={`house-${house.house}`}>
                <Path d={describeSlice(CENTER, CENTER, ZODIAC_INNER, start, end)} fill={colors.element[ELEMENT_OF[house.sign]]} opacity={0.04} />
                <Line x1={CENTER} y1={CENTER} x2={cusp.x} y2={cusp.y} stroke={colors.border.hairline} strokeWidth={0.4} />
                <SvgText x={labelPos.x} y={labelPos.y + 3} fill={colors.text.tertiary} fontSize={9} fontFamily={fonts.sans} textAnchor="middle" opacity={0.7}>
                  {house.house}
                </SvgText>
              </G>
            );
          })}

          {/* Ascendant marker at top */}
          <Line x1={CENTER} y1={CENTER} x2={polar(CENTER, CENTER, OUTER_RADIUS + 12, 0).x} y2={polar(CENTER, CENTER, OUTER_RADIUS + 12, 0).y} stroke={colors.gold[300]} strokeWidth={1.4} />
          <SvgText x={polar(CENTER, CENTER, OUTER_RADIUS + 22, 0).x} y={polar(CENTER, CENTER, OUTER_RADIUS + 22, 0).y + 4} fill={colors.gold[300]} fontSize={9} fontFamily={fonts.sansSemiBold} textAnchor="middle">
            ASC
          </SvgText>

          {/* Transit → natal aspect lines */}
          {report.movements.flatMap((m) => {
            const tAngle = rel(absLongitude(m.sign, m.degree, m.minute));
            const tPos = polar(CENTER, CENTER, TRANSIT_ORBIT, tAngle);
            return m.aspects.map((a, j) => {
              const nAngle = natalAngle(a.natalPlanet);
              if (nAngle === null) return null;
              const nPos = polar(CENTER, CENTER, NATAL_ORBIT, nAngle);
              return (
                <Line
                  key={`asp-${m.planet}-${a.natalPlanet}-${j}`}
                  x1={tPos.x}
                  y1={tPos.y}
                  x2={nPos.x}
                  y2={nPos.y}
                  stroke={natureColor(a.nature)}
                  strokeWidth={0.6}
                  opacity={0.28}
                  strokeDasharray={a.nature === "challenging" ? "3,3" : undefined}
                />
              );
            });
          })}

          {/* Natal planets — inner orbit, silver */}
          {natal.planets.map((p) => {
            const angle = rel(absLongitude(p.sign, p.degree, p.minute));
            const pos = polar(CENTER, CENTER, NATAL_ORBIT, angle);
            return (
              <G key={`natal-${p.name}`}>
                <Circle cx={pos.x} cy={pos.y} r={3.5} fill={colors.ink[900]} stroke={colors.moon} strokeWidth={0.8} />
                <GlyphGroup name={p.name} x={pos.x} y={pos.y - 11} size={12} color={colors.moon} />
              </G>
            );
          })}

          {/* Transiting planets — outer orbit, gold */}
          {report.movements.map((m) => {
            const angle = rel(absLongitude(m.sign, m.degree, m.minute));
            const pos = polar(CENTER, CENTER, TRANSIT_ORBIT, angle);
            return (
              <G key={`transit-${m.planet}`}>
                <Circle cx={pos.x} cy={pos.y} r={4.5} fill={colors.ink[900]} stroke={colors.gold[300]} strokeWidth={1} />
                <GlyphGroup name={m.planet} x={pos.x} y={pos.y - 13} size={14} color={colors.gold[200]} />
                {m.retrograde ? (
                  <GlyphGroup name="Retrograde" x={pos.x} y={pos.y + 13} size={9} color={colors.semantic.challenging} />
                ) : null}
              </G>
            );
          })}

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
