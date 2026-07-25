import React, { useCallback } from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { motion } from "../../lib/design-system";

interface BouncyButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
  scaleTo?: number;
}

/** Generic tactile press wrapper — spring scale + selection haptic. */
export function BouncyButton({
  children,
  onPress,
  style,
  disabled = false,
  haptic = true,
  scaleTo = 0.96,
}: BouncyButtonProps) {
  const scale = useSharedValue(1);

  const fire = useCallback(() => {
    if (haptic) Haptics.selectionAsync();
    onPress();
  }, [onPress, haptic]);

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      "worklet";
      scale.value = withSpring(scaleTo, motion.spring.snappy);
    })
    .onFinalize(() => {
      "worklet";
      scale.value = withSpring(1, motion.spring.snappy);
    })
    .onEnd(() => {
      "worklet";
      runOnJS(fire)();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[animStyle, style, disabled && styles.disabled]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
