import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { colors, palette, radii, spacing, surface, type Tone } from "../../lib/design-system";

interface SectionLinkProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  /** A count or short value shown before the chevron ("3", "Waxing"). */
  value?: string | number;
  /** A row inside a grouped list: no fill of its own. */
  bare?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * "More is one tap away": a single row with an icon, a label, an optional
 * count and a chevron. It is how a screen keeps its secondary information
 * without showing it all at once. Always at least 52pt tall.
 */
export function SectionLink({
  label,
  onPress,
  icon,
  tone = "primary",
  value,
  bare = false,
  accessibilityHint,
  style,
}: SectionLinkProps) {
  const p = palette[tone];
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={value !== undefined ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      style={[styles.row, !bare && styles.filled, style]}
    >
      {icon ? (
        <View style={[styles.icon, { backgroundColor: p.soft }]} importantForAccessibility="no-hide-descendants">
          <Ionicons name={icon} size={18} color={p.face} />
        </View>
      ) : null}
      <AppText variant="heading" style={styles.label} numberOfLines={2}>
        {label}
      </AppText>
      {value !== undefined ? (
        <AppText variant="numeric" color={colors.text.secondary}>
          {String(value)}
        </AppText>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filled: { borderRadius: radii.lg, backgroundColor: surface.card },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  label: { flex: 1 },
});
