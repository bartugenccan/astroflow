import React, { useCallback, useEffect } from "react";
import { Alert, Dimensions, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import Animated, {
  Easing,
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
import { useMotion } from "../../lib/motion";
import { colors, depth, layout, motion, palette, radii, spacing, surface, type Tone } from "../../lib/design-system";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
/** The card never covers more than this much of the screen; longer content scrolls inside. */
const MAX_HEIGHT = SCREEN_HEIGHT * 0.85;
/** The card floats this far in from the screen edges. */
const INSET = spacing.md;
const DISMISS_DISTANCE = 120;
const FLING_VELOCITY = 900;
const BORDER = 2;

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
 */
export function SpringBottomSheet({ visible, onClose, title, icon, tone = "primary", dirty, children }: SpringBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { reduced, springConfig } = useMotion();
  const offset = useSharedValue(reduced ? 0 : MAX_HEIGHT);
  const shown = useSharedValue(0);
  const pushSheet = useUiStore((s) => s.pushSheet);
  const popSheet = useUiStore((s) => s.popSheet);

  // Every open sheet hides the floating tab bar; the store's counter keeps it
  // hidden while any sheet (even a stacked one) is still up.
  useEffect(() => {
    if (!visible) return;
    pushSheet();
    return popSheet;
  }, [visible, pushSheet, popSheet]);

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      offset.value = 0;
      shown.value = withTiming(1, { duration: motion.duration.fast });
      return;
    }
    offset.value = MAX_HEIGHT;
    offset.value = withSpring(0, springConfig("sheet"));
    shown.value = withTiming(1, { duration: motion.duration.base, easing: Easing.out(Easing.cubic) });
  }, [visible, reduced, offset, shown, springConfig]);

  const finishClose = useCallback(() => {
    "worklet";
    // Leaving is quicker than arriving: a short eased slide, no spring tail.
    if (!reduced) {
      offset.value = withTiming(MAX_HEIGHT, { duration: motion.duration.exit, easing: Easing.in(Easing.cubic) });
    }
    shown.value = withTiming(0, { duration: motion.duration.exit });
    runOnJS(onClose)();
  }, [onClose, offset, shown, reduced]);

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

  const cardStyle = useAnimatedStyle(() => ({
    opacity: reduced ? shown.value : 0.6 + shown.value * 0.4,
    transform: [{ translateY: offset.value }, { scale: reduced ? 1 : 0.96 + shown.value * 0.04 }],
  }));
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
        style={[styles.card, { bottom: insets.bottom + INSET, maxHeight: MAX_HEIGHT - insets.top }, cardStyle]}
      >
        <GestureDetector gesture={pan}>
          <View style={styles.dragZone}>
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
          </View>
        </GestureDetector>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
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
