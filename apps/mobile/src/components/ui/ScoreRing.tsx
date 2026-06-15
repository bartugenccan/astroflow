import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { colors, typography, spacing, radii } from '../../lib/design-system';

interface ScoreRingProps {
  score: number;
  size?: number;
}

export function ScoreRing({ score, size = 160 }: ScoreRingProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(score / 100, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, animatedProgress]);

  const normalizedScore = Math.min(Math.max(score, 0), 1000);
  const displayScore = Math.round(normalizedScore);

  const ringWidth = 4;
  const gap = 8;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ring track */}
      <View style={[styles.track, { width: size, height: size, borderRadius: size / 2 }]} />

      {/* Score text */}
      <View style={styles.center}>
        <Text style={[typography.score, { fontSize: size * 0.28 }]}>{displayScore}</Text>
        <Text style={[typography.label, { marginTop: spacing.xs }]}>FREQ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: colors.border.medium,
    opacity: 0.3,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
