import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedRef,
  scrollTo,
  interpolate,
  Extrapolation,
  runOnJS,
  runOnUI,
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
  const aref = useAnimatedRef<Animated.ScrollView>();
  const didInit = useRef(false);
  // Mount-only initial offset. MUST NOT be tied to the live `selectedIndex`:
  // if `contentOffset` changes on re-render, iOS re-applies it mid-scroll (every
  // `report()` → `setDay()` re-render), nudging a carefully-dialed wheel one row
  // short — the iOS "birth date always −1" bug. Position after mount is driven
  // imperatively by the scrollTo effect below, never by this prop.
  const initialOffset = useRef(selectedIndex * ITEM_HEIGHT).current;

  // Position imperatively, but ONLY on mount and on EXTERNAL changes — never in
  // response to this wheel's own scroll. `contentOffset` alone isn't honored on
  // Android's first mount (wheel pinned to index 0), so we scrollTo to seed the
  // right row. Crucially, `report()` sets `lastIndex.current` to the value it
  // just committed BEFORE calling onChange, so when the parent echoes that value
  // back as `selectedIndex`, `external` is false and we skip scrollTo. Without
  // this guard the effect fired on every scroll tick and yanked the wheel back a
  // step, committing one short (the "birth date is always −1" bug).
  useEffect(() => {
    const external = selectedIndex !== lastIndex.current;
    if (didInit.current && !external) return;
    didInit.current = true;
    const y = selectedIndex * ITEM_HEIGHT;
    scrollY.value = y;
    lastIndex.current = selectedIndex;
    runOnUI(() => {
      "worklet";
      scrollTo(aref, 0, y, false);
    })();
  }, [selectedIndex, aref, scrollY]);

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

  // Re-read the FINAL settled position. `onScroll` is throttled, so its last
  // event can land mid-snap and commit the row one short; these fire once the
  // wheel comes to rest, guaranteeing the centered value is what's reported.
  const reportFinal = useCallback(
    (offsetY: number) => report(Math.round(offsetY / ITEM_HEIGHT)),
    [report],
  );

  return (
    <View style={[styles.container, { width, height: VISIBLE * ITEM_HEIGHT }, style]}>
      <Animated.ScrollView
        ref={aref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => reportFinal(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => reportFinal(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: PAD }}
        contentOffset={{ x: 0, y: initialOffset }}
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
