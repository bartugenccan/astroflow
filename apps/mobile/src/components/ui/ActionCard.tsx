import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../lib/design-system';
import { DailyAction, RitualType } from '@astroflow/shared';
import { getRitualLabel } from '../../lib/helpers';

interface ActionCardProps {
  action: DailyAction;
  onComplete: (id: string) => void;
}

export function ActionCard({ action, onComplete }: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, action.completed && styles.completed]}
      onPress={() => onComplete(action.id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.typeTag}>
          <Text style={styles.typeLabel}>{getRitualLabel(action.ritualType)}</Text>
        </View>
        <Text style={typography.label}>{action.durationMinutes} MIN</Text>
      </View>

      <Text style={styles.title}>{action.title}</Text>
      <Text style={styles.description}>{action.description}</Text>

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Ionicons name="flash" size={14} color={colors.primary.mid} />
          <Text style={styles.statText}>+{action.frequencyBoost} FREQ</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="battery-charging" size={14} color={colors.state.stress} />
          <Text style={styles.statText}>{action.energyCost} NRG</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  completed: {
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeTag: {
    backgroundColor: 'rgba(110, 59, 255, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  typeLabel: {
    ...typography.label,
    fontSize: 10,
    color: colors.primary.light,
  },
  title: {
    ...typography.h3,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySmall,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.label,
    fontSize: 11,
    color: colors.text.secondary,
  },
});
