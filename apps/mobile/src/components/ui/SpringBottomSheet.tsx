import React, { useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { colors, spacing, radii, motion, blurIntensity, shadows } from "../../lib/design-system";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;
const DISMISS_FRACTION = 0.3;
const FLING_VELOCITY = 900;

interface SpringBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

/**
 * Draggable modal sheet. Drag-to-dismiss is scoped to the grabber/header so the
 * body scrolls freely. Ink-900 surface with a faint gold sheen; springs open
 * with a staggered content entrance.
 */
export function SpringBottomSheet({
  visible,
  onClose,
  title,
  children,
}: SpringBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const materialize = useSharedValue(0); // 0 → hidden, 1 → settled (scale/opacity pop)

  const handleClose = useCallback(() => {
    "worklet";
    translateY.value = withSpring(SHEET_HEIGHT, motion.spring.gentle);
    backdropOpacity.value = withTiming(0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    materialize.value = withTiming(0, { duration: 200 });
    runOnJS(onClose)();
  }, [onClose, translateY, backdropOpacity, materialize]);

  useEffect(() => {
    if (visible) {
      // A soft haptic + materialize (rise, gentle overshoot, scale/opacity pop)
      // so the sheet feels summoned rather than slid.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      translateY.value = withSpring(0, motion.spring.mystic);
      materialize.value = withSpring(1, motion.spring.mystic);
      backdropOpacity.value = withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible, translateY, backdropOpacity, materialize]);

  // Pan only on the grabber/header so the body ScrollView isn't intercepted.
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (
        translateY.value > SHEET_HEIGHT * DISMISS_FRACTION ||
        event.velocityY > FLING_VELOCITY
      ) {
        handleClose();
      } else {
        translateY.value = withSpring(0, motion.spring.snappy);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + materialize.value * 0.3,
    transform: [
      { translateY: translateY.value },
      { scale: 0.96 + materialize.value * 0.04 },
    ],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <AnimatedBlurView
          intensity={blurIntensity.medium}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.backdropTint} />
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Faint gold sheen along the top edge */}
        <LinearGradient
          colors={["rgba(231,205,143,0.08)", "transparent"]}
          style={styles.sheen}
          pointerEvents="none"
        />

        <GestureDetector gesture={pan}>
          <View style={styles.dragZone}>
            <View style={styles.grabber} />
            {title ? (
              <View style={styles.header}>
                <AppText variant="title" style={styles.title} numberOfLines={1}>
                  {title}
                </AppText>
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.text.tertiary}
                  onPress={onClose}
                />
              </View>
            ) : null}
          </View>
        </GestureDetector>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Fade only — a translateY entrance here would shift the content
              under the finger while the sheet is still springing open, which
              reads as the scroll jumping back to the top. */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 220 }}
          >
            {children}
          </MotiView>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 8, 16, 0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.ink[900],
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border.hairlineStrong,
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  dragZone: {
    paddingTop: spacing.md,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold[300],
    opacity: 0.85,
    marginBottom: spacing.sm,
    ...shadows.goldGlow,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  title: {
    flex: 1,
    marginRight: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
