import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  Path,
  RadialGradient,
  vec,
  BlurMask,
  Group,
} from '@shopify/react-native-skia';

interface CymaticsVisualizationProps {
  clarity: number;
  symmetry: number;
  emotion: 'neutral' | 'positive' | 'negative';
  size?: number;
}

function generateCrystalPath(
  symmetry: number,
  clarity: number,
  complexity: number = 6
): string {
  const centerX = 0;
  const centerY = 0;
  const points = complexity;
  let path = '';

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
    const wobble = (1 - symmetry) * 40;
    const jitter = Math.sin(i * 3.7) * wobble * (1 - clarity);

    const radius = 80 + jitter;

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    if (i === 0) {
      path += `M ${x} ${y}`;
    } else {
      const prevAngle = ((i - 1) / points) * Math.PI * 2 - Math.PI / 2;
      const prevWobble = (1 - symmetry) * 40;
      const prevJitter = Math.sin((i - 1) * 3.7) * prevWobble * (1 - clarity);
      const prevRadius = 80 + prevJitter;

      const cpAngle = (prevAngle + angle) / 2;
      const cpRadius = 80 + jitter * 0.7;

      const cpx = centerX + Math.cos(cpAngle) * cpRadius;
      const cpy = centerY + Math.sin(cpAngle) * cpRadius;

      path += ` Q ${cpx} ${cpy} ${x} ${y}`;
    }
  }

  path += ' Z';

  const innerPoints = Math.floor(points * 0.6);
  for (let i = 0; i < innerPoints; i++) {
    const angle = (i / innerPoints) * Math.PI * 2 - Math.PI / 2 + Math.PI / innerPoints;
    const innerRadius = 35 * clarity + 15 * symmetry;
    const wobble = (1 - symmetry) * 15 * (1 - clarity);
    const jitter = Math.cos(i * 4.2) * wobble;

    const x = centerX + Math.cos(angle) * (innerRadius + jitter);
    const y = centerY + Math.sin(angle) * (innerRadius + jitter);

    if (i === 0) {
      path += ` M ${x} ${y}`;
    } else {
      const prevAngle = ((i - 1) / innerPoints) * Math.PI * 2 - Math.PI / 2 + Math.PI / innerPoints;
      const cpAngle = (prevAngle + angle) / 2;
      const cpRadius = innerRadius + jitter * 0.5;

      const cpx = centerX + Math.cos(cpAngle) * cpRadius;
      const cpy = centerY + Math.sin(cpAngle) * cpRadius;

      path += ` Q ${cpx} ${cpy} ${x} ${y}`;
    }
  }

  path += ' Z';

  return path;
}

export function CymaticsVisualization({
  clarity,
  symmetry,
  emotion,
  size = 280,
}: CymaticsVisualizationProps) {
  const centerX = size / 2;
  const centerY = size / 2 + 20;

  const emotionColors = {
    neutral: ['#4DD6FF', '#66F2FF'],
    positive: ['#B14CFF', '#6E3BFF'],
    negative: ['#FF6B6B', '#FF4D4D'],
  };

  const [colorA, colorB] = emotionColors[emotion];

  const crystalPath = generateCrystalPath(symmetry, clarity);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ translateX: centerX }, { translateY: centerY }]}>
          {/* Outer glow field */}
          <Circle cx={0} cy={0} r={110} opacity={0.08 * (clarity + 0.3)}>
            <RadialGradient
              c={vec(0, 0)}
              r={110}
              colors={[colorA, 'transparent']}
            />
            <BlurMask blur={20} style="normal" />
          </Circle>

          {/* Mid resonance ring */}
          <Circle cx={0} cy={0} r={90} color={colorA} opacity={0.12 * (1 + clarity)} style="stroke" strokeWidth={1}>
            <BlurMask blur={8} style="normal" />
          </Circle>

          {/* Inner resonance ring */}
          <Circle cx={0} cy={0} r={55} color={colorB} opacity={0.2 * (1 + symmetry)} style="stroke" strokeWidth={1.5}>
            <BlurMask blur={4} style="normal" />
          </Circle>

          {/* Crystal geometry */}
          <Path
            path={crystalPath}
            color={colorA}
            opacity={0.15 + clarity * 0.25}
            style="fill"
          />
          <Path
            path={crystalPath}
            color={colorB}
            opacity={0.4 + symmetry * 0.4}
            style="stroke"
            strokeWidth={1.5}
          >
            <BlurMask blur={3 * (0.5 + clarity * 0.5)} style="normal" />
          </Path>

          {/* Core point */}
          <Circle cx={0} cy={0} r={3 + clarity * 4} color={colorB} opacity={0.7 + clarity * 0.3}>
            <BlurMask blur={6 * (0.5 + symmetry * 0.5)} style="normal" />
          </Circle>
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
