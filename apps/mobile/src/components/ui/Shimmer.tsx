import React from "react";
import { StyleSheet, View, DimensionValue } from "react-native";
import { MotiView } from "moti";
import { useReducedMotion } from "react-native-reanimated";
import { colors, spacing } from "../../lib/design-system";

interface ShimmerLinesProps {
  lines?: number;
  widths?: DimensionValue[];
}

/** Gold shimmer placeholder lines used while AI content loads. */
export function ShimmerLines({ lines = 3, widths }: ShimmerLinesProps) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.wrap}>
      {Array.from({ length: lines }).map((_, i) => (
        <MotiView
          key={i}
          from={{ opacity: 0.08 }}
          animate={{ opacity: 0.2 }}
          transition={
            reduced
              ? { type: "timing", duration: 0 }
              : { loop: true, type: "timing", duration: 900, delay: i * 120 }
          }
          style={[
            styles.line,
            { width: widths?.[i] ?? (`${92 - i * 12}%` as DimensionValue) },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  line: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.gold[300],
  },
});
