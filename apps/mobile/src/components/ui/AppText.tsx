import React from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { typography } from "../../lib/design-system";
import { useAppStore } from "../../store/useAppStore";

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
  children: React.ReactNode;
}

/**
 * Upper bound on system font scaling per variant. Large accessibility sizes
 * still grow the text, but not so far that fixed-height controls (tab bar,
 * pills, buttons) break apart.
 */
const MAX_SCALE: Record<Variant, number> = {
  display: 1.2,
  title: 1.25,
  serifBody: 1.35,
  heading: 1.3,
  body: 1.4,
  bodySmall: 1.35,
  label: 1.15,
  labelLong: 1.25,
  numeric: 1.25,
};

/**
 * `textTransform: "uppercase"` uses the platform's locale-less casing, so in
 * Turkish "i" becomes "I" instead of "İ" ("REHBERLIĞI"). Uppercase in JS with
 * the right locale instead and strip the transform.
 */
function upperChildren(children: React.ReactNode, locale: string): React.ReactNode {
  const tag = locale === "tr" ? "tr-TR" : "en-US";
  return React.Children.map(children, (c) =>
    typeof c === "string" ? c.toLocaleUpperCase(tag) : c,
  );
}

/** Typography-token-bound Text. Use instead of ad-hoc <Text> styles. */
export function AppText({
  variant = "body",
  color,
  center,
  style,
  children,
  maxFontSizeMultiplier,
  ...rest
}: AppTextProps) {
  const locale = useAppStore((s) => s.locale);
  const base = typography[variant];
  const override: TextStyle = {};
  if (color) override.color = color;
  if (center) override.textAlign = "center";

  const upper = base.textTransform === "uppercase";
  if (upper) override.textTransform = "none";

  return (
    <Text
      style={[base, override, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_SCALE[variant]}
      {...rest}
    >
      {upper ? upperChildren(children, locale) : children}
    </Text>
  );
}
