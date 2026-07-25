import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, spacing } from "../../lib/design-system";

/** A fine gold hairline with a four-point star at its centre. */
export function StarDivider() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Svg width={14} height={14} viewBox="0 0 14 14" style={styles.star}>
        <Path
          d="M7 0 L8.2 5.8 L14 7 L8.2 8.2 L7 14 L5.8 8.2 L0 7 L5.8 5.8 Z"
          fill={colors.gold[300]}
        />
      </Svg>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairlineStrong,
  },
  star: {
    opacity: 0.9,
  },
});
