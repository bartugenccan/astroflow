import React, { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "../../components/ui/AppText";
import { haptics } from "../../lib/haptics";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, depth, motion, palette, radii, spacing, surface } from "../../lib/design-system";
import { WishStarGlyph } from "../manifest/WishStarGlyph";
import type { StarLook } from "../manifest/wishModel";

/** How the star looks at each brightness. */
export const LEVEL_LOOK: Record<number, StarLook> = { 0: "seed", 1: "seed", 2: "spark", 3: "spark", 4: "glowing", 5: "radiant" };

/**
 * "How bright does this feel right now?" — the 1–5 conviction a practice
 * sends with a check-in: a big star that grows with the level, the star
 * slider and the level's name.
 */
export function ConvictionPicker({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (v: number) => void;
  /** Smaller star, for a practice's last step. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const levelLabel = (n: number) => t(`wish.checkin.levels.l${n}` as TranslationKey);
  return (
    <View style={styles.block}>
      <AppText variant="heading" center>
        {t("wish.checkin.question")}
      </AppText>
      <BrightStar level={value} size={compact ? 84 : 120} />
      <BrightnessSlider value={value} onChange={onChange} labelOf={levelLabel} />
      <AppText
        variant="heading"
        center
        color={value ? colors.star[200] : colors.text.tertiary}
        accessibilityLiveRegion="polite"
      >
        {value ? levelLabel(value) : " "}
      </AppText>
    </View>
  );
}

/** The big star above the slider — grows and brightens with the chosen level. */
function BrightStar({ level, size }: { level: number; size: number }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(0.7);
  useEffect(() => {
    const target = 0.7 + level * 0.07;
    scale.value = reduced ? target : withSpring(target, motion.spring.pop);
  }, [level, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[styles.bigStar, { width: size, height: size }, style]}
      importantForAccessibility="no-hide-descendants"
    >
      <WishStarGlyph look={LEVEL_LOOK[level]} size={size} />
    </Animated.View>
  );
}

const STOPS = 5;
const THUMB = 48;

/**
 * A chunky 1–5 slider: drag the star along the track or tap a stop. Each new
 * level ticks a haptic. Screen readers get an adjustable control.
 */
function BrightnessSlider({
  value,
  onChange,
  labelOf,
}: {
  value: number;
  onChange: (v: number) => void;
  labelOf: (n: number) => string;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const last = useRef(value);
  last.current = value;

  const stopW = w / STOPS;

  /** The stop last sent to JS, so a drag crosses the bridge only when it changes stop. */
  const lastStop = useSharedValue(value);

  useEffect(() => {
    lastStop.value = value;
    if (w <= 0 || value === 0) return;
    const c = (value - 0.5) * (w / STOPS);
    x.value = reduced ? c : withSpring(c, motion.spring.press);
  }, [value, w, reduced, x]);

  const pick = (v: number) => {
    if (v === last.current) return;
    last.current = v;
    haptics.select();
    onChange(v);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      if (w <= 0) return;
      const sw = w / STOPS;
      x.value = Math.max(sw / 2, Math.min(w - sw / 2, e.x));
      const v = Math.max(1, Math.min(STOPS, Math.floor(e.x / sw) + 1));
      if (v === lastStop.value) return;
      lastStop.value = v;
      runOnJS(pick)(v);
    })
    .onEnd((e) => {
      if (w <= 0) return;
      const sw = w / STOPS;
      const v = Math.max(1, Math.min(STOPS, Math.floor(e.x / sw) + 1));
      x.value = withSpring((v - 0.5) * sw, motion.spring.press);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    if (w <= 0) return;
    const v = Math.max(1, Math.min(STOPS, Math.floor(e.x / (w / STOPS)) + 1));
    lastStop.value = v;
    runOnJS(pick)(v);
  });

  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB / 2 }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - THUMB / 2 }] }));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t("wish.checkin.sliderA11y")}
      accessibilityHint={t("wish.checkin.sliderHint")}
      accessibilityValue={{
        min: 1,
        max: STOPS,
        now: value || undefined,
        text: value ? t("wish.checkin.sliderValue", { n: value, label: labelOf(value) }) : undefined,
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment") pick(Math.min(STOPS, (value || 0) + 1));
        if (e.nativeEvent.actionName === "decrement") pick(Math.max(1, (value || 2) - 1));
      }}
    >
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
          {value > 0 ? <Animated.View style={[styles.fill, fillStyle]} /> : null}
          <View style={styles.stops} pointerEvents="none">
            {Array.from({ length: STOPS }, (_, i) => (
              <View key={i} style={styles.stop}>
                <WishStarGlyph look={LEVEL_LOOK[i + 1]} size={14 + i * 3} />
              </View>
            ))}
          </View>
          {value > 0 && w > 0 ? (
            <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none">
              <WishStarGlyph look={LEVEL_LOOK[value]} size={THUMB} />
            </Animated.View>
          ) : null}
        </View>
      </GestureDetector>
      <View style={styles.scale} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: STOPS }, (_, i) => (
          <AppText key={i} variant="numeric" center style={{ width: stopW || undefined }}>
            {i + 1}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  bigStar: { alignSelf: "center" },
  track: {
    height: 64,
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 2,
    borderBottomWidth: depth.md,
    borderColor: colors.border.chunky,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.pill,
    backgroundColor: palette.star.soft,
  },
  stops: { ...StyleSheet.absoluteFill, flexDirection: "row" },
  stop: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumb: { position: "absolute", left: 0, width: THUMB, height: THUMB },
  scale: { flexDirection: "row", marginTop: spacing.xs },
});
