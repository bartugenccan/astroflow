import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AppText } from "./AppText";
import { depth, palette, radii, spacing } from "../../lib/design-system";

interface SpeechBubbleProps {
  text?: string;
  children?: React.ReactNode;
  /** Which side the tail points to (towards Aster). */
  tail?: "left" | "bottom" | "top";
  style?: StyleProp<ViewStyle>;
}

const CLOUD = palette.cloud;

/** Aster's speech bubble: a chunky cloud card with a little tail. */
export function SpeechBubble({ text, children, tail = "left", style }: SpeechBubbleProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View
        style={[
          styles.tail,
          tail === "left" && styles.tailLeft,
          tail === "bottom" && styles.tailBottom,
          tail === "top" && styles.tailTop,
        ]}
      />
      <View style={styles.bubble}>
        {text ? (
          <AppText variant="heading" color={CLOUD.on} style={styles.text}>
            {text}
          </AppText>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const TAIL = 16;

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  bubble: {
    backgroundColor: CLOUD.face,
    borderRadius: radii.lg,
    borderBottomWidth: depth.sm + 1,
    borderBottomColor: CLOUD.slab,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: { fontSize: 15, lineHeight: 21 },
  tail: {
    position: "absolute",
    width: TAIL,
    height: TAIL,
    backgroundColor: CLOUD.face,
    transform: [{ rotate: "45deg" }],
    borderRadius: 3,
  },
  tailLeft: { left: -TAIL / 2 + 2, top: 18 },
  tailBottom: { bottom: -TAIL / 2 + 3, left: 36, backgroundColor: CLOUD.slab },
  tailTop: { top: -TAIL / 2 + 2, left: 36 },
});
