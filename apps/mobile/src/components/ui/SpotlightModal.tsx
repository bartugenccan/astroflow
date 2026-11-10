import React from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMotion } from "../../lib/motion";
import { colors, depth, layout, radii, spacing, surface } from "../../lib/design-system";

interface SpotlightModalProps {
  /** Tap outside the card (only once `canDismiss`). */
  onDismiss: () => void;
  /** Lets an entrance play before a stray tap can skip it. */
  canDismiss?: boolean;
  /** Content that rises above the card's top edge (Aster), kept outside the scroll. */
  crown?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The loud moment, used sparingly: Aster growing a stage (and what it opens),
 * Aster home from a journey. A centred chunky card pops in over a deep scrim;
 * the rest of the app waits. Reduce Motion turns the pop into a fade. It goes
 * through the celebration queue, so two never stack.
 */
export function SpotlightModal({ onDismiss, canDismiss = true, crown, children }: SpotlightModalProps) {
  const m = useMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxCard = height - insets.top - insets.bottom - spacing.xxxl * 2;

  return (
    <Animated.View entering={m.enter("fade")} exiting={m.exit("fade")} style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={canDismiss ? onDismiss : undefined}
        accessible={false}
        importantForAccessibility="no"
      />
      <Animated.View
        entering={m.enter("pop")}
        style={[styles.card, { maxHeight: maxCard }]}
        accessibilityViewIsModal
        accessibilityLiveRegion="assertive"
      >
        {crown ? <View style={styles.crown}>{crown}</View> : null}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 2000,
    elevation: 2000,
    backgroundColor: colors.overlay.celebration,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.gutter,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: surface.sheet,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.lg + 2,
    borderBottomColor: surface.slab,
  },
  crown: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -spacing.xxxl - 24,
  },
  scroll: { flexGrow: 0 },
  content: {
    padding: layout.gutter,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
