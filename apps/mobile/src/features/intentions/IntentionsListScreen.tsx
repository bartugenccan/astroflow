import React, { useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useRouter, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { GoldButton } from "../../components/ui/GoldButton";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { PaywallSheet } from "../../components/PaywallSheet";
import { PressableScale } from "../../components/ui/PressableScale";
import { BackButton } from "../../components/ui/BackButton";
import { EnterView } from "../../lib/motion";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { useAppStore, FREE_INTENTIONS } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

export function IntentionsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPremium = useAppStore((s) => s.isPremium);
  const intentions = useAsync(() => astrologyApi.listIntentions(), []);
  const [paywall, setPaywall] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      intentions.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const count = intentions.data?.length ?? 0;

  const onNew = () => {
    if (!isPremium && count >= FREE_INTENTIONS) {
      setPaywall(true);
      return;
    }
    router.push("/intentions/create" as Href);
  };

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

        <EnterView index={1}>
          <GoldButton
            label={t("intentions.newIntention")}
            onPress={onNew}
            icon={<Ionicons name="add" size={18} color={colors.text.onGold} />}
          />
        </EnterView>

        {intentions.loading ? (
          <View style={styles.loaderBox}>
            <CelestialLoader size="sm" />
          </View>
        ) : count > 0 ? (
          <View style={styles.list}>
            {intentions.data!.map((it, i) => (
              <EnterView key={it.id} index={i} delay={140}>
                <PressableScale
                  scaleTo={0.98}
                  accessibilityRole="button"
                  onPress={() => router.push(`/intentions/${it.id}` as Href)}
                >
                  <HairlineCard style={styles.card}>
                    <View style={styles.cardHead}>
                      <AppText variant="heading" numberOfLines={3} style={styles.cardGoal}>
                        {it.goalText}
                      </AppText>
                      <View style={styles.streakPill}>
                        <Ionicons name="flame" size={13} color={colors.gold[300]} />
                        <AppText variant="label" color={colors.gold[200]}>
                          {it.streak.currentStreak}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="bodySmall" numberOfLines={2} style={styles.cardAff}>
                      “{it.affirmation}”
                    </AppText>
                    <AppText variant="labelLong" color={colors.text.tertiary}>
                      {t("intentions.progressLabel", {
                        count: it.progress.count,
                        target: it.progress.target,
                      })}
                    </AppText>
                  </HairlineCard>
                </PressableScale>
              </EnterView>
            ))}
          </View>
        ) : (
          <EnterView index={2}>
            <HairlineCard style={styles.emptyCard}>
              <Ionicons name="sparkles-outline" size={24} color={colors.gold[300]} />
              <AppText variant="body" center>
                {t("intentions.empty")}
              </AppText>
            </HairlineCard>
          </EnterView>
        )}
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
  loaderBox: { alignItems: "center", paddingVertical: spacing.xl },
  list: { gap: spacing.md },
  card: { gap: spacing.sm },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardGoal: { flex: 1, minWidth: 0 },
  emptyCard: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  streakPill: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cardAff: { fontStyle: "italic" },
});
