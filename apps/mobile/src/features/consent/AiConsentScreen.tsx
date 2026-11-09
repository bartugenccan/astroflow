import React from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { EnterView } from "../../lib/motion";
import { useTranslation, type TranslationKey } from "../../i18n";
import { legalUrl } from "../../services/config";
import { colors, spacing } from "../../lib/design-system";

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
 * consent). Accepting stores `aiConsentAt`.
 */
export function AiConsentScreen({ onAccept }: { onAccept: () => void }) {
  const { t, locale } = useTranslation();

  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView>
          <SectionHeader eyebrow={t("aiConsent.eyebrow")} title={t("aiConsent.title")} />
        </EnterView>

        {POINTS.map((p, i) => (
          <EnterView key={p.title} index={i + 1}>
            <HairlineCard style={styles.point}>
              <View style={styles.icon}>
                <Ionicons name={p.icon} size={20} color={colors.star[300]} />
              </View>
              <View style={styles.text}>
                <AppText variant="heading">{t(p.title)}</AppText>
                <AppText variant="bodySmall" color={colors.text.secondary}>
                  {t(p.body)}
                </AppText>
              </View>
            </HairlineCard>
          </EnterView>
        ))}

        <EnterView index={POINTS.length + 1} style={styles.footer}>
          <PressableScale
            onPress={() => Linking.openURL(legalUrl("privacy", locale)).catch(() => undefined)}
            scaleTo={0.96}
            haptic="none"
            accessibilityRole="link"
            style={styles.link}
          >
            <AppText variant="label" color={colors.text.accent} center>
              {t("aiConsent.privacyLink")}
            </AppText>
          </PressableScale>
          <GoldButton label={t("aiConsent.accept")} onPress={onAccept} />
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
  icon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
