import React, { useEffect, useId, useMemo } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, palette } from "../../lib/design-system";
import type { StarLook } from "./wishModel";
import { useScreenActive } from "../../components/ScreenActive";

/** A rounded five-point star, centred on (cx, cy), point up — Aster's silhouette without a face. */
export function starPath(cx: number, cy: number, outer: number, inner = outer * 0.5): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

interface Body {
  top: string;
  bottom: string;
  edge: string;
  halo: string | null;
  haloOpacity: number;
  /** Star radius as a share of half the box. */
  r: number;
}

const BODY: Record<Exclude<StarLook, "waiting">, Body> = {
  seed: { top: colors.star[100], bottom: colors.star[300], edge: colors.star[500], halo: null, haloOpacity: 0, r: 0.5 },
  spark: { top: colors.star[100], bottom: colors.star[400], edge: colors.star[500], halo: colors.star[400], haloOpacity: 0.35, r: 0.56 },
  glowing: { top: colors.star[100], bottom: colors.star[400], edge: colors.star[500], halo: colors.star[400], haloOpacity: 0.55, r: 0.58 },
  radiant: { top: colors.star[100], bottom: colors.star[400], edge: colors.star[600], halo: colors.star[300], haloOpacity: 0.7, r: 0.6 },
  // Resting: a soft moonlit star — calmer colour, same size and full opacity (never "dimmed").
  resting: { top: colors.text.primary, bottom: colors.moon, edge: colors.text.violet, halo: colors.moon, haloOpacity: 0.3, r: 0.56 },
};

interface WishStarGlyphProps {
  look: StarLook;
  size: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * One wish star, drawn in SVG. Glowing and radiant stars carry a soft halo
 * (luminous things may glow); a resting star turns moonlit rather than dim; a
 * seed waiting for the new moon is a little sprouting seed in a dashed ring.
 */
export function WishStarGlyph({ look, size, style }: WishStarGlyphProps) {
  const raw = useId();
  const id = useMemo(() => raw.replace(/[^a-zA-Z0-9]/g, ""), [raw]);
  const c = size / 2;

  if (look === "waiting") {
    return (
      <View style={[{ width: size, height: size }, style]} pointerEvents="none">
        <Svg width={size} height={size}>
          <Circle
            cx={c}
            cy={c}
            r={c * 0.86}
            stroke={palette.mint.face}
            strokeWidth={Math.max(1.5, size * 0.04)}
            strokeDasharray={`${size * 0.08} ${size * 0.07}`}
            strokeLinecap="round"
            fill={palette.mint.soft}
          />
          {/* Seed */}
          <Ellipse cx={c} cy={c + size * 0.1} rx={size * 0.17} ry={size * 0.21} fill={colors.star[300]} stroke={colors.star[600]} strokeWidth={size * 0.03} />
          {/* Sprout */}
          <Path
            d={`M${c} ${c - size * 0.08} Q${c - size * 0.02} ${c - size * 0.26} ${c + size * 0.12} ${c - size * 0.3}`}
            stroke={palette.mint.face}
            strokeWidth={size * 0.05}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  const b = BODY[look];
  const outer = c * b.r * 1.5;
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={b.top} />
            <Stop offset="1" stopColor={b.bottom} />
          </LinearGradient>
          {b.halo ? (
            <RadialGradient id={`h${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={b.halo} stopOpacity={b.haloOpacity} />
              <Stop offset="1" stopColor={b.halo} stopOpacity={0} />
            </RadialGradient>
          ) : null}
        </Defs>
        {b.halo ? <Circle cx={c} cy={c} r={c} fill={`url(#h${id})`} /> : null}
        {look === "radiant" ? (
          <G stroke={colors.star[200]} strokeWidth={Math.max(1, size * 0.025)} strokeLinecap="round">
            {[0, 1, 2, 3].map((i) => {
              const a = Math.PI / 4 + (i * Math.PI) / 2;
              return (
                <Line
                  key={i}
                  x1={c + Math.cos(a) * outer * 0.95}
                  y1={c + Math.sin(a) * outer * 0.95}
                  x2={c + Math.cos(a) * c * 0.95}
                  y2={c + Math.sin(a) * c * 0.95}
                />
              );
            })}
          </G>
        ) : null}
        <Path
          d={starPath(c, c + outer * 0.06, outer)}
          fill={`url(#b${id})`}
          stroke={b.edge}
          strokeWidth={Math.max(1.5, size * 0.035)}
          strokeLinejoin="round"
        />
        {/* Shine */}
        <Circle cx={c - outer * 0.22} cy={c - outer * 0.12} r={Math.max(1, outer * 0.11)} fill={colors.text.primary} opacity={0.85} />
      </Svg>
    </View>
  );
}

interface TwinkleProps {
  look: StarLook;
  children: React.ReactNode;
  /** Offsets the breathing so a sky of stars doesn't pulse in unison. */
  phase?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Gentle breathing for a star: brighter stars twinkle a little faster, a
 * resting one breathes slowly, a waiting seed stays still. Off with reduce-motion
 * and while the screen isn't on view.
 */
export function Twinkle({ look, children, phase = 0, style }: TwinkleProps) {
  const reduced = useReducedMotion();
  const active = useScreenActive();
  const s = useSharedValue(1);

  useEffect(() => {
    if (reduced || !active || look === "waiting" || look === "seed") {
      cancelAnimation(s);
      s.value = 1;
      return;
    }
    const amp = look === "radiant" ? 0.08 : look === "glowing" ? 0.06 : 0.04;
    const dur = look === "resting" ? 2600 : look === "radiant" ? 1300 : 1700;
    const ease = Easing.inOut(Easing.sin);
    s.value = withSequence(
      withTiming(1, { duration: Math.round((phase % 1) * dur) }),
      withRepeat(withTiming(1 + amp, { duration: dur, easing: ease }), -1, true),
    );
    return () => cancelAnimation(s);
  }, [look, phase, reduced, active, s]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
