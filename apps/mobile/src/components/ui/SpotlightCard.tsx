import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { ChunkyButton } from "./ChunkyButton";
import { PressableScale } from "./PressableScale";
import { colors, depth, palette, radii, spacing, type Tone } from "../../lib/design-system";

interface SpotlightCardProps {
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Replaces the icon badge (e.g. a small Aster). */
  art?: React.ReactNode;
  eyebrow?: string;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean };
  /** A quiet second way out ("150 Toz ile +1", "Sonra"). */
  secondary?: { label: string; onPress: () => void; disabled?: boolean };
  style?: StyleProp<ViewStyle>;
}

/**
 * The one thing on a screen that must be seen: a new chapter opened, the
 * daily limit reached, a premium offer. A tinted card in the tone, a badge,
 * one primary button and at most one quiet link. Use at most one per screen;
 * if everything is a spotlight, nothing is.
 */
export function SpotlightCard({ tone = "primary", icon = "sparkles", art, eyebrow, title, body, cta, secondary, style }: SpotlightCardProps) {
  const p = palette[tone];
  return (
    <View
      style={[styles.card, { backgroundColor: p.soft, borderColor: p.face, borderBottomColor: p.slab }, style]}
      accessibilityRole="summary"
    >
      <View style={styles.top}>
        {art ?? (
          <View style={[styles.badge, { backgroundColor: p.face, borderBottomColor: p.slab }]}>
            <Ionicons name={icon} size={22} color={p.on} />
          </View>
        )}
        <View style={styles.text}>
          {eyebrow ? (
            <AppText variant="label" color={p.face} numberOfLines={1}>
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="heading">{title}</AppText>
          {body ? (
            <AppText variant="bodySmall" color={colors.text.secondary}>
              {body}
            </AppText>
          ) : null}
        </View>
      </View>
      {cta ? (
        <ChunkyButton
          label={cta.label}
          onPress={cta.onPress}
          variant={tone}
          loading={cta.loading}
          disabled={cta.disabled}
        />
      ) : null}
      {secondary ? (
        <PressableScale
          onPress={secondary.onPress}
          disabled={secondary.disabled}
          style={styles.secondary}
          accessibilityRole="button"
          accessibilityLabel={secondary.label}
        >
          <AppText variant="labelLong" color={secondary.disabled ? colors.text.tertiary : p.face}>
            {secondary.label}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderBottomWidth: 2 + depth.md,
  },
  top: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderBottomWidth: depth.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  secondary: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
});
