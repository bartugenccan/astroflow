import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { colors, typography, spacing, radii } from '../../lib/design-system';
import { EnergyState } from '@astroflow/shared';

const MEMBERS = [
  { name: 'Alex', state: EnergyState.Harmony, score: 812, online: true },
  { name: 'Maya', state: EnergyState.Momentum, score: 745, online: true },
  { name: 'Kai', state: EnergyState.Harmony, score: 698, online: false },
  { name: 'Zara', state: EnergyState.Stress, score: 567, online: true },
  { name: 'Leo', state: EnergyState.Momentum, score: 823, online: false },
];

function stateColor(s: EnergyState): string {
  return {
    [EnergyState.Harmony]: '#4DD6FF',
    [EnergyState.Momentum]: '#B14CFF',
    [EnergyState.Stress]: '#FF6B6B',
    [EnergyState.Overload]: '#FF4D4D',
  }[s];
}

export function CirclesScreen() {
  return (
    <ScreenWrapper>
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.header}
        >
          <Text style={typography.label}>CIRCLES</Text>
          <Text style={typography.h1}>Alpha Core</Text>
        </MotiView>

        {/* Collective frequency */}
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 14, delay: 200 }}
          style={styles.collectiveBox}
        >
          <LinearGradient
            colors={['rgba(110, 59, 255, 0.15)', 'rgba(77, 214, 255, 0.05)']}
            style={styles.collectiveInner}
          >
            <Text style={typography.label}>COLLECTIVE FREQUENCY</Text>
            <Text style={styles.collectiveScore}>684</Text>
            <View style={styles.collectiveMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="people" size={12} color={colors.text.tertiary} />
                <Text style={styles.metaText}>8 members</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="trending-up" size={12} color={colors.state.harmony} />
                <Text style={styles.metaText}>Rising</Text>
              </View>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Members */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
        >
          <Text style={[typography.label, { marginBottom: spacing.md, marginTop: spacing.xl }]}>
            MEMBERS
          </Text>

          {MEMBERS.map((member, index) => (
            <MotiView
              key={member.name}
              from={{ opacity: 0, translateX: -16 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'spring', damping: 14, delay: 500 + index * 60 }}
            >
              <TouchableOpacity style={styles.memberRow} activeOpacity={0.6}>
                <BlurView intensity={8} tint="dark" style={styles.memberInner}>
                  <View style={styles.memberLeft}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{member.name[0]}</Text>
                      {member.online && <View style={styles.onlineDot} />}
                    </View>
                    <View>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <View style={styles.stateRow}>
                        <View style={[styles.stateDot, { backgroundColor: stateColor(member.state) }]} />
                        <Text style={[styles.stateLabel, { color: stateColor(member.state) }]}>
                          {member.state.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.memberScore}>{member.score}</Text>
                </BlurView>
              </TouchableOpacity>
            </MotiView>
          ))}
        </MotiView>

        {/* Insight */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 900 }}
          style={styles.insightBox}
        >
          <BlurView intensity={12} tint="dark" style={styles.insightInner}>
            <Ionicons name="analytics" size={20} color={colors.primary.mid} />
            <Text style={styles.insightTitle}>Group Sync</Text>
            <Text style={styles.insightText}>
              Collective frequency is rising. Optimal alignment for collaboration today.
            </Text>
          </BlurView>
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
  header: {
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  collectiveBox: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  collectiveInner: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  collectiveScore: {
    ...typography.score,
    fontSize: 56,
  },
  collectiveMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  memberRow: {
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  memberInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(110, 59, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h3,
    fontSize: 16,
    color: colors.primary.light,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.state.harmony,
    borderWidth: 2,
    borderColor: colors.surface.base,
  },
  memberName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stateDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  stateLabel: {
    ...typography.label,
    fontSize: 9,
  },
  memberScore: {
    ...typography.mono,
    fontSize: 16,
    color: colors.primary.light,
    fontWeight: '600',
  },
  insightBox: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.xl,
  },
  insightInner: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  insightTitle: {
    ...typography.h3,
    fontSize: 16,
  },
  insightText: {
    ...typography.body,
    fontSize: 13,
  },
});
