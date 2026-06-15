import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FrequencyAnchor } from '../../components/FrequencyAnchor';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { GlowButton } from '../../components/ui/GlowButton';
import { colors, typography, spacing, radii } from '../../lib/design-system';
import { EnergyState, RitualType, DailyAction } from '@astroflow/shared';

interface ActivityRec {
  type: string;
  intensity: 'low' | 'medium' | 'high';
  duration: number;
  title: string;
  description: string;
  frequencyBoost: number;
  astroReason: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MOCK_ACTIVITIES: ActivityRec[] = [
  {
    type: 'strength',
    intensity: 'high',
    duration: 45,
    title: 'Agirlik Antrenmani',
    description:
      'Mars karesi enerjiyi topraklamak icin agir kaldir. Kas grubu izolasyonu yerine compound hareketler yap.',
    frequencyBoost: 24,
    astroReason: 'Mars 3. evde kare acida - fiziksel cikis gerekiyor',
    icon: 'barbell',
  },
  {
    type: 'cardio',
    intensity: 'medium',
    duration: 25,
    title: 'Sprint Intervalleri',
    description:
      'Aktif enerjiyi kontrollu patlamalara kanalize et. 30 sn sprint + 60 sn yavas kosu dongusu.',
    frequencyBoost: 18,
    astroReason: 'Gunes kavusum etkisi - kardiyo penceresi acik',
    icon: 'speedometer',
  },
  {
    type: 'mobility',
    intensity: 'low',
    duration: 20,
    title: 'Dinamik Esneme ve Nefes',
    description:
      'Ay Boga gecisinde bedeni yumusat. Eklem mobilitesi ve diyafram nefesi kombinasyonu.',
    frequencyBoost: 10,
    astroReason: 'Ay Boga gecisi - topraklama ve yumusama zamani',
    icon: 'body',
  },
];

export function KineticSyncScreen() {
  const [selectedActivity, setSelectedActivity] = useState<ActivityRec | null>(
    null
  );

  const handleStartSession = useCallback(() => {
    // TODO: Start session timer
  }, []);

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return colors.state.overload;
      case 'medium':
        return colors.state.momentum;
      case 'low':
        return colors.state.harmony;
      default:
        return colors.text.secondary;
    }
  };

  const getIntensityLabel = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return 'Yuksek';
      case 'medium':
        return 'Orta';
      case 'low':
        return 'Dusuk';
      default:
        return '';
    }
  };

  return (
    <ScreenWrapper>
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.header}
        >
          <Text style={typography.label}>KINETIC SYNC</Text>
          <Text style={typography.h1}>Hareket Haritasi</Text>
          <Text style={typography.body}>
            Gezegen konumlarina gore bugun yapman gereken fiziksel aktiviteler.
          </Text>
        </MotiView>

        {/* Energy State */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
          style={styles.stateSection}
        >
          <LinearGradient
            colors={['rgba(110, 59, 255, 0.1)', 'rgba(177, 76, 255, 0.05)']}
            style={styles.stateGlow}
          >
            <FrequencyAnchor state={EnergyState.Momentum} size={100} />
            <View style={styles.stateInfo}>
              <Text style={[typography.label, { fontSize: 10 }]}>
                KINETIK DURUM
              </Text>
              <Text style={[typography.h2, { color: colors.state.momentum }]}>
                Yuksek Enerji
              </Text>
              <Text style={typography.bodySmall}>
                Mars ve Gunes aktif pozisyonda. Fiziksel cikis icin en ideal
                gun.
              </Text>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Activities */}
        <View style={styles.section}>
          <Text style={[typography.h3, { marginBottom: spacing.md }]}>
            Onerilen Aktiviteler
          </Text>

          {MOCK_ACTIVITIES.map((activity, index) => (
            <MotiView
              key={activity.type}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: 500,
                delay: 400 + index * 100,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.activityCard,
                  selectedActivity?.type === activity.type &&
                    styles.activityCardSelected,
                ]}
                onPress={() => setSelectedActivity(activity)}
                activeOpacity={0.7}
              >
                <View style={styles.activityHeader}>
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: `${getIntensityColor(
                          activity.intensity
                        )}15`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={activity.icon}
                      size={24}
                      color={getIntensityColor(activity.intensity)}
                    />
                  </View>

                  <View style={styles.activityMeta}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <View style={styles.activityTags}>
                      <View
                        style={[
                          styles.intensityTag,
                          {
                            backgroundColor: `${getIntensityColor(
                              activity.intensity
                            )}15`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.intensityText,
                            {
                              color: getIntensityColor(activity.intensity),
                            },
                          ]}
                        >
                          {getIntensityLabel(activity.intensity)}
                        </Text>
                      </View>
                      <Text style={styles.durationText}>
                        {activity.duration} dk
                      </Text>
                      <View style={styles.freqBadge}>
                        <Ionicons
                          name="flash"
                          size={10}
                          color={colors.primary.mid}
                        />
                        <Text style={styles.freqText}>
                          +{activity.frequencyBoost}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={styles.activityDesc}>{activity.description}</Text>

                <View style={styles.astroReason}>
                  <Ionicons
                    name="planet"
                    size={12}
                    color={colors.text.tertiary}
                  />
                  <Text style={styles.astroReasonText}>
                    {activity.astroReason}
                  </Text>
                </View>
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Start Session */}
        {selectedActivity && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            style={styles.startSection}
          >
            <GlowButton
              label={`${selectedActivity.title} - Baslat`}
              onPress={handleStartSession}
              size="lg"
            />
          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.base,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  stateSection: {
    marginBottom: spacing.xl,
  },
  stateGlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.cardBorder,
    padding: spacing.lg,
  },
  stateInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  activityCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  activityCardSelected: {
    borderColor: colors.border.glow,
    borderWidth: 1.5,
  },
  activityHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  activityTitle: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: 4,
  },
  activityTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  intensityTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  intensityText: {
    ...typography.label,
    fontSize: 9,
  },
  durationText: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  freqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  freqText: {
    ...typography.label,
    fontSize: 10,
    color: colors.primary.mid,
  },
  activityDesc: {
    ...typography.body,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  astroReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  astroReasonText: {
    ...typography.bodySmall,
    fontSize: 11,
    fontStyle: 'italic',
  },
  startSection: {
    marginTop: spacing.md,
  },
});
