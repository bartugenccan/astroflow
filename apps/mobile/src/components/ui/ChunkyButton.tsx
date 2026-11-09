import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { colors, motion, palette, radii, spacing, Tone, surface } from "../../lib/design-system";

export type ChunkyVariant = Tone | "ghost";
export type ChunkySize = "sm" | "md" | "lg";

interface ChunkyButtonProps {
  label: string;
  onPress: () => void;
  variant?: ChunkyVariant;
  size?: ChunkySize;
  icon?: React.ReactNode;
  /** Icon after the label instead of before. */
  iconRight?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** Uppercase Duolingo-style label (default). Sentence-case for long copy. */
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  haptic?: "light" | "medium" | "none";
}

const SIZES: Record<ChunkySize, { minHeight: number; depth: number; padH: number; radius: number }> = {
  sm: { minHeight: 40, depth: 3, padH: spacing.lg, radius: radii.sm },
  md: { minHeight: 50, depth: 4, padH: spacing.xl, radius: radii.md },
  lg: { minHeight: 56, depth: 5, padH: spacing.xl, radius: radii.md },
};

function toneColors(variant: ChunkyVariant) {
  if (variant === "ghost") {
    return {
      face: "transparent",
      slab: colors.border.chunky,
      on: colors.text.primary,
      border: colors.border.chunky,
    };
  }
  const p = palette[variant];
  return { face: p.face, slab: p.slab, on: p.on, border: "transparent" };
}

/**
 * The app's physical button. A solid slab sits `depth` px under the face (no
 * blurred shadow); pressing drives the face down onto the slab and releasing
 * springs it back up — the Duolingo "push".
 */
export function ChunkyButton({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  iconRight = false,
  loading = false,
  disabled = false,
  uppercase = true,
  style,
  accessibilityLabel,
  accessibilityHint,
  haptic = "medium",
}: ChunkyButtonProps) {
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const inactive = disabled || loading;
  const s = SIZES[size];
  const c = toneColors(variant);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * (s.depth - 1) }],
  }));

  const springTo = (v: number) => {
    press.value = reduced ? v : withSpring(v, motion.spring.snappy);
  };

  const handlePress = () => {
    if (haptic === "medium") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } else if (haptic === "light") {
      Haptics.selectionAsync().catch(() => undefined);
    }
    onPress();
  };

  const labelNode = (
    <AppText
      variant={uppercase ? "button" : "heading"}
      color={c.on}
      numberOfLines={2}
      style={[styles.label, !uppercase && styles.sentence]}
    >
      {label}
    </AppText>
  );

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => springTo(1)}
      onPressOut={() => springTo(0)}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={size === "sm" ? 4 : 0}
      style={[{ paddingBottom: s.depth }, inactive && styles.inactive, style]}
    >
      <View
        style={[
          styles.slab,
          { top: s.depth, borderRadius: s.radius, backgroundColor: c.slab },
        ]}
      />
      <Animated.View
        style={[
          styles.face,
          {
            minHeight: s.minHeight,
            paddingHorizontal: s.padH,
            borderRadius: s.radius,
            backgroundColor: variant === "ghost" ? surface.base : c.face,
            borderColor: c.border,
            borderWidth: variant === "ghost" ? 2 : 0,
          },
          faceStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={c.on} />
        ) : (
          <>
            {!iconRight ? icon : null}
            {labelNode}
            {iconRight ? icon : null}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inactive: { opacity: 0.45 },
  slab: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  face: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  label: { flexShrink: 1, textAlign: "center" },
  sentence: { fontSize: 16, letterSpacing: 0.2 },
});
