import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { ScreenWrapper } from "../../../components/ScreenWrapper";
import { ChunkyProgress } from "../../../components/ui/ChunkyProgress";
import { IconButton } from "../../../components/ui/IconButton";
import { useMotion } from "../../../lib/motion";
import { useTranslation } from "../../../i18n";
import { spacing, type Tone } from "../../../lib/design-system";

interface PracticeShellProps {
  /** 1-based step being shown, out of `total`. */
  step: number;
  total: number;
  tone?: Tone;
  onClose: () => void;
  /** When set, the corner button goes one step back instead of closing. */
  onBack?: () => void;
  /** Changes on every step, so each step slides in as a new page. */
  stepKey: string | number;
  children: React.ReactNode;
  /** The one action at the bottom (usually a ChunkyButton). */
  footer?: React.ReactNode;
}

/**
 * The lesson frame every guided practice (and the "write a manifestation"
 * wizard) shares, Duolingo-style: an X and a thin progress bar on top, one
 * step in the middle that slides in from the right, and a single action fixed
 * at the bottom. The sky behind holds still so the page leads.
 */
export function PracticeShell({
  step,
  total,
  tone = "star",
  onClose,
  onBack,
  stepKey,
  children,
  footer,
}: PracticeShellProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const m = useMotion();

  return (
    <ScreenWrapper variant="still" edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.top}>
          <IconButton
            icon={onBack ? "chevron-back" : "close"}
            onPress={onBack ?? onClose}
            size={44}
            accessibilityLabel={onBack ? t("common.back") : t("practice.close")}
          />
          <ChunkyProgress
            value={total > 0 ? step / total : 0}
            tone={tone}
            height={14}
            style={styles.flex}
            accessibilityLabel={t("practice.stepOf", { n: step, total })}
          />
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View key={stepKey} entering={m.enter("next")} exiting={m.exit("fade")} style={styles.step}>
            {children}
          </Animated.View>
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 },
  step: { gap: spacing.lg },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
});
