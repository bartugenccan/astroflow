import React, { forwardRef } from "react";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  type TextInputInstance,
} from "react-native";
import Animated from "react-native-reanimated";
import { depth, paper, radii, spacing, typography } from "../../lib/design-system";
import { useMotion } from "../../lib/motion";

/**
 * Paper — the page you write a manifestation on. A cream sheet with ruled
 * lines, a candy margin rule and a hard slab under it (no blur). Everything
 * written on it uses the `script` handwriting variants, so the ruling below is
 * tuned to their line height.
 */

/** One ruled line; equals `typography.script.lineHeight`. */
export const PAPER_LINE = 32;
/** Space above the first line (the "header" of the page). */
const TOP = spacing.lg;
/** Where the margin rule sits; text starts after it. */
const MARGIN_X = 34;

interface PaperCardProps {
  children: React.ReactNode;
  /** How many ruled lines to draw at least (the sheet grows with its content). */
  lines?: number;
  /** A slight hand-placed tilt, in degrees. */
  tilt?: number;
  /** Hide the margin rule (a note, a quote). */
  plain?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function PaperCard({ children, lines = 4, tilt = 0, plain = false, style, accessibilityLabel }: PaperCardProps) {
  const minHeight = TOP + lines * PAPER_LINE + spacing.md;
  return (
    <View
      style={[styles.shell, tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null, style]}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.slab} />
      <View style={[styles.face, { minHeight }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 40 }, (_, i) => (
            <View key={i} style={[styles.rule, { top: TOP + (i + 1) * PAPER_LINE - 4 }]} />
          ))}
          {plain ? null : <View style={styles.margin} />}
        </View>
        <View style={[styles.content, plain && styles.contentPlain]}>{children}</View>
      </View>
    </View>
  );
}

interface PaperInputProps extends Omit<TextInputProps, "style"> {
  /** Lines of room to show before it grows. */
  minLines?: number;
  large?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A handwriting text field that sits on the ruling of a PaperCard. */
export const PaperInput = forwardRef<TextInputInstance, PaperInputProps>(function PaperInput(
  { minLines = 3, large = false, style, ...rest },
  ref,
) {
  const font = large ? typography.scriptLarge : typography.script;
  return (
    <TextInput
      ref={ref}
      multiline
      placeholderTextColor={paper.inkSoft}
      selectionColor={paper.margin}
      cursorColor={paper.ink}
      textAlignVertical="top"
      scrollEnabled={false}
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[font, styles.input, { lineHeight: PAPER_LINE, minHeight: minLines * PAPER_LINE }, style]}
    />
  );
});

/**
 * A line of ink appearing on the page: a short fade sweeping in from the left,
 * like a pen stroke. Under reduce-motion it is simply there.
 */
export function InkLine({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const m = useMotion();
  return (
    <Animated.View entering={m.reduced ? undefined : m.enter("ink", index * 60)} style={style}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { paddingBottom: depth.md },
  slab: {
    position: "absolute",
    left: 0,
    right: 0,
    top: depth.md,
    bottom: 0,
    borderRadius: radii.lg,
    backgroundColor: paper.slab,
  },
  face: {
    borderRadius: radii.lg,
    backgroundColor: paper.face,
    overflow: "hidden",
  },
  rule: { position: "absolute", left: 0, right: 0, height: 1.5, backgroundColor: paper.line },
  margin: { position: "absolute", top: 0, bottom: 0, left: MARGIN_X - 8, width: 2, backgroundColor: paper.margin },
  content: { paddingTop: TOP, paddingBottom: spacing.md, paddingLeft: MARGIN_X, paddingRight: spacing.lg },
  contentPlain: { paddingLeft: spacing.lg },
  input: { padding: 0, margin: 0, color: paper.ink },
});
