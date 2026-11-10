import React, { useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { layoutAnim, useMotion } from "../../lib/motion";
import { colors, depth, palette, radii, spacing, surface, type Tone } from "../../lib/design-system";

interface DisclosureProps {
  title: string;
  /** One line under the title, shown while closed (what's inside). */
  summary?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  initiallyOpen?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * A folded section: secondary detail stays one tap away instead of crowding
 * the screen. The header is a 56pt button; the body fades in while the card
 * grows on a layout transition (height is never animated by hand). The
 * chevron turns with the press spring.
 */
export function Disclosure({
  title,
  summary,
  icon,
  tone = "primary",
  initiallyOpen = false,
  children,
  style,
}: DisclosureProps) {
  const m = useMotion();
  const [open, setOpen] = useState(initiallyOpen);
  const turn = useSharedValue(initiallyOpen ? 1 : 0);
  const p = palette[tone];

  const toggle = () => {
    const next = !open;
    setOpen(next);
    turn.value = m.reduced ? (next ? 1 : 0) : withSpring(next ? 1 : 0, m.springConfig("press"));
  };
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 90}deg` }] }));

  return (
    <Animated.View layout={layoutAnim(m.reduced)} style={[styles.card, style]}>
      <PressableScale
        onPress={toggle}
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        accessibilityHint={summary}
        style={styles.head}
      >
        {icon ? (
          <View style={[styles.icon, { backgroundColor: p.soft }]} importantForAccessibility="no-hide-descendants">
            <Ionicons name={icon} size={18} color={p.face} />
          </View>
        ) : null}
        <View style={styles.text}>
          <AppText variant="heading">{title}</AppText>
          {summary && !open ? (
            <AppText variant="bodySmall" numberOfLines={1}>
              {summary}
            </AppText>
          ) : null}
        </View>
        <Animated.View style={chevron}>
          <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </Animated.View>
      </PressableScale>
      {open ? (
        <Animated.View entering={m.enter("fade")} exiting={m.exit("fade")} style={styles.body}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.sm + 2,
    borderBottomColor: surface.slab,
    backgroundColor: surface.card,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
});
