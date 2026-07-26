import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, spacing, radii } from "../../lib/design-system";

interface DotRatingProps {
  value: number; // 0 = unset, 1..count
  onChange: (v: number) => void;
  count?: number;
  size?: number;
}

/** A 1..N tappable dot scale (used for the check-in conviction rating). */
export function DotRating({ value, onChange, count = 5, size = 34 }: DotRatingProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const filled = value >= n;
        return (
          <Pressable
            key={n}
            hitSlop={6}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(n);
            }}
            style={[
              styles.dot,
              { width: size, height: size, borderRadius: size / 2 },
              filled ? styles.dotFilled : styles.dotEmpty,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
  },
  dot: {
    borderWidth: 1,
  },
  dotFilled: {
    backgroundColor: colors.gold[400],
    borderColor: colors.gold[300],
  },
  dotEmpty: {
    backgroundColor: "transparent",
    borderColor: colors.border.hairlineStrong,
    borderRadius: radii.pill,
  },
});
