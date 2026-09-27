import React from "react";
import { View, StyleSheet } from "react-native";
import { MotiView } from "moti";
import { PressableScale } from "./PressableScale";
import { useMotion } from "../../lib/motion";
import { colors, spacing, radii } from "../../lib/design-system";

interface DotRatingProps {
  value: number; // 0 = unset, 1..count
  onChange: (v: number) => void;
  count?: number;
  size?: number;
}

/** A 1..N tappable dot scale (used for the check-in conviction rating). */
export function DotRating({ value, onChange, count = 5, size = 34 }: DotRatingProps) {
  const m = useMotion();
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: count, now: value }}>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const filled = value >= n;
        return (
          <PressableScale
            key={n}
            hitSlop={6}
            scaleTo={0.82}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n}/${count}`}
            accessibilityState={{ selected: filled }}
            style={[
              styles.dot,
              { width: size, height: size, borderRadius: size / 2 },
              filled ? styles.dotFilled : styles.dotEmpty,
            ]}
          >
            {/* Filled dots "pop" in sequence up to the chosen value. */}
            <MotiView
              animate={{ scale: filled ? 1 : 0.4, opacity: filled ? 1 : 0 }}
              transition={m.spring("snappy", filled ? (n - 1) * 30 : 0)}
              style={[styles.fill, { borderRadius: size / 2 }]}
            />
          </PressableScale>
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
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.gold[400],
  },
  dotFilled: {
    borderColor: colors.gold[300],
  },
  dotEmpty: {
    backgroundColor: "transparent",
    borderColor: colors.border.hairlineStrong,
    borderRadius: radii.pill,
  },
});
