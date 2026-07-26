import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radii } from "../../lib/design-system";

interface ShareButtonProps {
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
}

/** Small gold share affordance — a hairline-ringed icon button. */
export function ShareButton({ onPress, size = 34, style }: ShareButtonProps) {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.btn, { width: size, height: size }, style]}
    >
      <Ionicons name="share-outline" size={size * 0.5} color={colors.gold[300]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
});
