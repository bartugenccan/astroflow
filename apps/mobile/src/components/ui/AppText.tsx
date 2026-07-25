import React from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { typography } from "../../lib/design-system";

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
  children: React.ReactNode;
}

/** Typography-token-bound Text. Use instead of ad-hoc <Text> styles. */
export function AppText({
  variant = "body",
  color,
  center,
  style,
  children,
  ...rest
}: AppTextProps) {
  const override: TextStyle = {};
  if (color) override.color = color;
  if (center) override.textAlign = "center";

  return (
    <Text style={[typography[variant], override, style]} {...rest}>
      {children}
    </Text>
  );
}
