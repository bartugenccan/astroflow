import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radii } from '../../lib/design-system';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export function GlassCard({ children, style, intensity = 20 }: GlassCardProps) {
  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      style={[styles.card, style]}
    >
      <View style={styles.inner}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.glow,
    overflow: 'hidden',
  },
  inner: {
    padding: 20,
    backgroundColor: colors.surface.glass,
  },
});
