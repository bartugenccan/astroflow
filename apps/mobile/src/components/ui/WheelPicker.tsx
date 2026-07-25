import React, { useCallback, useRef } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { colors, fonts } from "../../lib/design-system";

const ITEM_HEIGHT = 44;
const VISIBLE = 5; // odd → one centered row
const PAD = ((VISIBLE - 1) / 2) * ITEM_HEIGHT;

export interface WheelItem {
  label: string;
  value: number;
}

interface WheelPickerProps {
  items: WheelItem[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
  style?: ViewStyle;
}

/** A snapping wheel column. Items scale/fade by distance from centre; haptic tick per row. */
export function WheelPicker({
  items,
  selectedIndex,
  onChange,
  width = 88,
  style,
}: WheelPickerProps) {
  const scrollY = useSharedValue(selectedIndex * ITEM_HEIGHT);
  const lastIndex = useRef(selectedIndex);

  const report = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      if (clamped !== lastIndex.current) {
        lastIndex.current = clamped;
        Haptics.selectionAsync();
        onChange(clamped);
      }
    },
    [items.length, onChange],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
      const idx = Math.round(e.contentOffset.y / ITEM_HEIGHT);
      runOnJS(report)(idx);
    },
  });

  return (
    <View style={[styles.container, { width, height: VISIBLE * ITEM_HEIGHT }, style]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: PAD }}
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
      >
        {items.map((item, i) => (
          <WheelRow key={item.value} label={item.label} index={i} scrollY={scrollY} />
        ))}
      </Animated.ScrollView>

      {/* Centre selection frame */}
      <View pointerEvents="none" style={styles.frameTop} />
      <View pointerEvents="none" style={styles.frameBottom} />
    </View>
  );
}

function WheelRow({
  label,
  index,
  scrollY,
}: {
  label: string;
  index: number;
  scrollY: { value: number };
}) {
  const animStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollY.value / ITEM_HEIGHT - index);
    const scale = interpolate(distance, [0, 1, 2], [1, 0.82, 0.66], Extrapolation.CLAMP);
    const opacity = interpolate(distance, [0, 1, 2], [1, 0.4, 0.16], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View style={[styles.row, animStyle]}>
      <AppText variant="title" color={colors.text.primary} style={styles.rowText}>
        {label}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  row: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    fontFamily: fonts.serifMedium,
    fontSize: 26,
  },
  frameTop: {
    position: "absolute",
    top: PAD,
    left: 6,
    right: 6,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairlineStrong,
  },
  frameBottom: {
    position: "absolute",
    top: PAD + ITEM_HEIGHT,
    left: 6,
    right: 6,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairlineStrong,
  },
});
