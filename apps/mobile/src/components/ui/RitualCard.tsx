import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../lib/design-system';
import { Ritual, RitualType } from '@astroflow/shared';
import { getRitualLabel } from '../../lib/helpers';

interface RitualCardProps {
  ritual: Ritual;
}

const ritualIcons: Record<RitualType, keyof typeof Ionicons.glyphMap> = {
  [RitualType.WaterProgramming]: 'water',
  [RitualType.KineticSync]: 'fitness',
  [RitualType.Breathwork]: 'leaf',
  [RitualType.Grounding]: 'earth',
  [RitualType.LightExposure]: 'sunny',
  [RitualType.FrequencyTuning]: 'radio',
};

export function RitualCard({ ritual }: RitualCardProps) {
  const icon = ritualIcons[ritual.type] || 'sparkles';
  const hasStreak = ritual.streak > 1;

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={24} color={colors.primary.mid} />
      </View>

      <Text style={styles.title} numberOfLines={1}>{getRitualLabel(ritual.type)}</Text>

      {hasStreak && (
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={10} color={colors.state.overload} />
          <Text style={styles.streakText}>{ritual.streak}</Text>
        </View>
      )}

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min((ritual.totalCompletions / 50) * 100, 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.cardBorder,
    padding: spacing.md,
    alignItems: 'center',
    width: 100,
    marginRight: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: 'rgba(110, 59, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.bodySmall,
    fontSize: 11,
    textAlign: 'center',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 77, 0.12)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  streakText: {
    ...typography.label,
    fontSize: 9,
    color: colors.state.overload,
    marginLeft: 2,
  },
  progressTrack: {
    width: '100%',
    height: 2,
    backgroundColor: colors.border.subtle,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.core,
    borderRadius: 1,
  },
});
