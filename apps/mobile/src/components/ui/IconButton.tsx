import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { motion, palette, Tone } from "../../lib/design-system";

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Required: an icon alone says nothing to a screen reader. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  tone?: Tone;
  /** Face diameter; the touch target never drops below 44pt. */
  size?: 40 | 44 | 52;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DEPTH = 3;

/**
 * A round physical button for a single icon (back, close, settings, info):
 * a solid slab under the face, and the face pushes down onto it when pressed.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  tone = "night",
  size = 44,
  disabled = false,
  style,
}: IconButtonProps) {
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const p = palette[tone];
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * (DEPTH - 1) }],
  }));
  const springTo = (v: number) => {
    press.value = reduced ? v : withSpring(v, motion.spring.snappy);
  };
  const hit = Math.max(0, (44 - size) / 2);

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      onPressIn={() => springTo(1)}
      onPressOut={() => springTo(0)}
      disabled={disabled}
      hitSlop={hit + 4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[{ width: size, height: size + DEPTH }, disabled && styles.disabled, style]}
    >
      <View
        style={[styles.slab, { width: size, height: size, borderRadius: size / 2, backgroundColor: p.slab }]}
      />
      <Animated.View
        style={[
          styles.face,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: p.face },
          faceStyle,
        ]}
      >
        <Ionicons name={icon} size={Math.round(size * 0.5)} color={p.on} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  slab: { position: "absolute", left: 0, top: DEPTH },
  face: { alignItems: "center", justifyContent: "center" },
});
