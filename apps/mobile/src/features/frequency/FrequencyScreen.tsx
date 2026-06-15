import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Canvas, Circle, RadialGradient, vec, BlurMask } from '@shopify/react-native-skia';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { colors, typography, spacing, radii } from '../../lib/design-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = SCREEN_WIDTH - spacing.lg * 2;

function ScoreGlow() {
  return (
    <Canvas style={{ width: 220, height: 220, position: 'absolute' }}>
      <Circle cx={110} cy={110} r={100} opacity={0.12}>
        <RadialGradient c={vec(110, 110)} r={100} colors={['#B14CFF', '#6E3BFF', 'transparent']} />
        <BlurMask blur={30} style="normal" />
      </Circle>
      <Circle cx={110} cy={110} r={70} color="#B14CFF" opacity={0.06} style="stroke" strokeWidth={1}>
        <BlurMask blur={10} style="normal" />
      </Circle>
    </Canvas>
  );
}

export function FrequencyScreen() {
  return (
    <ScreenWrapper>
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.header}
        >
          <Text style={typography.label}>FREQUENCY</Text>
          <Text style={typography.h1}>Signal</Text>
        </MotiView>

        {/* Score hero */}
        <MotiView
          from={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12, delay: 200 }}
          style={styles.scoreHero}
        >
          <ScoreGlow />
          <Text style={styles.scoreNumber}>742</Text>
          <Text style={styles.scoreUnit}>FREQ</Text>
          <View style={styles.trendRow}>
            <Ionicons name="trending-up" size={14} color={colors.state.harmony} />
            <Text style={styles.trendText}>+12 this week</Text>
          </View>
        </MotiView>

        {/* Breakdown */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
        >
          <Text style={[typography.label, { marginBottom: spacing.md }]}>SCORE BREAKDOWN</Text>

          {[
            { label: 'Rituals', value: 340, icon: 'flame' as const, color: '#FF6B6B' },
            { label: 'Consistency', value: 220, icon: 'time' as const, color: '#4DD6FF' },
            { label: 'Astro Alignment', value: 120, icon: 'planet' as const, color: '#B14CFF' },
            { label: 'Social', value: 62, icon: 'people' as const, color: '#66F2FF' },
          ].map((item, index) => (
            <MotiView
              key={item.label}
              from={{ opacity: 0, translateX: -16 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'spring', damping: 14, delay: 500 + index * 80 }}
            >
              <TouchableOpacity style={styles.breakdownRow} activeOpacity={0.6}>
                <BlurView intensity={8} tint="dark" style={styles.breakdownInner}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownFill,
                          {
                            width: `${(item.value / 340) * 100}%`,
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.breakdownValue, { color: item.color }]}>{item.value}</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            </MotiView>
          ))}
        </MotiView>

        {/* Synergy Level */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 900 }}
          style={styles.synergyBox}
        >
          <BlurView intensity={12} tint="dark" style={styles.synergyInner}>
            <Text style={typography.label}>SYNERGY LEVEL</Text>
            <Text style={styles.synergyLevel}>Gamma</Text>
            <Text style={styles.synergyDesc}>Next level: Delta at 800 FREQ</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '42%' }]} />
            </View>
          </BlurView>
        </MotiView>
      </View>
    </SafeAreaView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  scoreHero: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    marginBottom: spacing.xl,
  },
  scoreNumber: {
    ...typography.score,
    fontSize: 72,
  },
  scoreUnit: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.text.tertiary,
    marginTop: -4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  trendText: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.state.harmony,
  },
  breakdownRow: {
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  breakdownInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 120,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    ...typography.body,
    fontSize: 13,
    color: colors.text.secondary,
  },
  breakdownRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border.subtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 2,
  },
  breakdownValue: {
    ...typography.mono,
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  synergyBox: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.xl,
  },
  synergyInner: {
    padding: spacing.lg,
  },
  synergyLevel: {
    ...typography.hero,
    fontSize: 36,
    color: colors.primary.light,
    marginBottom: spacing.xs,
  },
  synergyDesc: {
    ...typography.bodySmall,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border.subtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.core,
    borderRadius: 2,
  },
});
