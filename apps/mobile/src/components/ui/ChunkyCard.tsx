import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors, depth as DEPTH, motion, palette, radii, spacing, surface, Tone } from "../../lib/design-system";

export type CardTone = "night" | "raised" | Tone;

interface ChunkyCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Wrapper style for pressable cards (margins, flex). */
  containerStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  /**
   * night  — default night card with a chunky outline + dark slab.
   * raised — lighter night surface.
   * <tone> — candy-coloured filled card (primary, star, mint, …).
   */
  tone?: CardTone;
  /** Soft tinted fill with a coloured outline instead of a solid fill. */
  tinted?: boolean;
  /** Slab depth. */
  depth?: keyof typeof DEPTH;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

function cardColors(tone: CardTone, tinted: boolean) {
  if (tone === "night") {
    return { bg: surface.card, border: colors.border.chunky, slab: surface.slab };
  }
  if (tone === "raised") {
    return { bg: surface.raised, border: surface.accent, slab: surface.slab };
  }
  const p = palette[tone];
  if (tinted) return { bg: p.soft, border: p.face, slab: p.slab };
  return { bg: p.face, border: p.face, slab: p.slab };
}

/**
 * Chunky card: 2px outline and a solid slab under it (thicker bottom border).
 * With `onPress` the whole card pushes down onto its slab like a button.
 */
export function ChunkyCard({
  children,
  style,
  containerStyle,
  padded = true,
  tone = "night",
  tinted = false,
  depth = "md",
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled,
}: ChunkyCardProps) {
  const c = cardColors(tone, tinted);
  const d = DEPTH[depth];

  if (!onPress) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: c.bg,
            borderColor: c.border,
            borderBottomColor: c.slab,
            borderBottomWidth: d,
          },
          padded && styles.padded,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <PressableChunkyCard
      c={c}
      d={d}
      style={[styles.card, { backgroundColor: c.bg, borderColor: c.border }, padded && styles.padded, style]}
      containerStyle={containerStyle}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
    >
      {children}
    </PressableChunkyCard>
  );
}

function PressableChunkyCard({
  c,
  d,
  style,
  containerStyle,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
  disabled,
}: {
  c: { bg: string; border: string; slab: string };
  d: number;
  style: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * (d - 1) }],
  }));
  const springTo = (v: number) => {
    press.value = reduced ? v : withSpring(v, motion.spring.snappy);
  };
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      onPressIn={() => springTo(1)}
      onPressOut={() => springTo(0)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[{ paddingBottom: d }, disabled && styles.disabled, containerStyle]}
    >
      <View style={[styles.slab, { top: d, backgroundColor: c.slab }]} />
      <Animated.View style={[style, faceStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 2,
    overflow: "hidden",
  },
  padded: { padding: spacing.xl - 4 },
  slab: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.xl,
  },
  disabled: { opacity: 0.5 },
});
