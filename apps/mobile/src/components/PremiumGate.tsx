import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/AppText";
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
      <Pressable style={styles.overlay} onPress={onUnlock}>
        <View style={styles.badge}>
          <Ionicons name="lock-closed" size={18} color={colors.gold[300]} />
        </View>
        <AppText variant="heading" color={colors.text.primary} center>
          {hint}
        </AppText>
      </Pressable>
    </View>
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
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
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
