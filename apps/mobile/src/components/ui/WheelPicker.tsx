import React, { useCallback, useEffect, useRef } from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedReaction,
  useAnimatedRef,
  scrollTo,
  interpolate,
  Extrapolation,
  runOnJS,
  runOnUI,
  SharedValue,
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
  /** Initial row. Read on mount only — the wheel owns its position after that. */
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
  style?: ViewStyle;
}

/**
 * A snapping wheel column. Items scale/fade by distance from centre; haptic
 * tick per row.
 *
 * Everything that follows the finger runs on the UI thread: the scroll handler
 * only writes `scrollY`, and a reaction watches the *row* under the centre
 * line, crossing to JS once per row instead of once per frame. Flooding JS
 * with a message every frame is what made the digits stutter.
 *
 * The committed value is always the row the user sees centred — the same
 * `scrollY` that drives the visuals — so what's saved can't drift from what's
 * shown (the "picked the 24th, profile says the 23rd" bug).
 */
export function WheelPicker({
  items,
  selectedIndex,
  onChange,
  width = 88,
  style,
}: WheelPickerProps) {
  const initialIndex = useRef(selectedIndex).current;
  const scrollY = useSharedValue(initialIndex * ITEM_HEIGHT);
  const lastIndex = useRef(initialIndex);
  const aref = useAnimatedRef<Animated.ScrollView>();
  const count = items.length;

  // Seed the position once. `contentOffset` isn't honoured on Android's first
  // mount, so scroll imperatively too.
  //
  // Deliberately NOT re-synced from `selectedIndex` afterwards: while the user
  // scrolls, the parent re-renders with values that lag a row or two behind
  // the finger, and treating one of those stale echoes as an "external change"
  // yanked the wheel back a row — committing one short.
  useEffect(() => {
    const y = initialIndex * ITEM_HEIGHT;
    runOnUI(() => {
      "worklet";
      scrollTo(aref, 0, y, false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(count - 1, index));
      if (clamped === lastIndex.current) return;
      lastIndex.current = clamped;
      Haptics.selectionAsync().catch(() => {});
      onChange(clamped);
    },
    [count, onChange],
  );

  // The list can shrink under the wheel (31 → 30 days when the month
  // changes). Pull the wheel onto the new last row and report it.
  useEffect(() => {
    if (lastIndex.current <= count - 1) return;
    const last = count - 1;
    runOnUI(() => {
      "worklet";
      scrollTo(aref, 0, last * ITEM_HEIGHT, true);
    })();
    commit(last);
  }, [count, aref, commit]);

  // One JS call per row crossed, from the same value the rows render from.
  useAnimatedReaction(
    () => Math.round(scrollY.value / ITEM_HEIGHT),
    (index, prev) => {
      if (prev !== null && index !== prev) runOnJS(commit)(index);
    },
    [commit],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
    // Belt and braces: the resting offset after a fling / snap is the truth.
    onMomentumEnd: (e) => {
      scrollY.value = e.contentOffset.y;
      runOnJS(commit)(Math.round(e.contentOffset.y / ITEM_HEIGHT));
    },
  });

  return (
    <View style={[styles.container, { width, height: VISIBLE * ITEM_HEIGHT }, style]}>
      <Animated.ScrollView
        ref={aref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        // iOS "fast" gives the crisp picker feel; on Android it stops almost
        // dead and the snap looks like a jump, so let it glide.
        decelerationRate={Platform.OS === "ios" ? "fast" : "normal"}
        bounces={false}
        overScrollMode="never"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: PAD }}
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
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

const WheelRow = React.memo(function WheelRow({
  label,
  index,
  scrollY,
}: {
  label: string;
  index: number;
  scrollY: SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollY.value / ITEM_HEIGHT - index);
    // Rows far off-screen skip the interpolation work entirely.
    if (distance > 3) return { opacity: 0, transform: [{ scale: 0.66 }] };
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
});

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
