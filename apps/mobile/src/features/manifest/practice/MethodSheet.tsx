import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../../components/ui/AppText";
import { PressableScale } from "../../../components/ui/PressableScale";
import { SpringBottomSheet } from "../../../components/ui/SpringBottomSheet";
import { useReflectionStore } from "../../../store/useReflectionStore";
import { localDay } from "../../../store/useAffirmationStore";
import { useTranslation, type TranslationKey } from "../../../i18n";
import type { PracticeMethod } from "../../../services/types";
import { colors, depth, palette, radii, spacing, surface } from "../../../lib/design-system";
import { METHOD_LOOK, PRACTICE_METHODS, methodDone, slotFor } from "../practiceModel";

/** "How do you want to practise?" — the four methods as big rows, ticked when done today. */
export function MethodSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (method: PracticeMethod) => void;
}) {
  const { t } = useTranslation();
  const day = useReflectionStore((s) => s.practice[localDay()]);
  const slot = slotFor(new Date().getHours());

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("practice.today")}>
      <View style={styles.list}>
        {PRACTICE_METHODS.map((m) => {
          const look = METHOD_LOOK[m];
          const tone = palette[look.tone];
          const done = methodDone(day, m, slot);
          const name = t(`practice.methods.${m}.name` as TranslationKey);
          const short = t(`practice.methods.${m}.short` as TranslationKey);
          return (
            <PressableScale
              key={m}
              onPress={() => onPick(m)}
              scaleTo={0.98}
              style={[styles.row, { borderColor: tone.face }]}
              accessibilityRole="button"
              accessibilityLabel={done ? t("practice.methodDoneA11y", { name }) : t("practice.methodA11y", { name, short })}
            >
              <View style={[styles.icon, { backgroundColor: tone.face }]} importantForAccessibility="no-hide-descendants">
                <Ionicons name={look.icon} size={22} color={tone.on} />
              </View>
              <View style={styles.text}>
                <AppText variant="heading">{name}</AppText>
                <AppText variant="bodySmall" color={colors.text.secondary}>
                  {short}
                </AppText>
              </View>
              <Ionicons
                name={done ? "checkmark-circle" : "chevron-forward"}
                size={22}
                color={done ? palette.mint.face : colors.text.tertiary}
              />
            </PressableScale>
          );
        })}
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderBottomWidth: depth.sm + 2,
    borderBottomColor: surface.slab,
    backgroundColor: surface.card,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
});
