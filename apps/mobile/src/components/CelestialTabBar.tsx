import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Pressable, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
  useReducedMotion,
  useAnimatedReaction,
  type SharedValue,
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
import { colors, spacing, motion, typography, fonts, palette, surface, Tone, depth } from "../lib/design-system";
import { useUiStore } from "../store/useUiStore";
import { useTranslation, TranslationKey } from "../i18n";
import { haptics } from "../lib/haptics";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "sunny",
  manifest: "sparkles",
  tarot: "albums",
  sky: "planet",
  profile: "person-circle",
};

/** Each destination owns a candy tone — the capsule and icon take it on. */
const TONES: Record<string, Tone> = {
  index: "star",
  manifest: "candy",
  tarot: "primary",
  sky: "sky",
  profile: "mint",
};

/** i18n key per route, so the bar can name its destinations. */
/** The centre destination — reading the chart is the heart of the app. */
const FEATURED = "sky";

const LABELS: Record<string, TranslationKey> = {
  index: "tabs.today",
  manifest: "tabs.manifest",
  sky: "tabs.sky",
  tarot: "tabs.tarot",
  profile: "tabs.profile",
};

// The capsule is concentric with the bar: the same gap on every side, and a
// radius that is the bar's inner radius minus that gap (both are full pills).
const BAR_HEIGHT = 64;
const BORDER = 2;
const GAP = 6; // capsule ↔ bar edge, on all four sides at the outer tabs
const CAPSULE_INSET = 4; // capsule is this much narrower than its button, per side
const CAPSULE_BORDER = 2;
const CAPSULE_HEIGHT = BAR_HEIGHT - 2 * BORDER - 2 * GAP; // 48
const CAPSULE_RADIUS = CAPSULE_HEIGHT / 2;
/** Bar padding: with the capsule inset this puts the outer capsules GAP from the edge. */
const PAD_X = GAP - CAPSULE_INSET;
/** Label ↔ capsule's inner border, so the text never touches (or crosses) it. */
const LABEL_BREATHING = 3;
const ICON_WRAP_H = 26;
const LABEL_LINE_H = 14;
const BUTTON_GAP = 2;

/**
 * Floating pill tab bar. The active tab sits in a gold capsule that wraps the
 * whole button (icon + label, so the label can never spill out of it) and
 * springs from tab to tab. Choosing a tab gives its icon one small pop from
 * its icon.
 *
 * Every tab is `flex: 1`, so the capsule's place is pure arithmetic on the
 * bar's one measured width. (Measuring each tab separately left the capsule
 * off-centre whenever those layouts arrived out of step.)
 *
 * Responsiveness: a press starts every bar animation on the UI thread *before*
 * asking the navigator to switch. The capsule, the icon pop and the colours
 * never wait for the new tab's render on the JS thread — they used to be kicked
 * off from effects that only ran after that render had committed.
 */
export function CelestialTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
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

  // ── Selection + sliding capsule ────────────────────────────────────────────
  /** The tab the bar shows as chosen; set on press, ahead of the navigator. */
  const selected = useSharedValue(state.index);
  /** JS-side mirror of `selected`, so the sync effect never reads across threads. */
  const selectedRef = useRef(state.index);
  const [barWidth, setBarWidth] = useState(0);
  const capX = useSharedValue(0);
  const placed = useRef(false);
  const tabCount = state.routes.length;
  // An absolute child is placed from inside the bar's border, at the padding
  // edge — so: padding, then whole tabs, then the capsule's own inset.
  const slotW = barWidth > 0 && tabCount > 0 ? (barWidth - 2 * BORDER - 2 * PAD_X) / tabCount : 0;
  // Every tab has the same width: the capsule never resizes, it only glides.
  const capWidth = Math.max(0, slotW - CAPSULE_INSET * 2);

  const onBarLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setBarWidth((prev) => (prev === width ? prev : width));
  };

  const capsuleX = useCallback((index: number) => PAD_X + index * slotW + CAPSULE_INSET, [slotW]);

  /** Moves the selection (capsule + buttons) to `index` — instantly the first time. */
  const select = useCallback(
    (index: number, animate: boolean) => {
      selectedRef.current = index;
      selected.value = index;
      if (slotW <= 0) return;
      const x = capsuleX(index);
      capX.value = animate && !reduced ? withSpring(x, motion.spring.snappy) : x;
    },
    [selected, capX, capsuleX, slotW, reduced],
  );

  // First measurement or a width change: place the capsule without flying in.
  useEffect(() => {
    if (slotW <= 0) return;
    select(selectedRef.current, placed.current);
    placed.current = true;
  }, [slotW]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigation that didn't come from a press here (a deep link, a reminder, a
  // `router.navigate` to a tab): follow the navigator.
  useEffect(() => {
    if (selectedRef.current !== state.index) select(state.index, placed.current);
  }, [state.index, select]);

  // The capsule takes on the chosen tab's tone straight from the selection, on
  // the UI thread — no re-render between the press and the colour change.
  const routeNames = state.routes.map((r) => r.name).join("|");
  const capsuleTones = useMemo(
    () =>
      routeNames.split("|").map((name) => {
        const tone = palette[TONES[name] ?? "primary"];
        return { soft: tone.soft, face: tone.face };
      }),
    [routeNames],
  );

  const capsuleStyle = useAnimatedStyle(() => {
    const tone = capsuleTones[selected.value] ?? capsuleTones[0];
    return {
      backgroundColor: tone?.soft,
      borderColor: tone?.face,
      transform: [{ translateX: capX.value }],
    };
  });

  // Latest navigation props, so each tab's press handler can stay stable.
  const nav = useRef({ state, emitter, navigateToTab });
  nav.current = { state, emitter, navigateToTab };

  const onTabPress = useCallback(
    (index: number) => {
      const { state: s, emitter: em, navigateToTab: go } = nav.current;
      const route = s.routes[index];
      if (!route) return;
      haptics.select();
      // expo-router 58 hands the bar an emitter + navigateToTab instead of `navigation`.
      const event = em.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (selectedRef.current === index || event.defaultPrevented) return;
      // Bar first (UI thread, this frame), then the navigator (JS render).
      select(index, true);
      go(route.key);
    },
    [select],
  );

  return (
    <Animated.View
      pointerEvents={sheetOpen ? "none" : "auto"}
      style={[styles.wrap, { paddingBottom: insets.bottom + spacing.md }, wrapStyle]}
    >
      <View style={styles.pill} onLayout={onBarLayout}>
        {capWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.capsule,
              { width: capWidth },
              capsuleStyle,
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => (
          <TabButton
            key={route.key}
            index={index}
            selected={selected}
            initiallyFocused={state.index === index}
            focused={state.index === index}
            icon={ICONS[route.name] ?? "ellipse"}
            tone={TONES[route.name] ?? "primary"}
            label={LABELS[route.name] ? t(LABELS[route.name]) : ""}
            featured={route.name === FEATURED}
            onPress={onTabPress}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const TabButton = React.memo(function TabButton({
  index,
  selected,
  initiallyFocused,
  focused,
  icon,
  tone,
  label,
  featured,
  onPress,
}: {
  index: number;
  /** The bar's selection; every animation here reacts to it on the UI thread. */
  selected: SharedValue<number>;
  initiallyFocused: boolean;
  /** For accessibility only — visuals follow `selected`. */
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  /** Named destinations: an icon alone asks the user to decode it. */
  label: string;
  /** Sits on a small tone orb, so the centre tab reads as the main one at rest. */
  featured: boolean;
  onPress: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const toneFace = palette[tone].face;
  const scale = useSharedValue(initiallyFocused ? 1.08 : 1);
  const tint = useSharedValue(initiallyFocused ? 1 : 0);

  // Every change of selection, on the UI thread the moment it is written. One
  // small pop on a real change of tab — nothing loops while a tab is active.
  useAnimatedReaction(
    () => selected.value === index,
    (isOn, wasOn) => {
      if (wasOn === null || isOn === wasOn) return;
      tint.value = withTiming(isOn ? 1 : 0, { duration: motion.duration.fast });
      if (!isOn) {
        scale.value = withSpring(1, motion.spring.press);
        return;
      }
      if (reduced) {
        scale.value = 1.08;
        return;
      }
      scale.value = withSequence(
        withSpring(1.18, motion.spring.press),
        withSpring(1.08, motion.spring.pop),
      );
    },
    [index, reduced],
  );

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // The tone icon crossfades over the resting one: the colour changes with the
  // capsule instead of waiting for a re-render.
  const toneIconStyle = useAnimatedStyle(() => ({ opacity: tint.value }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(tint.value, [0, 1], [colors.text.tertiary, toneFace]),
  }));

  return (
    <Pressable
      onPress={() => onPress(index)}
      style={styles.button}
      hitSlop={6}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={[styles.iconWrap, featured && [styles.iconOrb, { backgroundColor: palette[tone].soft }]]}>
        <Animated.View style={iconStyle}>
          <Ionicons name={icon} size={22} color={featured ? colors.text.secondary : colors.text.tertiary} />
          <Animated.View pointerEvents="none" style={[styles.toneIcon, toneIconStyle]}>
            <Ionicons name={icon} size={22} color={toneFace} />
          </Animated.View>
        </Animated.View>
      </View>
      {label ? (
        <Animated.Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={[typography.labelLong, styles.label, labelStyle]}
        >
          {label}
        </Animated.Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    // Five tabs: a slim gutter leaves each capsule room for its whole label.
    paddingHorizontal: spacing.md,
  },
  pill: {
    flexDirection: "row",
    height: BAR_HEIGHT + depth.md,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: BORDER,
    borderColor: colors.border.chunky,
    borderBottomWidth: BORDER + depth.md,
    borderBottomColor: surface.slab,
    backgroundColor: surface.card,
    overflow: "hidden",
    alignItems: "center",
    paddingHorizontal: PAD_X,
    // Fill the row (minus the side gutters) instead of a fixed minimum that
    // overflowed on 320pt-wide phones.
    width: "100%",
    maxWidth: 420,
  },
  capsule: {
    position: "absolute",
    left: 0,
    top: GAP,
    height: CAPSULE_HEIGHT,
    borderRadius: CAPSULE_RADIUS,
    borderWidth: CAPSULE_BORDER,
  },
  button: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: BUTTON_GAP,
    // The label's box ends LABEL_BREATHING inside the capsule's border, so
    // even a label that has to shrink to fit never touches the outline.
    paddingHorizontal: CAPSULE_INSET + CAPSULE_BORDER + LABEL_BREATHING,
  },
  toneIcon: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 30,
    height: ICON_WRAP_H,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOrb: {
    width: 44,
    borderRadius: ICON_WRAP_H / 2,
  },
  label: {
    // Sentence case, barely tracked: the old uppercase 9px label ran wider
    // than its highlight and spilled out ("SANA ÖZEL").
    fontFamily: fonts.heading,
    fontSize: 10.5,
    lineHeight: LABEL_LINE_H,
    letterSpacing: 0.2,
    maxWidth: "100%",
    textAlign: "center",
  },
});
