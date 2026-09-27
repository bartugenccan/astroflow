import React, { useCallback } from "react";
import { StyleSheet, ViewStyle, ActivityIndicator, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useReducedMotion,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { AppText } from "./AppText";
import {
  colors,
  gradients,
  radii,
  spacing,
  motion,
  fonts,
} from "../../lib/design-system";

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  variant?: "solid" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

/** Primary CTA — gold gradient fill, spring press + haptic. */
export function GoldButton({
  label,
  onPress,
  variant = "solid",
  loading = false,
  disabled = false,
  style,
  icon,
}: GoldButtonProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const inactive = disabled || loading;
  // Reduce-motion: no scale travel — a brief dim still confirms the press.
  const pressScale = reduced ? 1 : 0.97;
  const solid = variant === "solid";

  const fire = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const tap = Gesture.Tap()
    .enabled(!inactive)
    .onBegin(() => {
      "worklet";
      scale.value = withSpring(pressScale, motion.spring.snappy);
    })
    .onFinalize(() => {
      "worklet";
      scale.value = withSpring(1, motion.spring.snappy);
    })
    .onEnd(() => {
      "worklet";
      runOnJS(fire)();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: reduced && scale.value < 1 ? 0.85 : 1,
  }));

  const body = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color={solid ? colors.text.onGold : colors.gold[300]} />
      ) : (
        <>
          {icon}
          {/* No adjustsFontSizeToFit: the label's row is shrink-wrapped, so the
              first measure pass saw almost no width and the text was shrunk to
              a sliver ("Add a person" rendered tiny; Android also ignores
              minimumFontScale). Full size, wrapping to a second line if a
              translation is ever that long. */}
          <AppText
            variant="heading"
            numberOfLines={2}
            style={[
              styles.label,
              { color: solid ? colors.text.onGold : colors.gold[300] },
            ]}
          >
            {label}
          </AppText>
        </>
      )}
    </View>
  );

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={[{ opacity: inactive ? 0.5 : 1 }, style]}
      >
        <Animated.View style={animStyle}>
        {solid ? (
          <LinearGradient
            colors={gradients.goldButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
          >
            {body}
          </LinearGradient>
        ) : (
          <View style={[styles.container, styles.ghost]}>{body}</View>
        )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: "transparent",
  },
  inner: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  label: {
    flexShrink: 1,
    textAlign: "center",
    fontFamily: fonts.sansSemiBold,
    letterSpacing: 0.3,
  },
});
