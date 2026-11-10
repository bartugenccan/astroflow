import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { AppText } from "../../../components/ui/AppText";
import { useMotion } from "../../../lib/motion";
import { haptics } from "../../../lib/haptics";
import { useTranslation, type TranslationKey } from "../../../i18n";
import { useReflectionStore } from "../../../store/useReflectionStore";
import type { PracticeMethod } from "../../../services/types";
import { colors, depth, palette, radii, spacing, surface } from "../../../lib/design-system";
import { METHOD_LOOK } from "../practiceModel";

/**
 * "Why it helps" for a practice method. The first time a method is opened it
 * is a full card; after that it folds into a small tip the user can open.
 * Marking it seen happens when the practice starts, not on render.
 */
export function WhyCard({ method }: { method: PracticeMethod }) {
  const { t } = useTranslation();
  const m = useMotion();
  const seen = useReflectionStore((s) => s.seenWhy.includes(method));
  const [open, setOpen] = useState(!seen);
  const look = METHOD_LOOK[method];
  const tone = palette[look.tone];
  const body = t(`practice.methods.${method}.why` as TranslationKey);

  if (!open) {
    return (
      <Pressable
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={t("practice.whyTip")}
        style={styles.tip}
        hitSlop={8}
      >
        <Ionicons name="bulb" size={16} color={tone.face} />
        <AppText variant="labelLong" color={colors.text.secondary}>
          {t("practice.whyTip")}
        </AppText>
      </Pressable>
    );
  }

  return (
    <Animated.View entering={m.enter("fade")} style={[styles.card, { borderColor: tone.face }]}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: tone.face }]} importantForAccessibility="no-hide-descendants">
          <Ionicons name="bulb" size={16} color={tone.on} />
        </View>
        <AppText variant="heading" color={tone.face}>
          {t("practice.whyTitle")}
        </AppText>
      </View>
      <AppText variant="body" color={colors.text.primary}>
        {body}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: surface.raised,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderBottomWidth: depth.sm + 2,
    borderBottomColor: surface.slab,
    backgroundColor: surface.card,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
