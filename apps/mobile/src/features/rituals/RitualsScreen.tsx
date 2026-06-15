import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { colors, typography, spacing, radii } from '../../lib/design-system';
import { RitualType } from '@astroflow/shared';

const RITUALS = [
  {
    type: RitualType.WaterProgramming,
    title: 'Water Programming',
    desc: 'Niyetini suya kodla. Ses frekansinla kristal yapi olustur.',
    streak: 7,
    icon: 'water' as const,
    route: '/cymatics',
  },
  {
    type: RitualType.KineticSync,
    title: 'Kinetic Sync',
    desc: 'Gezegen konumlarina gore fiziksel aktivite haritani gor.',
    streak: 5,
    icon: 'fitness' as const,
    route: '/kinetic-sync',
  },
  {
    type: RitualType.Breathwork,
    title: 'Breathwork',
    desc: 'Nefes teknigiyle sinir sistemini frekansina hizala.',
    streak: 12,
    icon: 'leaf' as const,
    route: null,
  },
  {
    type: RitualType.Grounding,
    title: 'Grounding',
    desc: 'Toprakla temas. Elektromanyetik alanini resetle.',
    streak: 3,
    icon: 'earth' as const,
    route: null,
  },
  {
    type: RitualType.FrequencyTuning,
    title: 'Frequency Tuning',
    desc: 'Ses dalgalari ve binaural beat ile frekans ayari.',
    streak: 1,
    icon: 'radio' as const,
    route: null,
  },
  {
    type: RitualType.LightExposure,
    title: 'Light Exposure',
    desc: 'Sirkadiyen ritim ve gunes isigi ile biyolojik saat ayari.',
    streak: 0,
    icon: 'sunny' as const,
    route: null,
  },
];

export function RitualsScreen() {
  const router = useRouter();

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
          <Text style={typography.label}>RITUALS</Text>
          <Text style={typography.h1}>Protocols</Text>
        </MotiView>

        {RITUALS.map((ritual, index) => (
          <MotiView
            key={ritual.type}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 14, delay: 200 + index * 80 }}
          >
            <TouchableOpacity
              style={styles.ritualCard}
              activeOpacity={0.6}
              onPress={() => {
                if (ritual.route) router.push(ritual.route as any);
              }}
            >
              <BlurView intensity={12} tint="dark" style={styles.ritualInner}>
                <View style={styles.ritualIcon}>
                  <Ionicons name={ritual.icon} size={28} color={colors.primary.mid} />
                </View>

                <View style={styles.ritualInfo}>
                  <Text style={styles.ritualTitle}>{ritual.title}</Text>
                  <Text style={styles.ritualDesc}>{ritual.desc}</Text>

                  <View style={styles.ritualMeta}>
                    {ritual.streak > 1 ? (
                      <View style={styles.streakBadge}>
                        <Ionicons name="flame" size={10} color="#FF4D4D" />
                        <Text style={styles.streakText}>{ritual.streak} day streak</Text>
                      </View>
                    ) : (
                      <View style={styles.streakBadge}>
                        <Text style={[styles.streakText, { color: colors.text.tertiary }]}>
                          {ritual.streak === 1 ? '1 day' : 'Start today'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Ionicons
                  name={ritual.route ? 'chevron-forward' : 'ellipse-outline'}
                  size={ritual.route ? 18 : 8}
                  color={ritual.route ? colors.text.secondary : colors.text.tertiary}
                />
              </BlurView>
            </TouchableOpacity>
          </MotiView>
        ))}
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
  ritualCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  ritualInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  ritualIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: 'rgba(110, 59, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualInfo: {
    flex: 1,
  },
  ritualTitle: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: 2,
  },
  ritualDesc: {
    ...typography.bodySmall,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  ritualMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    ...typography.label,
    fontSize: 10,
    color: '#FF4D4D',
  },
});
