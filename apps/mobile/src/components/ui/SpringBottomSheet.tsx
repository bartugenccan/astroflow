import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Alert, Dimensions, StyleSheet, TouchableWithoutFeedback, View, type LayoutChangeEvent, type ViewInstance } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";
import { useTranslation } from "../../i18n";
import { useUiStore } from "../../store/useUiStore";
import { springOf, useMotion } from "../../lib/motion";
import { colors, depth, layout, motion, palette, radii, spacing, surface, type Tone } from "../../lib/design-system";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
/** The card never covers more than this much of the screen; longer content scrolls inside. */
const MAX_HEIGHT = SCREEN_HEIGHT * 0.85;
/** The card floats this far in from the screen edges. */
const INSET = spacing.md;
const DISMISS_DISTANCE = 120;
const FLING_VELOCITY = 900;
const BORDER = 2;
/** At its smallest, an origin morph never squashes the card below this share of its height. */
const MIN_ORIGIN_SCALE_Y = 0.35;
/** An origin sheet not measured by then rises the ordinary way instead. */
const MEASURE_FALLBACK_MS = 250;

/** A rectangle in window coordinates (from `measureInWindow`). */
export interface SheetOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpringBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** A small tone badge beside the title (an icon in the tone's face colour). */
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  /**
   * Unsaved input inside: closing asks first (swipe, backdrop or ✕), so a
   * half-written note is never lost to a stray tap.
   */
  dirty?: boolean;
  /**
   * The on-screen rect of the thing that opened the sheet (a card). The sheet
   * then grows out of that rect and shrinks back into it when it closes, so
   * the card visibly becomes the sheet. In this mode `onClose` fires after the
   * closing motion has landed, so the opener can hide itself until then.
   * Ignored under Reduce Motion (the sheet just fades).
   */
  origin?: SheetOrigin | null;
  children?: React.ReactNode;
}

/**
 * CardSheet — the app's one bottom sheet, for short things only: a picker, a
 * quick form, a confirmation. Long reads and multi-step flows are full-screen
 * routes instead (a sheet is never a primary path).
 *
 * A chunky floating card, inset from the screen edges, sized to its content
 * up to 85% of the screen. Same Duolingo depth as every card: a 2pt outline
 * and a hard 6pt slab, no blur. It rises on the sheet spring and leaves faster
 * than it came; under Reduce Motion it simply fades. Drag the grabber or the
 * header down, tap the backdrop, or press ✕ to close.
 *
 * With an `origin` it opens as a container transform instead: it starts on
 * the opener's rect, travels and grows into place on the same sheet spring
 * (transform only, no overshoot) while its content fades in, and on close
 * returns into that rect before `onClose` fires.
 */
export function SpringBottomSheet({
  visible,
  onClose,
  title,
  icon,
  tone = "primary",
  dirty,
  origin,
  children,
}: SpringBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { reduced, springConfig } = useMotion();
  const morphing = !!origin && !reduced;
  const offset = useSharedValue(reduced ? 0 : MAX_HEIGHT);
  const shown = useSharedValue(0);
  /** Origin mode: 0 = sitting on the opener's rect, 1 = the sheet in place. */
  const morph = useSharedValue(0);
  /** 1 while this opening is a morph; drops to 0 if the sheet could not be measured in time. */
  const morphMode = useSharedValue(0);
  /** Set once closing has begun, so a late measurement can never restart the opening. */
  const closing = useSharedValue(false);
  const from = useSharedValue<SheetOrigin | null>(null);
  const to = useSharedValue<SheetOrigin | null>(null);
  const cardRef = useRef<ViewInstance>(null);
  const pushSheet = useUiStore((s) => s.pushSheet);
  const popSheet = useUiStore((s) => s.popSheet);

  // Every open sheet hides the floating tab bar; the store's counter keeps it
  // hidden while any sheet (even a stacked one) is still up.
  useEffect(() => {
    if (!visible) return;
    pushSheet();
    return popSheet;
  }, [visible, pushSheet, popSheet]);

  // One entrance per opening. A layout effect, so the reset lands before the
  // sheet's first onLayout can measure; it depends only on `visible` (and the
  // mode), never on per-render values, so a re-render while open never replays
  // the entrance. `origin` is read here once per opening on purpose.
  useLayoutEffect(() => {
    if (!visible) return;
    closing.value = false;
    if (reduced) {
      morphMode.value = 0;
      offset.value = 0;
      shown.value = withTiming(1, { duration: motion.duration.fast });
      return;
    }
    shown.value = withTiming(1, { duration: motion.duration.base, easing: Easing.out(Easing.cubic) });
    if (morphing) {
      // The spring starts once the sheet's own rect is measured (onCardLayout).
      morphMode.value = 1;
      offset.value = 0;
      morph.value = 0;
      to.value = null;
      from.value = origin ?? null;
      // Never measured (no layout event, zero rect): fall back to the plain rise.
      const fallback = setTimeout(() => {
        if (to.value !== null || closing.value) return;
        morphMode.value = 0;
        offset.value = MAX_HEIGHT;
        offset.value = withSpring(0, springOf("sheet"));
      }, MEASURE_FALLBACK_MS);
      return () => clearTimeout(fallback);
    }
    morphMode.value = 0;
    offset.value = MAX_HEIGHT;
    offset.value = withSpring(0, springOf("sheet"));
  }, [visible, reduced, morphing, offset, shown, morph, morphMode, closing, from, to]);

  /** Origin mode: measure where the sheet landed, then grow out of the opener. */
  const onCardLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      if (!morphing || closing.value || morphMode.value !== 1) return;
      // Measure only while untransformed: before the first run, or at rest.
      if (to.value && morph.value !== 1) return;
      cardRef.current?.measureInWindow((x, y, width, height) => {
        if (!width || !height || closing.value || morphMode.value !== 1) return;
        const first = to.value === null;
        to.value = { x, y, width, height };
        if (first) morph.value = withSpring(1, springOf("sheet"));
      });
    },
    [morphing, morph, morphMode, closing, to],
  );

  const finishClose = useCallback(() => {
    "worklet";
    closing.value = true;
    if (morphing && morphMode.value === 1 && to.value !== null) {
      // Back into the opener, quicker than it came; the opener reappears on
      // onClose, which fires even if this motion is cut short.
      offset.value = withTiming(0, { duration: motion.duration.exit, easing: Easing.in(Easing.cubic) });
      shown.value = withTiming(0, { duration: motion.duration.exit });
      morph.value = withTiming(0, { duration: motion.duration.exit, easing: Easing.in(Easing.cubic) }, () => {
        runOnJS(onClose)();
      });
      return;
    }
    // Leaving is quicker than arriving: a short eased slide, no spring tail.
    if (!reduced) {
      offset.value = withTiming(MAX_HEIGHT, { duration: motion.duration.exit, easing: Easing.in(Easing.cubic) });
    }
    shown.value = withTiming(0, { duration: motion.duration.exit });
    runOnJS(onClose)();
  }, [onClose, offset, shown, morph, morphMode, closing, to, reduced, morphing]);

  const requestClose = useCallback(() => {
    if (!dirty) {
      finishClose();
      return;
    }
    offset.value = withSpring(0, springConfig("press"));
    Alert.alert(t("common.discardTitle"), t("common.discardBody"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => finishClose() },
    ]);
  }, [dirty, finishClose, offset, springConfig, t]);

  // Pan only on the grabber/header so the body ScrollView is never intercepted.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      offset.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (offset.value > DISMISS_DISTANCE || e.velocityY > FLING_VELOCITY) {
        runOnJS(requestClose)();
      } else {
        offset.value = withSpring(0, motion.spring.press);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    if (morphMode.value !== 1) {
      return {
        opacity: reduced ? shown.value : 0.6 + shown.value * 0.4,
        transform: [{ translateY: offset.value }, { scale: reduced ? 1 : 0.96 + shown.value * 0.04 }],
      };
    }
    const a = from.value;
    const b = to.value;
    // Not measured yet: lay out untransformed and invisible.
    if (!a || !b) return { opacity: 0, transform: [] };
    const p = morph.value;
    const sx = a.width / b.width;
    const sy = Math.max(a.height / b.height, MIN_ORIGIN_SCALE_Y);
    const dx = a.x + a.width / 2 - (b.x + b.width / 2);
    const dy = a.y + a.height / 2 - (b.y + b.height / 2);
    return {
      opacity: interpolate(p, [0, 0.12], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: dx * (1 - p) },
        { translateY: dy * (1 - p) + offset.value },
        { scaleX: sx + (1 - sx) * p },
        { scaleY: sy + (1 - sy) * p },
      ],
    };
  });
  // The content only appears once the card is close to its real shape, so the
  // squash of the first frames never shows on text. Two styles (header, body)
  // so the sheet's layout tree stays exactly as it is without an origin.
  const contentOpacity = () => {
    "worklet";
    return morphMode.value === 1 ? interpolate(morph.value, [0.45, 0.9], [0, 1], Extrapolation.CLAMP) : 1;
  };
  const headStyle = useAnimatedStyle(() => ({ opacity: contentOpacity() }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: contentOpacity() }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: shown.value }));

  if (!visible) return null;

  const toneSet = palette[tone];

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <TouchableWithoutFeedback onPress={requestClose} accessibilityRole="button" accessibilityLabel={t("common.close")}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        ref={cardRef}
        onLayout={morphing ? onCardLayout : undefined}
        collapsable={false}
        style={[styles.card, { bottom: insets.bottom + INSET, maxHeight: MAX_HEIGHT - insets.top }, cardStyle]}
      >
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.dragZone, headStyle]}>
            <View style={styles.grabber} />
            {title ? (
              <View style={styles.header}>
                {icon ? (
                  <View style={[styles.badge, { backgroundColor: toneSet.face, borderColor: toneSet.slab }]}>
                    <Ionicons name={icon} size={18} color={toneSet.on} />
                  </View>
                ) : null}
                <AppText variant="title" style={styles.title} numberOfLines={2} accessibilityRole="header">
                  {title}
                </AppText>
                <IconButton icon="close" onPress={requestClose} size={44} accessibilityLabel={t("common.close")} />
              </View>
            ) : null}
          </Animated.View>
        </GestureDetector>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={bodyStyle}>{children}</Animated.View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    backgroundColor: colors.overlay.scrim,
  },
  card: {
    position: "absolute",
    left: INSET,
    right: INSET,
    backgroundColor: surface.sheet,
    borderRadius: radii.xl,
    borderWidth: BORDER,
    borderColor: colors.border.chunky,
    borderBottomWidth: BORDER + depth.lg,
    borderBottomColor: surface.slab,
    overflow: "hidden",
  },
  dragZone: {
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border.hairlineStrong,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: layout.gutter,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 0,
    borderBottomWidth: depth.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.sm,
    paddingBottom: layout.gutter,
  },
});
