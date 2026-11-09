import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ChunkyButton } from "./ChunkyButton";

interface DepthButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  /** light = cloud face (third-party sign-in), ink = night secondary. */
  tone?: "light" | "ink";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Secondary physical button — a ChunkyButton in the cloud or night tone. */
export function DepthButton({ tone = "ink", ...rest }: DepthButtonProps) {
  return (
    <ChunkyButton
      {...rest}
      variant={tone === "light" ? "cloud" : "night"}
      size="md"
      uppercase={false}
      haptic="light"
    />
  );
}
