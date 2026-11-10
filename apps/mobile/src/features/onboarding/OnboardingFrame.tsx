import React from "react";
import { StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { ConstellationProgress } from "../../components/ConstellationProgress";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { AppText } from "../../components/ui/AppText";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { BackButton } from "../../components/ui/BackButton";
import { EnterView } from "../../lib/motion";
import { colors, spacing } from "../../lib/design-system";

const TOTAL_STEPS = 3;
/** Before onboarding ends Aster is still an egg. */
const EGG_STAGE = 0;

interface OnboardingFrameProps {
  step?: number; // 0-based; omit to hide progress
  question: string;
  hint?: string;
  /** What the egg says on this step — Aster walks the newcomer through it. */
  asterLine?: string;
  children: React.ReactNode;
  ctaLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
  /**
   * "center" suits fixed-size bodies (wheels). "top" is for bodies whose
   * height changes as you type (search results): centred content re-centres
   * on every change and pushes the input around — often under the keyboard.
   */
  bodyAlign?: "center" | "top";
}

/** Shared layout for the middle onboarding steps. */
export function OnboardingFrame({
  step,
  question,
  hint,
  asterLine,
  children,
  ctaLabel,
  onNext,
  nextDisabled = false,
  bodyAlign = "center",
}: OnboardingFrameProps) {
  const router = useRouter();
  // Onboarding stays back-able: every step can return to the one before it.
  const canGoBack = router.canGoBack();

  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <View style={styles.topBar}>
            <View style={styles.side}>{canGoBack ? <BackButton /> : null}</View>
            {step !== undefined ? (
              <ConstellationProgress total={TOTAL_STEPS} current={step} />
            ) : null}
            <View style={styles.side} />
          </View>

          {asterLine ? (
            <EnterView from="none" scale style={styles.aster}>
              <AsterCameo text={asterLine} stage={EGG_STAGE} size={56} mood="happy" />
            </EnterView>
          ) : null}

          <EnterView index={1} style={styles.head}>
            <AppText
              variant="display"
              style={styles.question}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              accessibilityRole="header"
            >
              {question}
            </AppText>
            {hint ? (
              <AppText variant="body" color={colors.text.secondary} style={styles.hint}>
                {hint}
              </AppText>
            ) : null}
          </EnterView>

          <View style={[styles.body, bodyAlign === "top" && styles.bodyTop]}>
            {children}
          </View>

          <EnterView index={2}>
            <ChunkyButton label={ctaLabel} onPress={onNext} disabled={nextDisabled} />
          </EnterView>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    marginBottom: spacing.lg,
  },
  side: {
    width: 48,
  },
  aster: {
    marginBottom: spacing.lg,
  },
  head: {
    marginBottom: spacing.lg,
  },
  question: {
    marginBottom: spacing.sm,
  },
  hint: {
    maxWidth: "92%",
  },
  body: {
    flex: 1,
    justifyContent: "center",
  },
  bodyTop: {
    justifyContent: "flex-start",
  },
});
