import React from "react";
import { StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";
import { MotiView } from "moti";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { ConstellationProgress } from "../../components/ConstellationProgress";
import { GoldButton } from "../../components/ui/GoldButton";
import { AppText } from "../../components/ui/AppText";
import { colors, spacing } from "../../lib/design-system";

const TOTAL_STEPS = 3;

interface OnboardingFrameProps {
  step?: number; // 0-based; omit to hide progress
  question: string;
  hint?: string;
  children: React.ReactNode;
  ctaLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
}

/** Shared layout for the middle onboarding steps. */
export function OnboardingFrame({
  step,
  question,
  hint,
  children,
  ctaLabel,
  onNext,
  nextDisabled = false,
}: OnboardingFrameProps) {
  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {step !== undefined ? (
            <View style={styles.progress}>
              <ConstellationProgress total={TOTAL_STEPS} current={step} />
            </View>
          ) : null}

          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 400 }}
            style={styles.head}
          >
            <AppText variant="display" style={styles.question}>
              {question}
            </AppText>
            {hint ? (
              <AppText variant="body" color={colors.text.secondary} style={styles.hint}>
                {hint}
              </AppText>
            ) : null}
          </MotiView>

          <View style={styles.body}>{children}</View>

          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 400, delay: 250 }}
          >
            <GoldButton label={ctaLabel} onPress={onNext} disabled={nextDisabled} />
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  progress: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  head: {
    marginBottom: spacing.xl,
  },
  question: {
    marginBottom: spacing.sm,
  },
  hint: {
    maxWidth: "88%",
  },
  body: {
    flex: 1,
    justifyContent: "center",
  },
});
