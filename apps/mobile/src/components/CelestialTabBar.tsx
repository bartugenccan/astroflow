import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Pressable, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  interpolateColor,
  cancelAnimation,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import type { Tabs } from "expo-router";

/**
 * SDK 57 vendored react-navigation inside expo-router, so the standalone
 * `@react-navigation/bottom-tabs` types no longer match what `<Tabs>` hands its
 * `tabBar` prop. Derive the type from the component itself: it tracks whichever
 * copy expo-router uses, without importing one of its internal build paths.
 */
type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];
import { colors, spacing, motion, typography, fonts } from "../lib/design-system";
import { useUiStore } from "../store/useUiStore";
import { useTranslation, TranslationKey } from "../i18n";
import { StarBurst } from "../features/intentions/StarBurst";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "moon",
  you: "planet",
  ahead: "telescope",
  profile: "person-circle",
};

/** i18n key per route, so the bar can name its destinations. */
const LABELS: Record<string, TranslationKey> = {
  index: "tabs.today",
  you: "tabs.you",
  ahead: "tabs.ahead",
  profile: "tabs.profile",
};

// The capsule is concentric with the bar: the same gap on every side, and a
// radius that is the bar's inner radius minus that gap (both are full pills).
const BAR_HEIGHT = 64;
const BORDER = 1;
const GAP = 6; // capsule ↔ bar edge, on all four sides at the outer tabs
const CAPSULE_INSET = 4; // capsule is this much narrower than its button, per side
const CAPSULE_HEIGHT = BAR_HEIGHT - 2 * BORDER - 2 * GAP; // 50
const CAPSULE_RADIUS = CAPSULE_HEIGHT / 2; // 25 = (32 − 1) − 6

interface Slot {
  x: number;
  w: number;
}

/**
 * Floating pill tab bar. The active tab sits in a gold capsule that wraps the
 * whole button (icon + label, so the label can never spill out of it) and
 * springs from tab to tab. Choosing a tab sets off a small burst of stars from
 * its icon.
 */
export function CelestialTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const sheetOpen = useUiStore((s) => s.sheetOpen);
  const hidden = useSharedValue(0);

  useEffect(() => {
    // Slide down + fade out while a bottom sheet is open so it never covers the
    // sheet's content; spring back when the sheet closes.
    hidden.value = withSpring(sheetOpen ? 1 : 0, motion.spring.gentle);
  }, [sheetOpen, hidden]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: hidden.value * 140 }],
  }));

  // ── Sliding capsule ────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<(Slot | undefined)[]>([]);
  const capX = useSharedValue(0);
  const capW = useSharedValue(0);
  const placed = useRef(false);

  const onSlotLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setSlots((prev) => {
      const cur = prev[index];
      if (cur && cur.x === x && cur.w === width) return prev;
      const next = [...prev];
      next[index] = { x, w: width };
      return next;
    });
  };

  useEffect(() => {
    const slot = slots[state.index];
    if (!slot) return;
    // Layout x counts from the bar's outer edge (border included); an absolute
    // child is placed from inside the border — remove it so the gap is exact.
    const x = slot.x - BORDER + CAPSULE_INSET;
    const w = Math.max(0, slot.w - CAPSULE_INSET * 2);
    if (!placed.current || reduced) {
      // First measurement: appear in place, don't fly in from the left.
      capX.value = x;
      capW.value = w;
      placed.current = true;
      return;
    }
    capX.value = withSpring(x, motion.spring.snappy);
    capW.value = withSpring(w, motion.spring.snappy);
  }, [slots, state.index, reduced, capX, capW]);

  const capsuleStyle = useAnimatedStyle(() => ({
    width: capW.value,
    transform: [{ translateX: capX.value }],
    opacity: capW.value > 0 ? 1 : 0,
  }));

  return (
    <Animated.View
      pointerEvents={sheetOpen ? "none" : "auto"}
      style={[styles.wrap, { paddingBottom: insets.bottom + spacing.md }, wrapStyle]}
    >
      <View style={styles.pill}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.overlay} />

        <Animated.View pointerEvents="none" style={[styles.capsule, capsuleStyle]}>
          <LinearGradient
            colors={["rgba(231,205,143,0.24)", "rgba(231,205,143,0.06)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.capsuleFill}
          />
        </Animated.View>

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            Haptics.selectionAsync().catch(() => {});
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <TabButton
              key={route.key}
              icon={ICONS[route.name] ?? "ellipse"}
              label={LABELS[route.name] ? t(LABELS[route.name]) : ""}
              focused={focused}
              onPress={onPress}
              onLayout={onSlotLayout(index)}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function TabButton({
  icon,
  label,
  focused,
  onPress,
  onLayout,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Named destinations: an icon alone asks the user to decode it. */
  label: string;
  focused: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(focused ? 1.08 : 1);
  const tilt = useSharedValue(0);
  const tint = useSharedValue(focused ? 1 : 0);
  const ring = useSharedValue(1); // 0 → 1 plays the shockwave; 1 = at rest (invisible)
  const twinkle = useSharedValue(0);
  const [burst, setBurst] = useState(0);
  const wasFocused = useRef(focused);

  // Celebrate only on a real change of tab — never on first mount.
  useEffect(() => {
    const became = focused && !wasFocused.current;
    wasFocused.current = focused;
    tint.value = withTiming(focused ? 1 : 0, { duration: motion.duration.base });

    if (!focused) {
      scale.value = withSpring(1, motion.spring.snappy);
      return;
    }
    if (!became || reduced) {
      scale.value = reduced ? 1.08 : withSpring(1.08, motion.spring.snappy);
      return;
    }
    scale.value = withSequence(
      withSpring(1.28, motion.spring.snappy),
      withSpring(1.08, motion.spring.gentle),
    );
    tilt.value = withSequence(
      withTiming(-12, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(0, motion.spring.snappy),
    );
    ring.value = 0;
    ring.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
    setBurst((b) => b + 1);
  }, [focused, reduced, scale, tilt, tint, ring]);

  // A tiny star that slowly glints beside the active icon.
  useEffect(() => {
    if (!focused || reduced) {
      cancelAnimation(twinkle);
      twinkle.value = withTiming(0, { duration: motion.duration.fast });
      return;
    }
    twinkle.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 600 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(twinkle);
  }, [focused, reduced, twinkle]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${tilt.value}deg` }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ring.value) * 0.9,
    transform: [{ scale: 0.6 + ring.value * 1.1 }],
  }));
  const twinkleStyle = useAnimatedStyle(() => ({
    opacity: twinkle.value,
    transform: [{ scale: 0.5 + twinkle.value * 0.5 }, { rotate: `${twinkle.value * 45}deg` }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(tint.value, [0, 1], [colors.text.tertiary, colors.gold[200]]),
  }));

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      style={styles.button}
      hitSlop={6}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
        <StarBurst playKey={burst} radius={24} count={8} starScale={0.55} />
        <Animated.View style={iconStyle}>
          <Ionicons
            name={icon}
            size={21}
            color={focused ? colors.gold[300] : colors.text.tertiary}
          />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.twinkle, twinkleStyle]}>
          <Ionicons name="star" size={7} color={colors.gold[100]} />
        </Animated.View>
      </View>
      {label ? (
        <Animated.Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
          style={[typography.labelLong, styles.label, labelStyle]}
        >
          {label}
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  pill: {
    flexDirection: "row",
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: BORDER,
    borderColor: colors.border.hairline,
    overflow: "hidden",
    alignItems: "center",
    paddingHorizontal: GAP - CAPSULE_INSET,
    // Fill the row (minus the side gutters) instead of a fixed minimum that
    // overflowed on 320pt-wide phones.
    width: "100%",
    maxWidth: 420,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(10,14,28,0.85)",
  },
  capsule: {
    position: "absolute",
    left: 0,
    top: GAP,
    height: CAPSULE_HEIGHT,
    borderRadius: CAPSULE_RADIUS,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    overflow: "hidden",
  },
  capsuleFill: {
    flex: 1,
  },
  button: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: CAPSULE_INSET + 4,
  },
  iconWrap: {
    width: 30,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.gold[300],
  },
  twinkle: {
    position: "absolute",
    top: -2,
    right: -3,
  },
  label: {
    // Sentence case, barely tracked: the old uppercase 9px label ran wider
    // than its highlight and spilled out ("SANA ÖZEL").
    fontFamily: fonts.sansSemiBold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 0.2,
    maxWidth: "100%",
    textAlign: "center",
  },
});
