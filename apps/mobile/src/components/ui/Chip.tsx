import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { colors, fonts, palette, radii, spacing, surface, Tone } from "../../lib/design-system";

interface ChipProps {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Rounded tag. Selected chips fill with their tone; pressable chips get a slab. */
export function Chip({ label, tone = "primary", icon, selected = false, onPress, style }: ChipProps) {
  const p = palette[tone];

  let fill: ViewStyle;
  let textColor: string;
  if (selected) {
    fill = { backgroundColor: p.face, borderColor: p.face, borderBottomColor: p.slab };
    textColor = p.on;
  } else if (onPress) {
    fill = {
      backgroundColor: surface.raised,
      borderColor: colors.border.chunky,
      borderBottomColor: surface.slab,
    };
    textColor = colors.text.primary;
  } else {
    fill = { backgroundColor: p.soft, borderColor: "transparent", borderBottomColor: "transparent" };
    textColor = p.face;
  }

  const body = (
    <View style={[styles.chip, fill, style]}>
      {icon ? <Ionicons name={icon} size={14} color={selected ? p.on : p.face} /> : null}
      <AppText variant="labelLong" color={textColor} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </View>
  );

  if (!onPress) return body;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignSelf: "flex-start",
  },
  label: { fontFamily: fonts.heading },
});
