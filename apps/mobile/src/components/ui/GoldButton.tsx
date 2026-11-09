import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ChunkyButton, ChunkySize, ChunkyVariant } from "./ChunkyButton";

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  /** solid = brand violet slab button, ghost = outlined secondary. */
  variant?: "solid" | "ghost";
  /** Override the tone (star for rewards, mint for success, candy, danger…). */
  tone?: ChunkyVariant;
  size?: ChunkySize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  uppercase?: boolean;
}

/**
 * Primary CTA. Historically a gold gradient pill; now a thin wrapper over the
 * physical ChunkyButton so every call site gets the hard-slab push-down.
 */
export function GoldButton({
  label,
  onPress,
  variant = "solid",
  tone,
  size = "lg",
  loading = false,
  disabled = false,
  style,
  icon,
  uppercase = true,
}: GoldButtonProps) {
  return (
    <ChunkyButton
      label={label}
      onPress={onPress}
      variant={tone ?? (variant === "ghost" ? "ghost" : "primary")}
      size={size}
      loading={loading}
      disabled={disabled}
      style={style}
      icon={icon}
      uppercase={uppercase}
    />
  );
}
