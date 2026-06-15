import { StyleSheet } from 'react-native';

export const colors = {
  primary: {
    core: '#6E3BFF',
    mid: '#8A5CFF',
    light: '#B14CFF',
  },
  secondary: {
    deep: '#05070F',
    navy: '#07132A',
    indigo: '#0E1033',
  },
  accent: {
    cyan: '#66F2FF',
    sky: '#4DD6FF',
    ice: '#B6FFFF',
  },
  state: {
    harmony: '#4DD6FF',
    momentum: '#B14CFF',
    stress: '#FF6B6B',
    overload: '#FF4D4D',
  },
  surface: {
    base: '#05070F',
    elevated: '#0A0F1F',
    overlay: '#0E1033',
    card: 'rgba(110, 59, 255, 0.08)',
    cardBorder: 'rgba(110, 59, 255, 0.15)',
    glass: 'rgba(14, 16, 51, 0.6)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.4)',
    inverse: '#05070F',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    medium: 'rgba(255, 255, 255, 0.1)',
    glow: 'rgba(110, 59, 255, 0.3)',
  },
} as const;

export const typography = StyleSheet.create({
  hero: {
    fontFamily: 'Inter',
    fontSize: 40,
    fontWeight: '700' as const,
    letterSpacing: -1.2,
    lineHeight: 48,
    color: colors.text.primary,
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    lineHeight: 40,
    color: colors.text.primary,
  },
  h2: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.5,
    lineHeight: 32,
    color: colors.text.primary,
  },
  h3: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
    color: colors.text.primary,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 24,
    color: colors.text.secondary,
  },
  bodySmall: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 20,
    color: colors.text.tertiary,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    color: colors.text.tertiary,
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  score: {
    fontFamily: 'Inter',
    fontSize: 64,
    fontWeight: '300' as const,
    letterSpacing: -2,
    lineHeight: 72,
    color: colors.text.primary,
  },
});

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  glow: {
    shadowColor: colors.primary.core,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const blurIntensity = {
  light: 10,
  medium: 20,
  heavy: 40,
} as const;
