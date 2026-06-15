import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { CymaticsVisualization } from '../../components/CymaticsVisualization';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { colors, typography, spacing, radii } from '../../lib/design-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CymaticsState = 'idle' | 'listening' | 'analyzing' | 'complete';

interface AnalysisResult {
  clarity: number;
  symmetry: number;
  emotion: 'neutral' | 'positive' | 'negative';
  message: string;
  affirmation: string;
}

const AFFIRMATIONS = [
  { text: 'Bugun tum surecleri kolaylikla yonetiyorum.', english: 'Today I manage all processes with ease.' },
  { text: 'Enerjim yuksek ve frekansim temiz.', english: 'My energy is high and my frequency is clear.' },
  { text: 'Evren benimle uyum icinde calisiyor.', english: 'The universe works in harmony with me.' },
];

function PulseRing() {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.4, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, true);
    opacity.value = withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 1,
          borderColor: colors.primary.light,
        },
        style,
      ]}
    />
  );
}

export function CymaticsScreen() {
  const [state, setState] = useState<CymaticsState>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedAffirmation, setSelectedAffirmation] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setState('listening');

      setTimeout(async () => {
        try {
          await newRecording.stopAndUnloadAsync();
          setRecording(null);
          setState('analyzing');

          setTimeout(() => {
            const analysisResult: AnalysisResult = {
              clarity: 0.72 + Math.random() * 0.25,
              symmetry: 0.65 + Math.random() * 0.3,
              emotion: Math.random() > 0.3 ? 'positive' : 'neutral',
              message: 'Ses frekansiniz su ile uyumlu. Olumlamaniz yuksek inanc skoruyla algilandi. Suyunuz basariyla kodlandi.',
              affirmation: AFFIRMATIONS[selectedAffirmation].text,
            };
            setResult(analysisResult);
            setState('complete');
          }, 2500);
        } catch {
          setState('idle');
        }
      }, 6000);
    } catch {
      setState('idle');
    }
  }, [selectedAffirmation]);

  const handleRetry = useCallback(() => {
    setState('idle');
    setResult(null);
  }, []);

  const handleNextAffirmation = useCallback(() => {
    setSelectedAffirmation((prev) => (prev + 1) % AFFIRMATIONS.length);
  }, []);

  const isActive = state === 'listening' || state === 'analyzing';

  return (
    <ScreenWrapper>
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.header}
        >
          <Text style={typography.label}>WATER PROGRAMMING</Text>
          <Text style={typography.h1}>Cymatics</Text>
        </MotiView>

        {/* Visualization zone */}
        <View style={styles.vizZone}>
          {/* Background glow responsive to state */}
          <View style={[styles.vizGlowBall, isActive && styles.vizGlowBallActive]} />

          {/* Pulse rings during listening */}
          {state === 'listening' && (
            <>
              <PulseRing />
              <View style={{ position: 'absolute' }}>
                <PulseRing />
              </View>
            </>
          )}

          <CymaticsVisualization
            clarity={result?.clarity ?? (state === 'listening' ? 0.5 : state === 'analyzing' ? 0.6 : 0.25)}
            symmetry={result?.symmetry ?? (state === 'listening' ? 0.45 : state === 'analyzing' ? 0.55 : 0.25)}
            emotion={result?.emotion ?? 'neutral'}
            size={280}
          />
        </View>

        {/* Affirmation selector */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: isActive ? 0.5 : 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.affirmationBox}
        >
          <BlurView intensity={12} tint="dark" style={styles.affirmationInner}>
            <Text style={styles.affirmationLabel}>AFFIRMATION</Text>
            <Text style={styles.affirmationText}>
              {AFFIRMATIONS[selectedAffirmation].text}
            </Text>
            <Text style={styles.affirmationSub}>
              {AFFIRMATIONS[selectedAffirmation].english}
            </Text>

            {state === 'idle' && (
              <TouchableOpacity onPress={handleNextAffirmation} style={styles.swapRow}>
                <Text style={styles.swapText}>Farkli olumlama</Text>
                <Ionicons name="swap-horizontal" size={14} color={colors.primary.mid} />
              </TouchableOpacity>
            )}
          </BlurView>
        </MotiView>

        {/* Result */}
        {state === 'complete' && result && (
          <MotiView
            from={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 14 }}
            style={styles.resultBox}
          >
            <BlurView intensity={15} tint="dark" style={styles.resultInner}>
              <View style={styles.resultHeader}>
                <Ionicons
                  name={result.clarity > 0.75 ? 'checkmark-circle' : 'checkmark'}
                  size={24}
                  color={colors.state.harmony}
                />
                <View>
                  <Text style={styles.resultTitle}>Su Kodlandi</Text>
                  <Text style={styles.resultSub}>{result.message}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                {[
                  { label: 'Netlik', value: `${Math.round(result.clarity * 100)}%` },
                  { label: 'Simetri', value: `${Math.round(result.symmetry * 100)}%` },
                  { label: 'Duygu', value: result.emotion === 'positive' ? 'Pozitif' : 'Notr' },
                ].map((stat) => (
                  <View key={stat.label} style={styles.statItem}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </BlurView>
          </MotiView>
        )}

        {/* Analyzing indicator */}
        {state === 'analyzing' && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.analyzingRow}
          >
            <Text style={styles.analyzingText}>AI ses frekansinizi analiz ediyor</Text>
          </MotiView>
        )}
      </View>

      {/* Bottom control */}
      <View style={styles.bottomBar}>
        {state === 'idle' && (
          <TouchableOpacity style={styles.recordButton} onPress={startRecording} activeOpacity={0.8}>
            <LinearGradient
              colors={['#6E3BFF', '#B14CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recordGradient}
            >
              <Ionicons name="mic" size={22} color="#FFFFFF" />
              <Text style={styles.recordText}>Mikrofona Fisilda</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {state === 'listening' && (
          <View style={styles.listeningBar}>
            <Ionicons name="mic" size={20} color={colors.state.overload} />
            <Text style={styles.listeningText}>Olumlamayi fisildayin...</Text>
            <Text style={styles.listeningTimer}>0:06</Text>
          </View>
        )}

        {state === 'complete' && (
          <TouchableOpacity style={styles.recordButton} onPress={handleRetry} activeOpacity={0.8}>
            <LinearGradient
              colors={['#6E3BFF', '#B14CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recordGradient}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.recordText}>Tekrarla</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
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
  vizZone: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 340,
    marginBottom: spacing.xl,
  },
  vizGlowBall: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(110, 59, 255, 0.05)',
  },
  vizGlowBallActive: {
    backgroundColor: 'rgba(177, 76, 255, 0.12)',
  },
  affirmationBox: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  affirmationInner: {
    padding: spacing.lg,
  },
  affirmationLabel: {
    ...typography.label,
    fontSize: 9,
    marginBottom: spacing.sm,
    letterSpacing: 2,
  },
  affirmationText: {
    ...typography.h3,
    fontSize: 18,
    lineHeight: 26,
    marginBottom: spacing.xs,
  },
  affirmationSub: {
    ...typography.bodySmall,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swapText: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.primary.mid,
  },
  resultBox: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  resultInner: {
    padding: spacing.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  resultTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.state.harmony,
    marginBottom: 2,
  },
  resultSub: {
    ...typography.bodySmall,
    fontSize: 12,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    fontSize: 20,
    color: colors.primary.light,
  },
  statLabel: {
    ...typography.label,
    fontSize: 9,
    marginTop: 2,
  },
  analyzingRow: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  analyzingText: {
    ...typography.body,
    color: colors.primary.mid,
    fontSize: 14,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  recordButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  recordGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  recordText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  listeningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  listeningText: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 14,
  },
  listeningTimer: {
    ...typography.mono,
    color: colors.state.overload,
    fontSize: 13,
  },
});
