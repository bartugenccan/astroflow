import React, { useEffect } from "react";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "./BackButton";
import { AppText } from "./AppText";
import { useMotion } from "../../lib/motion";
import { useUiStore } from "../../store/useUiStore";
import { layout, motion, spacing, surface } from "../../lib/design-system";

interface FullScreenOverlayProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * A full-screen page that rises over the current screen and keeps it alive
 * underneath: for flows that need a callback when they finish (paywall,
 * account) but are too big for a sheet. Closes with ✕ or the Android back
 * button. Slides up on a spring; under Reduce Motion it fades.
 */
export function FullScreenOverlay({ visible, onClose, title, children }: FullScreenOverlayProps) {
  const insets = useSafeAreaInsets();
  const { reduced } = useMotion();
  const pushSheet = useUiStore((s) => s.pushSheet);
  const popSheet = useUiStore((s) => s.popSheet);

  useEffect(() => {
    if (!visible) return;
    pushSheet();
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => {
      sub.remove();
      popSheet();
    };
  }, [visible, onClose, pushSheet, popSheet]);

  if (!visible) return null;
  return (
    <Animated.View
      entering={reduced ? FadeIn.duration(motion.duration.fast) : SlideInDown.springify().damping(22).stiffness(180)}
      exiting={reduced ? FadeOut.duration(motion.duration.fast) : SlideOutDown.duration(motion.duration.exit)}
      style={[styles.overlay, { paddingTop: insets.top }]}
      accessibilityViewIsModal
    >
      <View style={styles.topBar}>
        <BackButton icon="close" onPress={onClose} />
        {title ? (
          <AppText variant="title" style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1500,
    elevation: 1500,
    backgroundColor: surface.base,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    minHeight: 56,
  },
  title: { flex: 1, minWidth: 0 },
  scroll: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.sm,
  },
});
