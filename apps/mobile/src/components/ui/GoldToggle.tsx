import React from "react";
import { Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, withSpring } from "react-native-reanimated";
import { colors, radii, motion, surface } from "../../lib/design-system";

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB = 26;
const TRAVEL = TRACK_WIDTH - THUMB - 6;

interface Props {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}

/** On/off switch in the app's language: ink track, gold fill, springy thumb (same feel as LangSwitch). */
export function GoldToggle({ value, onChange, disabled, accessibilityLabel }: Props) {
  const progress = useDerivedValue(() => withSpring(value ? 1 : 0, motion.spring.snappy), [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [surface.sheet, colors.star[300]]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.border.hairlineStrong, colors.star[400]]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.text.tertiary, surface.base]),
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onChange(!value);
      }}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={disabled ? styles.disabled : undefined}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.pill,
  },
  disabled: {
    opacity: 0.5,
  },
});
