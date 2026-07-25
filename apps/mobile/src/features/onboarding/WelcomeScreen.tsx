import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { GoldButton } from "../../components/ui/GoldButton";
import { AppText } from "../../components/ui/AppText";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { useTranslation } from "../../i18n";
import { colors, spacing, fonts, radii } from "../../lib/design-system";

export function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const name = useOnboardingDraft((s) => s.name);
  const setName = useOnboardingDraft((s) => s.setName);

  const spacingV = useSharedValue(10);

  useEffect(() => {
    spacingV.value = withDelay(
      200,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
    );
  }, [spacingV]);

  const wordmarkStyle = useAnimatedStyle(() => ({
    letterSpacing: spacingV.value,
  }));

  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.hero}>
            <Animated.Text style={[styles.wordmark, wordmarkStyle]}>
              AstroFlow
            </Animated.Text>

            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 700, delay: 700 }}
            >
              <AppText variant="serifBody" center color={colors.text.secondary} style={styles.tagline}>
                {t("onboarding.welcomeTagline")}
              </AppText>
            </MotiView>
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500, delay: 1000 }}
            style={styles.footer}
          >
            <AppText variant="label" color={colors.text.gold} style={styles.nameLabel}>
              {t("onboarding.nameQuestion")}
            </AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("onboarding.namePlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              returnKeyType="done"
              autoCapitalize="words"
            />
            <GoldButton
              label={t("onboarding.begin")}
              onPress={() => router.push("/birth-date")}
              disabled={name.trim().length === 0}
              style={styles.cta}
            />
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
    paddingBottom: spacing.xl,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: 46,
    color: colors.text.primary,
  },
  tagline: {
    maxWidth: "84%",
  },
  footer: {
    gap: spacing.sm,
  },
  nameLabel: {
    marginLeft: spacing.xs,
  },
  input: {
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 17,
  },
  cta: {
    marginTop: spacing.md,
  },
});
