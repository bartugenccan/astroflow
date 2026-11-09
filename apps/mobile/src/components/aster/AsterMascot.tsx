import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { AccessoryBack, AccessoryFront } from "./AsterAccessories";
import {
  ART,
  BODY_COLORS,
  BODY_PATH,
  CX,
  CY,
  EGG_CRACK,
  EGG_PATH,
  STAGE_SCALE,
  sparklePath,
} from "./asterShapes";
import { useAsterMotion } from "./useAsterMotion";
import type { MascotRendererProps } from "./types";

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const INK = "#2B1A00";
const CHEEK = "#FF8FC5";

/**
 * Aster — AstroFlow's star mascot, drawn in code. A chubby five-point star
 * that hatches from a cosmic egg and grows through five stages, wearing what
 * the user bought with Yıldız Tozu. Implements MascotRendererProps so a
 * designer-made Rive/Lottie Aster can replace it later.
 */
export function AsterMascot({
  stage,
  mood = "happy",
  accessories = [],
  size = 160,
  action = "idle",
  playKey = 0,
  style,
  accessibilityLabel,
}: MascotRendererProps) {
  const s = Math.max(0, Math.min(5, Math.round(stage)));
  const effectiveAction = action === "idle" && mood === "sleepy" ? "sleep" : action;
  const { bodyStyle, glowStyle, eyeProps, mouthProps } = useAsterMotion(effectiveAction, playKey);
  const colors = BODY_COLORS[s];
  const scale = STAGE_SCALE[s];
  const groupTransform = `translate(${CX} ${CY}) scale(${scale}) translate(${-CX} ${-CY})`;
  const sleepy = mood === "sleepy" || effectiveAction === "sleep";
  const glowing = mood === "glowing";
  const talking = effectiveAction === "talk";
  const items = useMemo(() => accessories.slice(0, 4), [accessories]);

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Soft luminous glow (stars may glow — buttons and cards never blur). */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`}>
          <Defs>
            <RadialGradient id="asterGlow" cx="50%" cy="56%" r="50%">
              <Stop offset="0" stopColor={s === 5 ? "#FF6FB5" : "#FFD25C"} stopOpacity={glowing ? 0.6 : 0.4} />
              <Stop offset="1" stopColor="#FFD25C" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={CX} cy={CY} r={s === 0 ? 80 : 60 + s * 8} fill="url(#asterGlow)" />
          {s === 5
            ? Array.from({ length: 8 }, (_, i) => (
                <Path
                  key={i}
                  d={`M ${CX} ${CY} L ${CX + 98 * Math.cos((i * Math.PI) / 4 - 0.12)} ${CY + 98 * Math.sin((i * Math.PI) / 4 - 0.12)} L ${CX + 98 * Math.cos((i * Math.PI) / 4 + 0.12)} ${CY + 98 * Math.sin((i * Math.PI) / 4 + 0.12)} Z`}
                  fill="#FFF4D1"
                  opacity={0.16}
                />
              ))
            : null}
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`}>
          <Defs>
            <LinearGradient id="asterBody" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.top} />
              <Stop offset="1" stopColor={colors.bottom} />
            </LinearGradient>
          </Defs>

          {s === 0 ? (
            <Egg cracking={action === "hatch"} />
          ) : (
            <G transform={groupTransform}>
              <AccessoryBack ids={items} />

              {s >= 4 ? <ConstellationTail /> : null}
              {s >= 3 ? (
                <Ellipse cx={CX} cy={CY - 76} rx={30} ry={8} fill="none" stroke="#FFF4D1" strokeWidth={5} opacity={0.9} />
              ) : null}

              {/* Hard slab under the body — the same physical depth as the buttons. */}
              <Path d={BODY_PATH} fill={colors.slab} transform="translate(0 7)" />
              <Path d={BODY_PATH} fill="url(#asterBody)" />
              <Ellipse cx={74} cy={84} rx={11} ry={6} fill="#FFFFFF" opacity={0.55} transform="rotate(-32 74 84)" />

              {/* Face */}
              <Face sleepy={sleepy} glowing={glowing} talking={talking} eyeProps={eyeProps} mouthProps={mouthProps} />

              {s >= 3 ? (
                <Ellipse cx={CX} cy={CY - 76} rx={30} ry={8} fill="none" stroke="#FFF4D1" strokeWidth={5} opacity={0.9} strokeDasharray="0 47 48 0" />
              ) : null}

              <AccessoryFront ids={items} />
            </G>
          )}

          {s >= 2 ? (
            <G>
              <Path d={sparklePath(32, 44, 7)} fill="#FFF4D1" />
              <Path d={sparklePath(172, 150, 5)} fill="#FFD25C" />
              {s >= 4 ? <Path d={sparklePath(170, 40, 6)} fill="#B9A2FF" /> : null}
            </G>
          ) : s === 1 ? (
            <Path d={sparklePath(150, 60, 5)} fill="#FFF4D1" />
          ) : null}

          {sleepy ? (
            <G>
              <SvgText x={146} y={58} fontSize={18} fontWeight="900" fill="#CFD6FF" opacity={0.85}>
                z
              </SvgText>
              <SvgText x={160} y={40} fontSize={13} fontWeight="900" fill="#CFD6FF" opacity={0.6}>
                z
              </SvgText>
            </G>
          ) : null}
        </Svg>
      </Animated.View>
    </View>
  );
}

function Face({
  sleepy,
  glowing,
  talking,
  eyeProps,
  mouthProps,
}: {
  sleepy: boolean;
  glowing: boolean;
  talking: boolean;
  eyeProps: Partial<{ ry: number }>;
  mouthProps: Partial<{ ry: number }>;
}) {
  const eyeY = CY - 6;
  return (
    <G>
      {sleepy ? (
        <G stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none">
          <Path d={`M ${CX - 27} ${eyeY} Q ${CX - 19} ${eyeY + 7} ${CX - 11} ${eyeY}`} />
          <Path d={`M ${CX + 11} ${eyeY} Q ${CX + 19} ${eyeY + 7} ${CX + 27} ${eyeY}`} />
        </G>
      ) : glowing ? (
        <G stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none">
          <Path d={`M ${CX - 27} ${eyeY + 3} Q ${CX - 19} ${eyeY - 9} ${CX - 11} ${eyeY + 3}`} />
          <Path d={`M ${CX + 11} ${eyeY + 3} Q ${CX + 19} ${eyeY - 9} ${CX + 27} ${eyeY + 3}`} />
        </G>
      ) : (
        <G>
          <AnimatedEllipse cx={CX - 19} cy={eyeY} rx={7} ry={9} fill={INK} animatedProps={eyeProps} />
          <AnimatedEllipse cx={CX + 19} cy={eyeY} rx={7} ry={9} fill={INK} animatedProps={eyeProps} />
          <Circle cx={CX - 21.5} cy={eyeY - 3.5} r={2.6} fill="#FFFFFF" />
          <Circle cx={CX + 16.5} cy={eyeY - 3.5} r={2.6} fill="#FFFFFF" />
        </G>
      )}

      <Ellipse cx={CX - 32} cy={CY + 9} rx={8} ry={5} fill={CHEEK} opacity={0.75} />
      <Ellipse cx={CX + 32} cy={CY + 9} rx={8} ry={5} fill={CHEEK} opacity={0.75} />

      {talking ? (
        <AnimatedEllipse cx={CX} cy={CY + 14} rx={6} ry={3} fill={INK} animatedProps={mouthProps} />
      ) : glowing ? (
        <G>
          <Path d={`M ${CX - 11} ${CY + 9} Q ${CX} ${CY + 27} ${CX + 11} ${CY + 9} Z`} fill={INK} />
          <Ellipse cx={CX} cy={CY + 18} rx={5} ry={3} fill="#FF6FB5" />
        </G>
      ) : sleepy ? (
        <Ellipse cx={CX} cy={CY + 14} rx={3.5} ry={2.5} fill={INK} />
      ) : (
        <Path
          d={`M ${CX - 9} ${CY + 10} Q ${CX} ${CY + 20} ${CX + 9} ${CY + 10}`}
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </G>
  );
}

function Egg({ cracking }: { cracking: boolean }) {
  const c = BODY_COLORS[0];
  return (
    <G>
      <Path d={EGG_PATH} fill={c.slab} transform="translate(0 7)" />
      <Path d={EGG_PATH} fill="url(#asterBody)" />
      <Ellipse cx={78} cy={70} rx={10} ry={16} fill="#FFFFFF" opacity={0.6} transform="rotate(20 78 70)" />
      <Path d={sparklePath(124, 72, 9)} fill="#FFC83D" />
      <Path d={sparklePath(70, 146, 7)} fill="#FF6FB5" />
      <Path d={sparklePath(132, 150, 6)} fill="#7C4DFF" />
      <Path d={sparklePath(98, 164, 5)} fill="#4CC9F0" />
      {/* Sleepy face peeking through the shell */}
      <G stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none">
        <Path d="M 80 112 Q 87 118 94 112" />
        <Path d="M 106 112 Q 113 118 120 112" />
      </G>
      <Ellipse cx={74} cy={124} rx={7} ry={4} fill={CHEEK} opacity={0.7} />
      <Ellipse cx={126} cy={124} rx={7} ry={4} fill={CHEEK} opacity={0.7} />
      <Path
        d={EGG_CRACK}
        stroke="#C99300"
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity={cracking ? 1 : 0.18}
      />
    </G>
  );
}

function ConstellationTail() {
  const pts: [number, number][] = [
    [56, 150],
    [34, 164],
    [20, 150],
    [8, 168],
  ];
  return (
    <G>
      <Path
        d={`M ${pts.map((p) => p.join(" ")).join(" L ")}`}
        stroke="#CFD6FF"
        strokeWidth={2.5}
        strokeDasharray="4 5"
        strokeLinecap="round"
        fill="none"
      />
      {pts.slice(1).map(([x, y], i) => (
        <Path key={i} d={sparklePath(x, y, 5 - i)} fill="#FFF4D1" />
      ))}
    </G>
  );
}
