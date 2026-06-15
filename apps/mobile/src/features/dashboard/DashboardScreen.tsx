import React, { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, useAnimationState } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { FrequencyAnchor } from '../../components/FrequencyAnchor';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { colors, typography, spacing, radii } from '../../lib/design-system';
import { getEnergyStateLabel } from '../../lib/helpers';
import { EnergyState, SynergyLevel, DailyAction, RitualType } from '@astroflow/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOCK_ACTIONS: DailyAction[] = [
  {
    id: '1',
    title: 'Cold Plunge Protocol',
    description: 'High kinetic charge. Cold exposure opens your frequency window.',
    ritualType: RitualType.WaterProgramming,
    energyCost: 3,
    frequencyBoost: 24,
    durationMinutes: 10,
    completed: false,
  },
  {
    id: '2',
    title: 'Strength Session',
    description: 'Mars transit channels into raw physical output.',
    ritualType: RitualType.KineticSync,
    energyCost: 5,
    frequencyBoost: 18,
    durationMinutes: 45,
    completed: false,
  },
  {
    id: '3',
    title: 'Solar Anchor',
    description: 'Circadian alignment window. Morning light exposure.',
    ritualType: RitualType.LightExposure,
    energyCost: 1,
    frequencyBoost: 12,
    durationMinutes: 15,
    completed: false,
  },
];

const MOCK_RITUALS = [
  { type: RitualType.WaterProgramming, streak: 7, totalCompletions: 34 },
  { type: RitualType.KineticSync, streak: 5, totalCompletions: 28 },
  { type: RitualType.Breathwork, streak: 12, totalCompletions: 45 },
  { type: RitualType.Grounding, streak: 3, totalCompletions: 15 },
  { type: RitualType.FrequencyTuning, streak: 1, totalCompletions: 8 },
];

const ritualIcons: Record<RitualType, keyof typeof Ionicons.glyphMap> = {
  [RitualType.WaterProgramming]: 'water',
  [RitualType.KineticSync]: 'fitness',
  [RitualType.Breathwork]: 'leaf',
  [RitualType.Grounding]: 'earth',
  [RitualType.LightExposure]: 'sunny',
  [RitualType.FrequencyTuning]: 'radio',
};

const ritualLabels: Record<RitualType, string> = {
  [RitualType.WaterProgramming]: 'Water',
  [RitualType.KineticSync]: 'Kinetic',
  [RitualType.Breathwork]: 'Breath',
  [RitualType.Grounding]: 'Ground',
  [RitualType.LightExposure]: 'Light',
  [RitualType.FrequencyTuning]: 'Tuning',
};

function OrbitingParticle({ delay, radius, speed }: { delay: number; radius: number; speed: number }) {
  const angle = useSharedValue(delay);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(delay + Math.PI * 2, { duration: speed, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle.value) * radius },
      { translateY: Math.sin(angle.value) * radius },
    ],
    opacity: 0.4 + Math.sin(angle.value * 2) * 0.3,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 3,
          height: 3,
          borderRadius: 2,
          backgroundColor: colors.primary.light,
        },
        style,
      ]}
    />
  );
}

export function DashboardScreen() {
  const currentState = EnergyState.Momentum;
  const stateColor = '#B14CFF';

  const handleCompleteAction = useCallback((id: string) => {}, []);

  return (
    <ScreenWrapper>
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top section - energy state + anchor */}
        <View style={styles.heroSection}>
          {/* Energy label */}
          <MotiView
            from={{ opacity: 0, translateY: -30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 800 }}
            style={styles.statePill}
          >
            <BlurView intensity={20} tint="dark" style={styles.statePillInner}>
              <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
              <Text style={styles.stateText}>
                {getEnergyStateLabel(currentState)}
              </Text>
            </BlurView>
          </MotiView>

          {/* Frequency Anchor - center stage */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 80, delay: 200 }}
            style={styles.anchorWrapper}
          >
            {/* Orbiting particles */}
            <OrbitingParticle delay={0} radius={100} speed={8000} />
            <OrbitingParticle delay={Math.PI * 0.66} radius={100} speed={8000} />
            <OrbitingParticle delay={Math.PI * 1.33} radius={100} speed={8000} />
            <OrbitingParticle delay={Math.PI * 0.33} radius={70} speed={6000} />
            <OrbitingParticle delay={Math.PI * 1.0} radius={70} speed={6000} />
            <OrbitingParticle delay={Math.PI * 1.66} radius={70} speed={6000} />

            {/* Outer ring */}
            <View style={styles.outerRing}>
              <FrequencyAnchor state={currentState} size={160} />
            </View>

            {/* Score display */}
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreValue}>742</Text>
              <Text style={styles.scoreUnit}>FREQ</Text>
            </View>
          </MotiView>

          {/* Synergy badge */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 500 }}
          >
            <LinearGradient
              colors={['rgba(110, 59, 255, 0.2)', 'rgba(177, 76, 255, 0.05)']}
              style={styles.synergyRow}
            >
              <Text style={styles.synergyLabel}>SYNERGY</Text>
              <View style={styles.synergyLevels}>
                {['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'].map((level, i) => (
                  <View
                    key={level}
                    style={[
                      styles.synergyStep,
                      level === 'Gamma' && styles.synergyStepActive,
                      i < 3 && styles.synergyStepPassed,
                    ]}
                  >
                    {i < 2 ? (
                      <Ionicons name="checkmark" size={8} color={colors.primary.mid} />
                    ) : (
                      <Text style={[styles.synergyStepText, level === 'Gamma' && styles.synergyStepTextActive]}>
                        {level[0]}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
              <Ionicons name="trending-up" size={14} color={colors.state.harmony} />
              <Text style={styles.synergyChange}>+12</Text>
            </LinearGradient>
          </MotiView>
        </View>

        {/* Daily Protocol Section */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 700, delay: 600 }}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Protocol</Text>
            <Text style={styles.sectionCount}>3 aligned</Text>
          </View>

          {MOCK_ACTIONS.map((action, index) => (
            <MotiView
              key={action.id}
              from={{ opacity: 0, translateX: -24 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 700 + index * 120 }}
            >
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => handleCompleteAction(action.id)}
                activeOpacity={0.6}
              >
                <BlurView intensity={12} tint="dark" style={styles.actionRowInner}>
                  <View style={styles.actionLeft}>
                    <View style={styles.actionIndex}>
                      <Text style={styles.actionIndexText}>{index + 1}</Text>
                    </View>
                    <View style={styles.actionInfo}>
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionDesc} numberOfLines={1}>
                        {action.description}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionRight}>
                    <Text style={styles.actionFreq}>+{action.frequencyBoost}</Text>
                    <Text style={styles.actionDuration}>{action.durationMinutes}m</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
                  </View>
                </BlurView>
              </TouchableOpacity>
            </MotiView>
          ))}
        </MotiView>

        {/* Rituals ribbon */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 700, delay: 900 }}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rituals</Text>
            <Text style={styles.sectionCount}>5 active</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ritualsScroll}
          >
            {MOCK_RITUALS.map((ritual) => (
              <TouchableOpacity key={ritual.type} style={styles.ritualPill} activeOpacity={0.6}>
                <BlurView intensity={10} tint="dark" style={styles.ritualPillInner}>
                  <Ionicons
                    name={ritualIcons[ritual.type]}
                    size={18}
                    color={colors.primary.mid}
                    style={styles.ritualIcon}
                  />
                  <Text style={styles.ritualLabel}>{ritualLabels[ritual.type]}</Text>
                  {ritual.streak > 1 && (
                    <View style={styles.miniStreak}>
                      <Ionicons name="flame" size={8} color="#FF4D4D" />
                      <Text style={styles.miniStreakText}>{ritual.streak}</Text>
                    </View>
                  )}
                </BlurView>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </MotiView>

        {/* Quick ritual CTA */}
        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 700, delay: 1100 }}
        >
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['#6E3BFF', '#B14CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.ctaText}>Activate Frequency Protocol</Text>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl + 80,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  statePill: {
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  statePillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.sm,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: colors.primary.light,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  stateText: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.text.primary,
  },
  anchorWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  outerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDisplay: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  scoreValue: {
    ...typography.score,
    fontSize: 32,
    letterSpacing: -0.5,
  },
  scoreUnit: {
    ...typography.label,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.text.tertiary,
    marginTop: -2,
  },
  synergyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    gap: spacing.sm,
  },
  synergyLabel: {
    ...typography.label,
    fontSize: 9,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  synergyLevels: {
    flexDirection: 'row',
    gap: 4,
  },
  synergyStep: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  synergyStepActive: {
    borderColor: colors.primary.light,
    backgroundColor: 'rgba(177, 76, 255, 0.15)',
  },
  synergyStepPassed: {
    borderColor: colors.primary.mid,
    backgroundColor: 'rgba(110, 59, 255, 0.1)',
  },
  synergyStepText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.text.tertiary,
  },
  synergyStepTextActive: {
    color: colors.primary.light,
  },
  synergyChange: {
    ...typography.label,
    fontSize: 10,
    color: colors.state.harmony,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sectionCount: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  actionRow: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  actionRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.md,
  },
  actionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIndexText: {
    ...typography.label,
    fontSize: 12,
    color: colors.primary.light,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDesc: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  actionRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  actionFreq: {
    ...typography.label,
    fontSize: 11,
    color: colors.primary.mid,
  },
  actionDuration: {
    ...typography.label,
    fontSize: 9,
    color: colors.text.tertiary,
  },
  ritualsScroll: {
    gap: spacing.sm,
  },
  ritualPill: {
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  ritualPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  ritualIcon: {
    marginRight: 2,
  },
  ritualLabel: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  miniStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.12)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
    marginLeft: 2,
  },
  miniStreakText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FF4D4D',
  },
  ctaButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  ctaText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
