import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { colors, typography, spacing, radii } from '../../lib/design-system';

const PLANETS = [
  { name: 'Sun', sign: 'Gemini', degree: 23, house: 7, icon: 'sunny' as const },
  { name: 'Moon', sign: 'Scorpio', degree: 5, house: 9, icon: 'moon' as const },
  { name: 'Mercury', sign: 'Taurus', degree: 18, house: 6, icon: 'flash' as const },
  { name: 'Venus', sign: 'Cancer', degree: 12, house: 8, icon: 'heart' as const },
  { name: 'Mars', sign: 'Leo', degree: 29, house: 10, icon: 'flame' as const },
  { name: 'Jupiter', sign: 'Pisces', degree: 7, house: 2, icon: 'star' as const },
  { name: 'Saturn', sign: 'Aquarius', degree: 14, house: 1, icon: 'planet' as const },
];

export function AstrologyScreen() {
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
          <Text style={typography.label}>COSMIC MAP</Text>
          <Text style={typography.h1}>Your Chart</Text>
        </MotiView>

        {/* Big 3 */}
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 14, delay: 200 }}
          style={styles.bigThree}
        >
          <BlurView intensity={12} tint="dark" style={styles.bigThreeInner}>
            {[
              { label: 'Sun', value: 'Gemini 23deg', icon: 'sunny' as const, color: '#FFD700' },
              { label: 'Moon', value: 'Scorpio 5deg', icon: 'moon' as const, color: '#B6FFFF' },
              { label: 'Rising', value: 'Capricorn 18deg', icon: 'arrow-up-circle' as const, color: '#B14CFF' },
            ].map((item, i) => (
              <View key={item.label} style={styles.bigThreeItem}>
                <Ionicons name={item.icon} size={20} color={item.color} />
                <Text style={styles.bigThreeLabel}>{item.label}</Text>
                <Text style={[styles.bigThreeValue, { color: item.color }]}>{item.value}</Text>
              </View>
            ))}
          </BlurView>
        </MotiView>

        {/* Planets */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
        >
          <Text style={[typography.label, { marginBottom: spacing.md, marginTop: spacing.xl }]}>
            PLANETARY POSITIONS
          </Text>

          {PLANETS.map((planet, index) => (
            <MotiView
              key={planet.name}
              from={{ opacity: 0, translateX: -16 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'spring', damping: 14, delay: 450 + index * 60 }}
            >
              <TouchableOpacity style={styles.planetRow} activeOpacity={0.6}>
                <BlurView intensity={8} tint="dark" style={styles.planetRowInner}>
                  <View style={styles.planetLeft}>
                    <Ionicons name={planet.icon} size={18} color={colors.primary.mid} />
                    <View>
                      <Text style={styles.planetName}>{planet.name}</Text>
                      <Text style={styles.planetHouse}>House {planet.house}</Text>
                    </View>
                  </View>
                  <View style={styles.planetRight}>
                    <Text style={styles.planetSign}>{planet.sign}</Text>
                    <Text style={styles.planetDegree}>{planet.degree}degree</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            </MotiView>
          ))}
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
  bigThree: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  bigThreeInner: {
    flexDirection: 'row',
    padding: spacing.lg,
  },
  bigThreeItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  bigThreeLabel: {
    ...typography.label,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  bigThreeValue: {
    ...typography.body,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  planetRow: {
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  planetRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  planetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planetName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  planetHouse: {
    ...typography.bodySmall,
    fontSize: 11,
  },
  planetRight: {
    alignItems: 'flex-end',
  },
  planetSign: {
    ...typography.body,
    fontSize: 13,
    color: colors.primary.light,
    fontWeight: '500',
  },
  planetDegree: {
    ...typography.bodySmall,
    fontSize: 10,
  },
});
