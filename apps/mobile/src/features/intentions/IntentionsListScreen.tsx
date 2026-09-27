import React, { useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { PaywallSheet } from "../../components/PaywallSheet";
import { BackButton } from "../../components/ui/BackButton";
import { EnterView } from "../../lib/motion";
import { IntentionsList } from "./IntentionsList";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

/** `/intentions` — the goals list on its own screen (deep links, back stack). */
export function IntentionsListScreen() {
  const { t } = useTranslation();
  const [paywall, setPaywall] = useState(false);

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.header}>
          <AppText variant="label" color={colors.text.gold}>
            {t("intentions.eyebrow")}
          </AppText>
          <AppText variant="title">{t("intentions.title")}</AppText>
          <AppText variant="body" style={styles.subtitle}>
            {t("intentions.subtitle")}
          </AppText>
        </EnterView>

        <IntentionsList onPaywall={() => setPaywall(true)} enterIndex={1} />
      </ScrollView>

      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  header: { gap: spacing.xs },
  subtitle: { marginTop: spacing.xs },
});
