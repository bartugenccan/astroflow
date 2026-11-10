import React, { useEffect } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import Animated, {
  Easing,
  SharedValue,
  interpolate,
  Extrapolation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { constellationArt } from "../../components/aster/constellationArt";
import { colors } from "../../lib/design-system";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const STAR_MS = 110;
const LINE_MS = 150;
const MAX_MS = 2800;

interface ConstellationFigureProps {
  /** A key from ALL_CONSTELLATIONS. Unknown keys render nothing. */
  constellation: string;
  size: number;
  /** Draw on: stars appear dot by dot, then the lines trace between them. */
  animate?: boolean;
  /** Change to replay the draw. */
  playKey?: number;
  /** Delay before the draw starts (ms). */
  delay?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * A constellation's stick figure. Stars are luminous, so they may glow; the
 * lines use the violet text token. With reduce-motion on, the figure is
 * simply there — no draw.
 */
export function ConstellationFigure({
  constellation,
  size,
  animate = true,
  playKey = 0,
  delay = 0,
  style,
  accessibilityLabel,
}: ConstellationFigureProps) {
  const art = constellationArt(constellation);
  const reduced = useReducedMotion();
  const still = !animate || reduced;
  const progress = useSharedValue(still ? 1 : 0);

  const nStars = art?.points.length ?? 0;
  const nLines = art?.lines.length ?? 0;
  const rawMs = nStars * STAR_MS + nLines * LINE_MS;
  const total = Math.min(MAX_MS, rawMs);
  const starShare = rawMs > 0 ? (nStars * STAR_MS) / rawMs : 1;

  useEffect(() => {
    if (still) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    const timer = setTimeout(() => {
      progress.value = withTiming(1, { duration: total, easing: Easing.inOut(Easing.quad) });
    }, delay);
    return () => clearTimeout(timer);
  }, [still, playKey, total, delay, progress]);

  if (!art) return null;

  const pad = size * 0.1;
  const span = size - pad * 2;
  const xy = (i: number) => {
    const [x, y] = art.points[i];
    return { x: pad + x * span, y: pad + y * span };
  };
  const coreR = Math.max(1.6, size * 0.022);
  const strokeW = Math.max(1, size * 0.011);

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? "yes" : "no-hide-descendants"}
    >
      <Svg width={size} height={size}>
        {art.lines.map(([a, b], j) => {
          const p = xy(a);
          const q = xy(b);
          const start = starShare + (j / Math.max(1, nLines)) * (1 - starShare);
          const end = starShare + ((j + 1) / Math.max(1, nLines)) * (1 - starShare);
          return (
            <FigureLine
              key={`l${j}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              width={strokeW}
              progress={progress}
              start={start}
              end={end}
            />
          );
        })}
        {art.points.map((_, i) => {
          const p = xy(i);
          const bright = art.bright?.includes(i) ?? false;
          const start = (i / Math.max(1, nStars)) * starShare;
          const end = ((i + 1) / Math.max(1, nStars)) * starShare;
          return (
            <FigureStar
              key={`s${i}`}
              cx={p.x}
              cy={p.y}
              r={bright ? coreR * 1.5 : coreR}
              bright={bright}
              progress={progress}
              start={start}
              end={end}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function FigureStar({
  cx,
  cy,
  r,
  bright,
  progress,
  start,
  end,
}: {
  cx: number;
  cy: number;
  r: number;
  bright: boolean;
  progress: SharedValue<number>;
  start: number;
  end: number;
}) {
  const glowProps = useAnimatedProps(() => {
    const k = interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP);
    return { opacity: k, r: r * (bright ? 3.2 : 2.6) * (0.4 + 0.6 * k) };
  });
  const coreProps = useAnimatedProps(() => {
    const k = interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP);
    // A tiny overshoot so each star "pops" into place.
    const pop = k < 1 ? 0.5 + k * 0.8 : 1;
    return { opacity: k, r: r * pop };
  });
  return (
    <>
      <AnimatedCircle cx={cx} cy={cy} fill={bright ? colors.glow.star : colors.glow.starSoft} animatedProps={glowProps} />
      <AnimatedCircle cx={cx} cy={cy} fill={bright ? colors.star[200] : colors.star[100]} animatedProps={coreProps} />
    </>
  );
}

function FigureLine({
  x1,
  y1,
  x2,
  y2,
  width,
  progress,
  start,
  end,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  progress: SharedValue<number>;
  start: number;
  end: number;
}) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const props = useAnimatedProps(() => {
    const k = interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP);
    return { strokeDashoffset: length * (1 - k), opacity: k > 0 ? 0.85 : 0 };
  });
  return (
    <AnimatedLine
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={colors.text.violet}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={[length, length]}
      animatedProps={props}
    />
  );
}
