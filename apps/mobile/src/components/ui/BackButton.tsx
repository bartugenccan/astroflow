import React from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "./PressableScale";
import { colors } from "../../lib/design-system";

interface BackButtonProps {
  /** Override the default `router.back()` (e.g. to go to a specific tab). */
  onPress?: () => void;
  icon?: "chevron-back" | "close";
}

/**
 * The one back affordance for pushed screens. Falls back to the Today tab when
 * there's no history (deep link / fresh launch) instead of doing nothing.
 */
export function BackButton({ onPress, icon = "chevron-back" }: BackButtonProps) {
  const router = useRouter();
  const goBack = () => {
    if (onPress) return onPress();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };
  return (
    <PressableScale
      onPress={goBack}
      hitSlop={12}
      scaleTo={0.85}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Ionicons name={icon} size={24} color={colors.text.secondary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
});
