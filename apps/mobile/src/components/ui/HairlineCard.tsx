import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { colors, radii, spacing, shadows } from "../../lib/design-system";

interface HairlineCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
}

/** Ink card with the signature 1px gold hairline border. Replaces GlassCard. */
export function HairlineCard({
  children,
  style,
  padded = true,
  elevated = false,
}: HairlineCardProps) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        elevated && shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ink[900],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: "hidden",
  },
  padded: {
    padding: spacing.xl,
  },
});
