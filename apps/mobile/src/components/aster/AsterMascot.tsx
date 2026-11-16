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
import { ART, BODY_COLORS, BODY_PATH, CX, CY, EGG_CRACK, EGG_PATH, STAGE_SCALE, sparklePath } from "./asterShapes";
import { useAsterMotion } from "./useAsterMotion";
import type { MascotRendererProps } from "./types";
import { art, colors as tokens, palette } from "../../lib/design-system";

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/** Shared empty default, so an Aster without accessories keeps a stable prop. */
const NO_ACCESSORIES: string[] = [];

const INK = art.ink;
const CHEEK = art.blush;

type FaceKind = "happy" | "glowing" | "sleepy" | "talk" | "misses" | "longs";

/**
 * Aster — AstroFlow's star mascot, drawn in code. A chubby five-point star
 * that hatches from a cosmic egg and grows through five stages, wearing what
 * the user bought with Yıldız Tozu. Implements MascotRendererProps so a
 * designer-made Rive/Lottie Aster can replace it later.
 *
 * Drawn as stacked SVG layers inside one moving view: the body (redrawn only
 * when the stage or the accessories change), the face (eyes, mouth, zzz — the
 * only part that changes when Aster talks, sleeps or misses you) and the front
 * accessories over the face. Talking used to redraw the whole tree.
 */
export const AsterMascot = React.memo(function AsterMascot({
  stage,
  mood = "happy",
  longing = "content",
  accessories = NO_ACCESSORIES,
  size = 160,
  action = "idle",
  playKey = 0,
  style,
  accessibilityLabel,
}: MascotRendererProps) {
  const s = Math.max(0, Math.min(5, Math.round(stage)));
  const wistful = longing !== "content" && s > 0;
  // Missing you wins over sleepy: Aster perks up hoping you'll come back.
  const effectiveAction = action === "idle" && mood === "sleepy" && !wistful ? "sleep" : action;
  const { bodyStyle, glowStyle, eyeProps, mouthProps } = useAsterMotion(effectiveAction, playKey);
  const items = useMemo(() => accessories.slice(0, 4), [accessories]);
  const face: FaceKind =
    effectiveAction === "talk"
      ? "talk"
      : wistful
        ? longing === "longs"
          ? "longs"
          : "misses"
        : mood === "sleepy" || effectiveAction === "sleep"
          ? "sleepy"
          : mood === "glowing"
            ? "glowing"
            : "happy";

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Soft luminous glow (stars may glow — buttons and cards never blur). */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
        <GlowLayer size={size} stage={s} glowing={mood === "glowing"} />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <BodyLayer size={size} stage={s} items={items} cracking={action === "hatch"} />
        <FaceLayer size={size} stage={s} face={face} eyeProps={eyeProps} mouthProps={mouthProps} />
        {s > 0 ? <FrontLayer size={size} stage={s} items={items} /> : null}
      </Animated.View>
    </View>
  );
});

function stageTransform(s: number): string {
  return `translate(${CX} ${CY}) scale(${STAGE_SCALE[s]}) translate(${-CX} ${-CY})`;
}

const GlowLayer = React.memo(function GlowLayer({
  size,
  stage: s,
  glowing,
}: {
  size: number;
  stage: number;
  glowing: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`}>
      <Defs>
        <RadialGradient id="asterGlow" cx="50%" cy="56%" r="50%">
          <Stop
            offset="0"
            stopColor={s === 5 ? palette.candy.face : tokens.star[300]}
            stopOpacity={glowing ? 0.6 : 0.4}
          />
          <Stop offset="1" stopColor={tokens.star[300]} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={CX} cy={CY} r={s === 0 ? 80 : 60 + s * 8} fill="url(#asterGlow)" />
      {s === 5
        ? Array.from({ length: 8 }, (_, i) => (
            <Path
              key={i}
              d={`M ${CX} ${CY} L ${CX + 98 * Math.cos((i * Math.PI) / 4 - 0.12)} ${CY + 98 * Math.sin((i * Math.PI) / 4 - 0.12)} L ${CX + 98 * Math.cos((i * Math.PI) / 4 + 0.12)} ${CY + 98 * Math.sin((i * Math.PI) / 4 + 0.12)} Z`}
              fill={tokens.star[100]}
              opacity={0.16}
            />
          ))
        : null}
    </Svg>
  );
});

const BodyLayer = React.memo(function BodyLayer({
  size,
  stage: s,
  items,
  cracking,
}: {
  size: number;
  stage: number;
  items: string[];
  cracking: boolean;
}) {
  const colors = BODY_COLORS[s];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="asterBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.top} />
          <Stop offset="1" stopColor={colors.bottom} />
        </LinearGradient>
      </Defs>

      {s === 0 ? (
        <Egg cracking={cracking} />
      ) : (
        <G transform={stageTransform(s)}>
          <AccessoryBack ids={items} />
          {s >= 4 ? <ConstellationTail /> : null}
          {s >= 3 ? (
            <Ellipse
              cx={CX}
              cy={CY - 76}
              rx={30}
              ry={8}
              fill="none"
              stroke={tokens.star[100]}
              strokeWidth={5}
              opacity={0.9}
            />
          ) : null}
          {/* Hard slab under the body — the same physical depth as the buttons. */}
          <Path d={BODY_PATH} fill={colors.slab} transform="translate(0 7)" />
          <Path d={BODY_PATH} fill="url(#asterBody)" />
          <Ellipse cx={74} cy={84} rx={11} ry={6} fill={art.sparkle} opacity={0.55} transform="rotate(-32 74 84)" />
        </G>
      )}
    </Svg>
  );
});

function FaceLayer({
  size,
  stage: s,
  face,
  eyeProps,
  mouthProps,
}: {
  size: number;
  stage: number;
  face: FaceKind;
  eyeProps: Partial<{ ry: number }>;
  mouthProps: Partial<{ ry: number }>;
}) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      {s > 0 ? (
        <G transform={stageTransform(s)}>
          <Face face={face} eyeProps={eyeProps} mouthProps={mouthProps} />
        </G>
      ) : null}
      {face === "sleepy" ? (
        <G>
          <SvgText x={146} y={58} fontSize={18} fontWeight="900" fill={tokens.moon} opacity={0.85}>
            z
          </SvgText>
          <SvgText x={160} y={40} fontSize={13} fontWeight="900" fill={tokens.moon} opacity={0.6}>
            z
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}

const FrontLayer = React.memo(function FrontLayer({
  size,
  stage: s,
  items,
}: {
  size: number;
  stage: number;
  items: string[];
}) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G transform={stageTransform(s)}>
        {s >= 3 ? (
          <Ellipse
            cx={CX}
            cy={CY - 76}
            rx={30}
            ry={8}
            fill="none"
            stroke={tokens.star[100]}
            strokeWidth={5}
            opacity={0.9}
            strokeDasharray="0 47 48 0"
          />
        ) : null}
        <AccessoryFront ids={items} />
      </G>
      {s >= 2 ? (
        <G>
          <Path d={sparklePath(32, 44, 7)} fill={tokens.star[100]} />
          <Path d={sparklePath(172, 150, 5)} fill={tokens.star[300]} />
          {s >= 4 ? <Path d={sparklePath(170, 40, 6)} fill={tokens.text.violet} /> : null}
        </G>
      ) : (
        <Path d={sparklePath(150, 60, 5)} fill={tokens.star[100]} />
      )}
    </Svg>
  );
});

function Face({
  face,
  eyeProps,
  mouthProps,
}: {
  face: FaceKind;
  eyeProps: Partial<{ ry: number }>;
  mouthProps: Partial<{ ry: number }>;
}) {
  const eyeY = CY - 6;
  const wistful = face === "misses" || face === "longs";
  const shine = face === "longs" ? 3.4 : 2.6;
  return (
    <G>
      {face === "sleepy" ? (
        <G stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none">
          <Path d={`M ${CX - 27} ${eyeY} Q ${CX - 19} ${eyeY + 7} ${CX - 11} ${eyeY}`} />
          <Path d={`M ${CX + 11} ${eyeY} Q ${CX + 19} ${eyeY + 7} ${CX + 27} ${eyeY}`} />
        </G>
      ) : face === "glowing" ? (
        <G stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none">
          <Path d={`M ${CX - 27} ${eyeY + 3} Q ${CX - 19} ${eyeY - 9} ${CX - 11} ${eyeY + 3}`} />
          <Path d={`M ${CX + 11} ${eyeY + 3} Q ${CX + 19} ${eyeY - 9} ${CX + 27} ${eyeY + 3}`} />
        </G>
      ) : (
        <G>
          <AnimatedEllipse cx={CX - 19} cy={eyeY} rx={7} ry={9} fill={INK} animatedProps={eyeProps} />
          <AnimatedEllipse cx={CX + 19} cy={eyeY} rx={7} ry={9} fill={INK} animatedProps={eyeProps} />
          <Circle cx={CX - 21.5} cy={eyeY - 3.5} r={shine} fill={art.sparkle} />
          <Circle cx={CX + 16.5} cy={eyeY - 3.5} r={shine} fill={art.sparkle} />
          {face === "longs" ? (
            <G>
              <Circle cx={CX - 16.5} cy={eyeY + 3.5} r={1.4} fill={art.sparkle} />
              <Circle cx={CX + 21.5} cy={eyeY + 3.5} r={1.4} fill={art.sparkle} />
            </G>
          ) : null}
        </G>
      )}

      {/* Missing you: soft brows lifted towards the middle — wistful, not sad. */}
      {wistful ? (
        <G stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none">
          <Path d={`M ${CX - 28} ${eyeY - 14} Q ${CX - 20} ${eyeY - 16} ${CX - 12} ${eyeY - 20}`} />
          <Path d={`M ${CX + 12} ${eyeY - 20} Q ${CX + 20} ${eyeY - 16} ${CX + 28} ${eyeY - 14}`} />
        </G>
      ) : null}

      <Ellipse cx={CX - 32} cy={CY + 9} rx={8} ry={5} fill={CHEEK} opacity={face === "longs" ? 0.9 : 0.75} />
      <Ellipse cx={CX + 32} cy={CY + 9} rx={8} ry={5} fill={CHEEK} opacity={face === "longs" ? 0.9 : 0.75} />

      {face === "talk" ? (
        <AnimatedEllipse cx={CX} cy={CY + 14} rx={6} ry={3} fill={INK} animatedProps={mouthProps} />
      ) : face === "glowing" ? (
        <G>
          <Path d={`M ${CX - 11} ${CY + 9} Q ${CX} ${CY + 27} ${CX + 11} ${CY + 9} Z`} fill={INK} />
          <Ellipse cx={CX} cy={CY + 18} rx={5} ry={3} fill={palette.candy.face} />
        </G>
      ) : face === "sleepy" ? (
        <Ellipse cx={CX} cy={CY + 14} rx={3.5} ry={2.5} fill={INK} />
      ) : face === "misses" ? (
        <Ellipse cx={CX} cy={CY + 15} rx={4} ry={4.5} fill={INK} />
      ) : face === "longs" ? (
        <Path
          d={`M ${CX - 9} ${CY + 15} Q ${CX - 4.5} ${CY + 11} ${CX} ${CY + 15} Q ${CX + 4.5} ${CY + 19} ${CX + 9} ${CY + 15}`}
          stroke={INK}
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
        />
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
      <Ellipse cx={78} cy={70} rx={10} ry={16} fill={art.sparkle} opacity={0.6} transform="rotate(20 78 70)" />
      <Path d={sparklePath(124, 72, 9)} fill={palette.star.face} />
      <Path d={sparklePath(70, 146, 7)} fill={palette.candy.face} />
      <Path d={sparklePath(132, 150, 6)} fill={palette.primary.face} />
      <Path d={sparklePath(98, 164, 5)} fill={palette.sky.face} />
      {/* Sleepy face peeking through the shell */}
      <G stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none">
        <Path d="M 80 112 Q 87 118 94 112" />
        <Path d="M 106 112 Q 113 118 120 112" />
      </G>
      <Ellipse cx={74} cy={124} rx={7} ry={4} fill={CHEEK} opacity={0.7} />
      <Ellipse cx={126} cy={124} rx={7} ry={4} fill={CHEEK} opacity={0.7} />
      <Path
        d={EGG_CRACK}
        stroke={palette.star.slab}
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
        stroke={tokens.moon}
        strokeWidth={2.5}
        strokeDasharray="4 5"
        strokeLinecap="round"
        fill="none"
      />
      {pts.slice(1).map(([x, y], i) => (
        <Path key={i} d={sparklePath(x, y, 5 - i)} fill={tokens.star[100]} />
      ))}
    </G>
  );
}
