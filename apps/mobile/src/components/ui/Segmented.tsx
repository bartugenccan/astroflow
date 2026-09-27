import React, { useEffect, useState } from "react";
import { StyleSheet, View, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { colors, spacing, radii, motion } from "../../lib/design-system";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
}

const PAD = 4;

/**
 * Pill segmented control with a gold thumb that springs between options, so a
 * section switch reads as movement rather than a hard swap. Used by the
 * composed tabs (You / Ahead) and the forecast's weekly-vs-monthly toggle.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: SegmentedProps<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  // Four or more segments share ~80pt each on a phone — step the label down a
  // size so Turkish labels ("Niyetler") fit without ellipsis.
  const compact = options.length >= 4;
  const segW = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(index * segW, motion.spring.snappy);
  }, [index, segW, x]);

  const thumbStyle = useAnimatedStyle(() => ({
    width: segW,
    transform: [{ translateX: x.value }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) {
      setWidth(w);
      // Place the thumb without animating on first measure.
      x.value = index * ((w - PAD * 2) / options.length);
    }
  };

  return (
    <View style={styles.segmented} onLayout={onLayout} accessibilityRole="tablist">
      {segW > 0 ? <Animated.View style={[styles.thumb, thumbStyle]} /> : null}
      {options.map((o) => {
        const active = o.key === value;
        return (
          <PressableScale
            key={o.key}
            onPress={() => {
              if (o.key !== value) onChange(o.key);
            }}
            haptic={active ? "none" : "selection"}
            scaleTo={0.95}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <AppText
              variant="heading"
              color={active ? colors.text.onGold : colors.text.secondary}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              style={compact ? styles.compactLabel : undefined}
            >
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  compactLabel: {
    fontSize: 14,
    lineHeight: 19,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.ink[800],
    borderRadius: radii.pill,
    padding: PAD,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  thumb: {
    position: "absolute",
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radii.pill,
    backgroundColor: colors.gold[400],
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    borderRadius: radii.pill,
  },
});
