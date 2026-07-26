import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { GoldButton } from "../../components/ui/GoldButton";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { PaywallSheet } from "../../components/PaywallSheet";
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="label" color={colors.text.gold}>
            {t("intentions.eyebrow")}
          </AppText>
          <AppText variant="title">{t("intentions.title")}</AppText>
          <AppText variant="body" style={styles.subtitle}>
            {t("intentions.subtitle")}
          </AppText>
        </View>

        <GoldButton
          label={t("intentions.newIntention")}
          onPress={onNew}
          icon={<Ionicons name="add" size={18} color={colors.text.onGold} />}
        />

        {intentions.loading ? (
          <View style={styles.loaderBox}>
            <CelestialLoader size="sm" />
          </View>
        ) : count > 0 ? (
          <View style={styles.list}>
            {intentions.data!.map((it, i) => (
              <MotiView
                key={it.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 300, delay: i * 70 }}
              >
                <Pressable onPress={() => router.push(`/intentions/${it.id}` as Href)}>
                  <HairlineCard style={styles.card}>
                    <View style={styles.cardHead}>
                      <AppText variant="heading" style={styles.cardGoal}>
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
                    <AppText variant="label" color={colors.text.tertiary}>
                      {t("intentions.progressLabel", {
                        count: it.progress.count,
                        target: it.progress.target,
                      })}
                    </AppText>
                  </HairlineCard>
                </Pressable>
              </MotiView>
            ))}
          </View>
        ) : (
          <HairlineCard>
            <AppText variant="body" center>
              {t("intentions.empty")}
            </AppText>
          </HairlineCard>
        )}
      </ScrollView>

      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardGoal: { flex: 1 },
  streakPill: {
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
