import React, { useMemo, useState } from "react";
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native";
import Animated, { FadeIn, LinearTransition, useReducedMotion } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { colors, motion, spacing } from "../../lib/design-system";
import { track } from "../../services/analytics";

type Variant = React.ComponentProps<typeof AppText>["variant"];

interface Props {
  text: string;
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Sentences shown before "Go deeper" in simple mode. */
  sentences?: number;
  /** Where the "Go deeper" link sits (match the text alignment). */
  align?: "left" | "center";
}

/** A sentence ends at . ! ? … (plus closing quotes) followed by space and a capital or opening quote. */
const SENTENCE_END = /([.!?…]+["'”’»)\]]*)\s+(?=[A-ZÇĞİÖŞÜ“"‘'(])/g;

/**
 * Split into sentences, keeping closing quotes/brackets with their sentence.
 * Turkish ordinals ("10. evinde") and decimals never split: the period must
 * not follow a digit, and the next word must start with a capital.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (const m of text.matchAll(SENTENCE_END)) {
    const at = m.index ?? 0;
    if (/\d/.test(text[at - 1] ?? "")) continue;
    const end = at + m[1].length;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean);
}

/**
 * Reading text that respects the reader's detail level. In "simple" mode
 * (the default) only the first sentences show, with a "Go deeper" link that
 * opens the rest in place; in "deep" mode the text is always whole. Short
 * texts never get a link. Paragraph breaks in the full text are kept.
 */
export function DeepText({ text, variant = "body", color, style, containerStyle, sentences = 2, align = "left" }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const level = useAppStore((s) => s.detailLevel);
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    const firstParagraph = text.trim().split(/\n\s*\n/)[0] ?? "";
    const parts = splitSentences(firstParagraph);
    const head = parts.slice(0, sentences).join(" ");
    // Only fold when it saves real reading: at least a third of the text stays hidden.
    return head.length > 0 && head.length < text.trim().length * 0.67 ? head : null;
  }, [text, sentences]);

  const folded = level === "simple" && summary !== null && !open;
  const canFold = level === "simple" && summary !== null;

  return (
    <Animated.View layout={reduced ? undefined : LinearTransition.duration(motion.duration.base)} style={containerStyle}>
      {folded ? (
        <AppText variant={variant} color={color} style={style}>
          {summary}
        </AppText>
      ) : (
        <Animated.View entering={open && !reduced ? FadeIn.duration(motion.duration.base) : undefined}>
          <AppText variant={variant} color={color} style={style}>
            {text.trim()}
          </AppText>
        </Animated.View>
      )}
      {canFold ? (
        <View style={[styles.linkRow, align === "center" && styles.center]}>
          <PressableScale
            onPress={() => {
              track("reading_go_deeper", { open: !open });
              setOpen((o) => !o);
            }}
            scaleTo={0.96}
            haptic="selection"
            hitSlop={8}
            style={styles.link}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={open ? t("common.showLess") : t("common.goDeeperA11y")}
          >
            <AppText variant="label" color={colors.text.accent}>
              {open ? t("common.showLess") : t("common.goDeeper")}
            </AppText>
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.text.accent} />
          </PressableScale>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  linkRow: { flexDirection: "row", marginTop: spacing.xs },
  center: { justifyContent: "center" },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
    paddingRight: spacing.sm,
  },
});
