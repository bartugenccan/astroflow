import React from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { BackButton } from "../../components/ui/BackButton";
import { EnterView } from "../../lib/motion";
import { useTranslation, type TranslationKey } from "../../i18n";
import { legalUrl } from "../../services/config";
import { colors, palette, radii, spacing } from "../../lib/design-system";

const POINTS: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: TranslationKey;
  body: TranslationKey;
}[] = [
  { icon: "sparkles-outline", title: "aiConsent.entertainmentTitle", body: "aiConsent.entertainmentBody" },
  { icon: "cloud-upload-outline", title: "aiConsent.dataTitle", body: "aiConsent.dataBody" },
  { icon: "shield-checkmark-outline", title: "aiConsent.controlTitle", body: "aiConsent.controlBody" },
];

/**
 * One-time notice before any birth data leaves the phone: readings are
 * AI-written and for entertainment, and what is sent to whom (App Store
 * guideline 5.1.2 — data shared with a third-party AI needs disclosure and
 * consent). Accepting stores `aiConsentAt`. Aster (still an egg during
 * onboarding) introduces it so it reads as a friendly heads-up, not a wall.
 */
export function AiConsentScreen({
  onAccept,
  onBack,
  asterStage,
}: {
  onAccept: () => void;
  /** Shown during onboarding, where the notice is a step you can step back from. */
  onBack?: () => void;
  /** Force Aster's stage (the egg before onboarding has finished). */
  asterStage?: number;
}) {
  const { t, locale } = useTranslation();

  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {onBack ? (
          <View style={styles.topBar}>
            <BackButton onPress={onBack} />
          </View>
        ) : null}
        <EnterView>
          <SectionHeader eyebrow={t("aiConsent.eyebrow")} title={t("aiConsent.title")} />
        </EnterView>
        <EnterView index={1} scale>
          <AsterCameo text={t("screens.consent.aster")} stage={asterStage} size={64} mood="happy" />
        </EnterView>

        {POINTS.map((p, i) => (
          <EnterView key={p.title} index={i + 2}>
            <ChunkyCard style={styles.point}>
              <View style={styles.icon}>
                <Ionicons name={p.icon} size={20} color={palette.star.face} />
              </View>
              <View style={styles.text}>
                <AppText variant="heading">{t(p.title)}</AppText>
                <AppText variant="bodySmall" color={colors.text.secondary}>
                  {t(p.body)}
                </AppText>
              </View>
            </ChunkyCard>
          </EnterView>
        ))}

        <EnterView index={POINTS.length + 2} style={styles.footer}>
          <PressableScale
            onPress={() => Linking.openURL(legalUrl("privacy", locale)).catch(() => undefined)}
            scaleTo={0.96}
            haptic="none"
            accessibilityRole="link"
            accessibilityLabel={t("aiConsent.privacyLink")}
            style={styles.link}
          >
            <AppText variant="label" color={colors.text.accent} center>
              {t("aiConsent.privacyLink")}
            </AppText>
          </PressableScale>
          <ChunkyButton label={t("aiConsent.accept")} onPress={onAccept} />
        </EnterView>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  point: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  topBar: {
    flexDirection: "row",
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.star.soft,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  link: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
