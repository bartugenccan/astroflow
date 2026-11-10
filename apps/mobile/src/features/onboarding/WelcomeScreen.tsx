import React, { useEffect, useState } from "react";
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, type Href } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { AppText } from "../../components/ui/AppText";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { PressableScale } from "../../components/ui/PressableScale";
import { AccountSheet } from "../account/AccountSheet";
import { ACCOUNTS_ENABLED } from "../../services/auth/account";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { AI_CONSENT_VERSION, useAppStore } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { EnterView } from "../../lib/motion";
import { colors, motion, radii, spacing, surface, typography } from "../../lib/design-system";
import { readTourCheckpoint } from "./tourCheckpoint";

/** Before onboarding ends Aster is still an egg. */
const EGG_STAGE = 0;

/**
 * First screen: the wordmark, then the egg Aster asks your name in its own
 * bubble. If a previous run already cast the chart and stopped mid-tour (app
 * reload), it picks the tour back up instead of starting over.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const name = useOnboardingDraft((s) => s.name);
  const setName = useOnboardingDraft((s) => s.setName);
  const setProfile = useOnboardingDraft((s) => s.setProfile);
  const draftProfile = useOnboardingDraft((s) => s.profile);
  const aiConsentCurrent = useAppStore((s) => !!s.aiConsentAt && s.aiConsentVersion >= AI_CONSENT_VERSION);
  // Returning users (new phone, reinstall) sign in instead of re-onboarding.
  const [signInOpen, setSignInOpen] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);

  // Resume a tour interrupted by a reload: the chart is already cast.
  useEffect(() => {
    let active = true;
    if (draftProfile) {
      setResumeChecked(true);
      return;
    }
    readTourCheckpoint().then((checkpoint) => {
      if (!active) return;
      if (checkpoint) {
        setName(checkpoint.name);
        setProfile(checkpoint.profile);
        router.replace("/(onboarding)/tour" as Href);
        return;
      }
      setResumeChecked(true);
    });
    return () => {
      active = false;
    };
    // Once, on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The wordmark pops in on a spring instead of animating letter-spacing
  // (which re-lays out text every frame).
  const pop = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!resumeChecked || reduced) return;
    pop.value = withDelay(120, withSpring(1, motion.spring.bouncy));
  }, [resumeChecked, reduced, pop]);
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.4),
    transform: [{ scale: 0.82 + pop.value * 0.18 }],
  }));

  if (!resumeChecked) return <ScreenWrapper variant="dense" edges={["top", "bottom"]}>{null}</ScreenWrapper>;

  const trimmed = name.trim();
  const asterLine = trimmed
    ? t("screens.welcome.asterGreet", { name: trimmed })
    : t("screens.welcome.asterAsk");

  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.hero}>
            <Animated.View style={wordmarkStyle}>
              <AppText variant="hero" center accessibilityRole="header">
                AstroFlow
              </AppText>
            </Animated.View>
            <EnterView delay={400}>
              <AppText variant="lead" center color={colors.text.secondary} style={styles.tagline}>
                {t("onboarding.welcomeTagline")}
              </AppText>
            </EnterView>
          </View>

          <EnterView delay={700} scale style={styles.aster}>
            <AsterCameo text={asterLine} stage={EGG_STAGE} size={84} action="talk" mood="happy" />
          </EnterView>

          <EnterView delay={850} style={styles.footer}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("onboarding.namePlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              returnKeyType="done"
              autoCapitalize="words"
              maxLength={40}
              accessibilityLabel={t("onboarding.nameQuestion")}
            />
            <ChunkyButton
              label={t("onboarding.begin")}
              // Birth data leaves the phone from here on: the AI notice comes first, once.
              onPress={() => router.push(aiConsentCurrent ? "/birth-date" : "/consent")}
              disabled={trimmed.length === 0}
              style={styles.cta}
            />
            {ACCOUNTS_ENABLED ? (
              <PressableScale
                onPress={() => setSignInOpen(true)}
                style={styles.signIn}
                accessibilityRole="button"
                accessibilityLabel={t("account.haveAccount")}
              >
                <AppText variant="label" color={colors.text.accent} center>
                  {t("account.haveAccount")}
                </AppText>
              </PressableScale>
            ) : null}
          </EnterView>
        </View>
      </KeyboardAvoidingView>
      <AccountSheet visible={signInOpen} onClose={() => setSignInOpen(false)} intent="signIn" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  tagline: {
    maxWidth: 320,
  },
  aster: {
    marginBottom: spacing.lg,
  },
  footer: {
    gap: spacing.sm,
  },
  input: {
    height: 58,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: 5,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: typography.lead.fontFamily,
    fontSize: typography.lead.fontSize,
  },
  cta: {
    marginTop: spacing.md,
  },
  signIn: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
