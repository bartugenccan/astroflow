import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors, motion, palette, radii, surface, Tone } from "../../lib/design-system";

const DEPTH = 4;

interface PushTileProps {
  tone: Tone;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  /** Radio-like choices announce "selected"; toggles can pass "checked". */
  role?: "radio" | "button";
  height?: number;
  radius?: number;
  disabled?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * A small physical choice tile: a hard slab under the face that pushes down
 * on press. Unselected sits on the raised night surface; selected fills with
 * its tone. Used for the sky check-in tiles and the energy dots.
 */
export function PushTile({
  tone,
  selected,
  onPress,
  accessibilityLabel,
  role = "radio",
  height = 56,
  radius = radii.md,
  disabled,
  children,
  style,
}: PushTileProps) {
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const p = palette[tone];
  const face = selected ? p.face : surface.raised;
  const slab = selected ? p.slab : surface.slab;
  const border = selected ? p.face : colors.border.chunky;

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * (DEPTH - 1) }],
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
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, checked: role === "radio" ? selected : undefined, disabled }}
      style={[{ height: height + DEPTH, minWidth: 44 }, disabled && styles.disabled, style]}
    >
      <View style={[styles.slab, { height, borderRadius: radius, backgroundColor: slab }]} />
      <Animated.View
        style={[
          styles.face,
          { height, borderRadius: radius, backgroundColor: face, borderColor: border },
          faceStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  slab: { position: "absolute", left: 0, right: 0, top: DEPTH },
  face: { alignItems: "center", justifyContent: "center", borderWidth: 2 },
});
