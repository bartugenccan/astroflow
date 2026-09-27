import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/AppText";
import { PressableScale } from "./ui/PressableScale";
import { EnterView } from "../lib/motion";
import { colors, spacing, radii, blurIntensity } from "../lib/design-system";

interface PremiumGateProps {
  locked: boolean;
  hint: string;
  onUnlock: () => void;
  children: React.ReactNode;
  /** Blur strength over the gated content. */
  intensity?: number;
}

/**
 * Wraps premium content: when `locked`, the children render behind a blur with a
 * tappable unlock CTA. When unlocked, children pass through untouched.
 */
export function PremiumGate({
  locked,
  hint,
  onUnlock,
  children,
  intensity = blurIntensity.medium,
}: PremiumGateProps) {
  if (!locked) return <>{children}</>;

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.content}>
        {children}
      </View>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <PressableScale
        style={styles.overlay}
        onPress={onUnlock}
        scaleTo={0.98}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={hint}
      >
        <EnterView scale style={styles.overlayInner}>
          <View style={styles.badge}>
            <WigglingLock />
          </View>
          <AppText variant="heading" color={colors.text.primary} center style={styles.hint}>
            {hint}
          </AppText>
        </EnterView>
      </PressableScale>
    </View>
  );
}

/** Lock that gives one gentle wiggle on mount — "this opens". Still under reduce-motion. */
function WigglingLock() {
  const reduced = useReducedMotion();
  const r = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    const ease = Easing.inOut(Easing.quad);
    r.value = withDelay(
      450,
      withSequence(
        withTiming(-12, { duration: 90, easing: ease }),
        withTiming(10, { duration: 120, easing: ease }),
        withTiming(-6, { duration: 110, easing: ease }),
        withTiming(3, { duration: 100, easing: ease }),
        withTiming(0, { duration: 120, easing: ease }),
      ),
    );
  }, [reduced, r]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${r.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name="lock-closed" size={18} color={colors.gold[300]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  content: {
    opacity: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  overlayInner: {
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  hint: {
    flexShrink: 1,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
});
