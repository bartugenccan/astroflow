import React from "react";
import { ViewStyle, StyleProp } from "react-native";
import { PressableScale } from "./PressableScale";

interface BouncyButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
  scaleTo?: number;
  accessibilityLabel?: string;
}

/**
 * Legacy name for the generic tactile press wrapper. It now delegates to
 * `PressableScale` (a plain Pressable underneath), so it nests safely inside
 * ScrollViews/sheets, honours reduce-motion, and keeps accessibility roles —
 * the old gesture-handler Tap version did none of those.
 */
export function BouncyButton({
  children,
  onPress,
  style,
  disabled = false,
  haptic = true,
  scaleTo = 0.96,
  accessibilityLabel,
}: BouncyButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      style={style}
      disabled={disabled}
      haptic={haptic ? "selection" : "none"}
      scaleTo={scaleTo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </PressableScale>
  );
}
