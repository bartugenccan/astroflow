import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  Circle,
  Path,
  RadialGradient,
  vec,
  BlurMask,
  Group,
  Fill,
  RoundedRect,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  phase: number;
}

interface Constellation {
  stars: [number, number][];
  opacity: number;
}

function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT * 1.2,
      radius: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function generateConstellations(): Constellation[] {
  return [
    {
      stars: [
        [SCREEN_WIDTH * 0.15, SCREEN_HEIGHT * 0.2],
        [SCREEN_WIDTH * 0.22, SCREEN_HEIGHT * 0.25],
        [SCREEN_WIDTH * 0.18, SCREEN_HEIGHT * 0.32],
        [SCREEN_WIDTH * 0.25, SCREEN_HEIGHT * 0.3],
        [SCREEN_WIDTH * 0.3, SCREEN_HEIGHT * 0.22],
      ],
      opacity: 0.12,
    },
    {
      stars: [
        [SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.15],
        [SCREEN_WIDTH * 0.78, SCREEN_HEIGHT * 0.12],
        [SCREEN_WIDTH * 0.82, SCREEN_HEIGHT * 0.2],
        [SCREEN_WIDTH * 0.75, SCREEN_HEIGHT * 0.25],
      ],
      opacity: 0.1,
    },
    {
      stars: [
        [SCREEN_WIDTH * 0.1, SCREEN_HEIGHT * 0.6],
        [SCREEN_WIDTH * 0.18, SCREEN_HEIGHT * 0.65],
        [SCREEN_WIDTH * 0.15, SCREEN_HEIGHT * 0.72],
        [SCREEN_WIDTH * 0.08, SCREEN_HEIGHT * 0.68],
      ],
      opacity: 0.08,
    },
  ];
}

export function CosmicBackground() {
  const time = useSharedValue(0);
  const stars = useMemo(() => generateStars(120), []);
  const constellations = useMemo(() => generateConstellations(), []);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(time);
  }, [time]);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {/* Deep space base */}
      <Fill color="#05070F" />

      {/* Nebula gradient 1 - bottom left */}
      <Circle cx={SCREEN_WIDTH * 0.1} cy={SCREEN_HEIGHT * 0.75} r={SCREEN_WIDTH * 0.8} opacity={0.06}>
        <RadialGradient
          c={vec(SCREEN_WIDTH * 0.1, SCREEN_HEIGHT * 0.75)}
          r={SCREEN_WIDTH * 0.8}
          colors={['#6E3BFF', '#0E1033', 'transparent']}
        />
        <BlurMask blur={60} style="normal" />
      </Circle>

      {/* Nebula gradient 2 - top right */}
      <Circle cx={SCREEN_WIDTH * 0.85} cy={SCREEN_HEIGHT * 0.2} r={SCREEN_WIDTH * 0.6} opacity={0.05}>
        <RadialGradient
          c={vec(SCREEN_WIDTH * 0.85, SCREEN_HEIGHT * 0.2)}
          r={SCREEN_WIDTH * 0.6}
          colors={['#B14CFF', '#07132A', 'transparent']}
        />
        <BlurMask blur={50} style="normal" />
      </Circle>

      {/* Nebula gradient 3 - mid right */}
      <Circle cx={SCREEN_WIDTH * 0.6} cy={SCREEN_HEIGHT * 0.5} r={SCREEN_WIDTH * 0.5} opacity={0.04}>
        <RadialGradient
          c={vec(SCREEN_WIDTH * 0.6, SCREEN_HEIGHT * 0.5)}
          r={SCREEN_WIDTH * 0.5}
          colors={['#4DD6FF', '#0A0F1F', 'transparent']}
        />
        <BlurMask blur={45} style="normal" />
      </Circle>

      {/* Constellation lines */}
      {constellations.map((constellation, ci) => (
        <Group key={`const-${ci}`} opacity={constellation.opacity}>
          {constellation.stars.slice(1).map((star, i) => {
            const prevStar = constellation.stars[i];
            const path = `M ${prevStar[0]} ${prevStar[1]} L ${star[0]} ${star[1]}`;
            return (
              <Path
                key={`line-${ci}-${i}`}
                path={path}
                color="#B6FFFF"
                style="stroke"
                strokeWidth={0.5}
                opacity={0.4}
              />
            );
          })}
          {constellation.stars.map((star, i) => (
            <Circle
              key={`node-${ci}-${i}`}
              cx={star[0]}
              cy={star[1]}
              r={2}
              color="#B6FFFF"
              opacity={0.6}
            >
              <BlurMask blur={3} style="normal" />
            </Circle>
          ))}
        </Group>
      ))}

      {/* Animated stars */}
      <Group>
        {stars.map((star, i) => {
          const twinkle = Math.sin(time.value * star.twinkleSpeed * 60 + star.phase) * 0.5 + 0.5;
          return (
            <Circle
              key={i}
              cx={star.x}
              cy={star.y}
              r={star.radius}
              color="#FFFFFF"
              opacity={star.opacity * (0.3 + twinkle * 0.7)}
            >
              {star.radius > 1.5 && <BlurMask blur={star.radius * 1.5} style="normal" />}
            </Circle>
          );
        })}
      </Group>

      {/* Large bright stars with glow */}
      <Group>
        {stars
          .filter((s) => s.radius > 1.6)
          .slice(0, 8)
          .map((star, i) => (
            <React.Fragment key={`bright-${i}`}>
              <Circle cx={star.x} cy={star.y} r={star.radius + 3} opacity={0.1}>
                <RadialGradient
                  c={vec(star.x, star.y)}
                  r={star.radius + 3}
                  colors={['#B6FFFF', 'transparent']}
                />
                <BlurMask blur={8} style="normal" />
              </Circle>
              <Circle cx={star.x} cy={star.y} r={star.radius} color="#FFFFFF" opacity={0.9}>
                <BlurMask blur={1} style="normal" />
              </Circle>
            </React.Fragment>
          ))}
      </Group>

      {/* Subtle horizontal light streaks */}
      {[0.15, 0.45, 0.72].map((yPos, i) => (
        <RoundedRect
          key={`streak-${i}`}
          x={-50}
          y={SCREEN_HEIGHT * yPos + Math.sin(time.value * 0.1 + i * 2) * 20}
          width={SCREEN_WIDTH + 100}
          height={1}
          r={1}
          opacity={0.03 + Math.sin(time.value * 0.05 + i) * 0.02}
          color="#B6FFFF"
        />
      ))}
    </Canvas>
  );
}
