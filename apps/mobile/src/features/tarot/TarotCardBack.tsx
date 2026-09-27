import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, G } from "react-native-svg";
import { colors } from "../../lib/design-system";

interface Props {
  width: number;
  height: number;
}

const STAR8 =
  "M30 36 L32.2 45.6 L40 42 L36.4 49.8 L46 52 L36.4 54.2 L40 62 L32.2 58.4 L30 68 L27.8 58.4 L20 62 L23.6 54.2 L14 52 L23.6 49.8 L20 42 L27.8 45.6 Z";

/**
 * The shared card back: night-ink gradient, double gold frame, a crescent and
 * an eight-pointed star. Plain views + one small SVG (no Skia canvas), so a
 * fan of twenty-odd cards stays cheap.
 */
export const TarotCardBack = memo(function TarotCardBack({ width, height }: Props) {
  const radius = Math.max(6, width * 0.09);
  return (
    <View style={[styles.card, { width, height, borderRadius: radius }]}>
      <LinearGradient
        colors={[colors.ink[600], colors.ink[800], colors.ink[950]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.inner,
          { borderRadius: radius * 0.6, margin: Math.max(3, width * 0.06) },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 60 104" preserveAspectRatio="xMidYMid meet">
          <G opacity={0.9}>
            <Circle cx={30} cy={52} r={21} stroke={colors.gold[400]} strokeWidth={0.8} fill="none" />
            <Circle cx={30} cy={52} r={24} stroke={colors.gold[600]} strokeWidth={0.5} fill="none" strokeDasharray="1.5 2.5" />
            <Path d={STAR8} fill={colors.gold[300]} />
            <Path
              d="M32 13 A7 7 0 0 0 32 27 A9 9 0 0 1 32 13 Z"
              fill={colors.gold[300]}
            />
            <Circle cx={30} cy={92} r={1.6} fill={colors.gold[300]} />
            <Circle cx={22} cy={92} r={0.9} fill={colors.gold[500]} />
            <Circle cx={38} cy={92} r={0.9} fill={colors.gold[500]} />
            <Circle cx={9} cy={10} r={0.9} fill={colors.gold[400]} />
            <Circle cx={51} cy={10} r={0.9} fill={colors.gold[400]} />
            <Circle cx={9} cy={94} r={0.9} fill={colors.gold[400]} />
            <Circle cx={51} cy={94} r={0.9} fill={colors.gold[400]} />
          </G>
        </Svg>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.gold[500],
    backgroundColor: colors.ink[800],
  },
  inner: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
});
