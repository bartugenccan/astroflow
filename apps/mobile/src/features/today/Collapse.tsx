import React, { useEffect, useRef } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { motion } from "../../lib/design-system";

interface CollapseProps {
  open: boolean;
  children: React.ReactNode;
  /** Called once the close spring settles (e.g. to unmount the block). */
  onClosed?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Springs its height between 0 and its content's natural height. The content
 * is measured off-flow, so it also springs when the content itself grows or
 * shrinks while open. Reduce-motion snaps instead of springing.
 */
export function Collapse({ open, children, onClosed, style }: CollapseProps) {
  const reduced = useReducedMotion();
  const height = useSharedValue(0);
  const fade = useSharedValue(open ? 1 : 0);
  const contentH = useRef(0);
  const measured = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  const settle = (to: number, isOpen: boolean) => {
    const done = (finished?: boolean) => {
      "worklet";
      if (finished && !isOpen && onClosed) runOnJS(onClosed)();
    };
    if (reduced) {
      height.value = to;
      fade.value = isOpen ? 1 : 0;
      if (!isOpen) onClosed?.();
      return;
    }
    height.value = withSpring(to, motion.spring.gentle, done);
    fade.value = withSpring(isOpen ? 1 : 0, motion.spring.gentle);
  };

  useEffect(() => {
    if (!measured.current) return;
    settle(open ? contentH.current : 0, open);
    // Only the open flag drives this; settle reads fresh refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (Math.abs(h - contentH.current) < 0.5 && measured.current) return;
    contentH.current = h;
    if (!measured.current) {
      measured.current = true;
      height.value = openRef.current ? h : 0;
      return;
    }
    if (openRef.current) settle(h, true);
  };

  const anim = useAnimatedStyle(() => ({ height: height.value, opacity: fade.value }));

  return (
    <Animated.View
      style={[styles.clip, anim, style]}
      pointerEvents={open ? "auto" : "none"}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      accessibilityElementsHidden={!open}
    >
      <View style={styles.content} onLayout={onLayout}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  content: { position: "absolute", left: 0, right: 0, top: 0 },
});
