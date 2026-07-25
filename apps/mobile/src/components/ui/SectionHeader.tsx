import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, spacing } from "../../lib/design-system";

interface SectionHeaderProps {
  eyebrow?: string;
  title?: string;
}

/** Eyebrow label + optional serif title. */
export function SectionHeader({ eyebrow, title }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? (
        <AppText variant="label" color={colors.text.gold}>
          {eyebrow}
        </AppText>
      ) : null}
      {title ? (
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  title: {
    marginTop: spacing.xs,
  },
});
