import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/AppText";
import { ChunkyButton } from "./ui/ChunkyButton";
import { PressableScale } from "./ui/PressableScale";
import { CelestialLoader } from "./ui/CelestialLoader";
import { TranslationKey, useTranslation } from "../i18n";
import { legalUrl } from "../services/config";
import { buyPlan, loadPlans, restorePurchases, type PremiumPlan } from "../services/purchases";
import { colors, palette, radii, spacing, surface } from "../lib/design-system";

const PERIOD_KEY: Record<string, TranslationKey> = {
  annual: "paywall.planAnnual",
  six_month: "paywall.planSixMonth",
  three_month: "paywall.planThreeMonth",
  monthly: "paywall.planMonthly",
  weekly: "paywall.planWeekly",
  lifetime: "paywall.planLifetime",
};

/**
 * The store's plans (RevenueCat's current offering): pick one, subscribe,
 * or restore. Prices come from the store, never from us. Carries what App
 * Review asks of a subscription screen (3.1.2): price and period, the
 * auto-renew note, Restore, and links to the Terms and the Privacy Policy.
 */
export function PremiumPlans({ onPurchased }: { onPurchased: () => void }) {
  const { t, locale } = useTranslation();
  const [plans, setPlans] = useState<PremiumPlan[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setPlans(null);
    loadPlans().then((p) => {
      if (!alive) return;
      setPlans(p);
      setPicked((cur) => cur ?? p[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const plan = plans?.find((p) => p.id === picked) ?? null;

  const buy = async () => {
    if (!plan || busy) return;
    setBusy("buy");
    setNote(null);
    const res = await buyPlan(plan);
    setBusy(null);
    if (res === "purchased") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onPurchased();
    } else if (res === "failed") {
      setNote({ text: t("paywall.purchaseFailed"), error: true });
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy("restore");
    setNote(null);
    const res = await restorePurchases();
    setBusy(null);
    if (res === "restored") {
      setNote({ text: t("paywall.restored"), error: false });
      onPurchased();
    } else {
      setNote({ text: res === "none" ? t("paywall.restoreNone") : t("paywall.purchaseFailed"), error: res === "failed" });
    }
  };

  const open = (page: "terms" | "privacy") => Linking.openURL(legalUrl(page, locale)).catch(() => undefined);

  return (
    <View style={styles.wrap}>
      {plans === null ? (
        <View style={styles.loading}>
          <CelestialLoader size="sm" />
          <AppText variant="bodySmall" color={colors.text.secondary}>
            {t("paywall.plansLoading")}
          </AppText>
        </View>
      ) : plans.length === 0 ? (
        <View style={styles.loading}>
          <AppText variant="bodySmall" center color={colors.text.secondary}>
            {t("paywall.plansError")}
          </AppText>
          <ChunkyButton label={t("common.retry")} onPress={() => setAttempt((a) => a + 1)} variant="ghost" size="md" />
        </View>
      ) : (
        <View style={styles.plans} accessibilityRole="radiogroup">
          {plans.map((p) => {
            const selected = p.id === picked;
            return (
              <PressableScale
                key={p.id}
                onPress={() => setPicked(p.id)}
                scaleTo={0.98}
                style={[styles.plan, selected && styles.planSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${t(PERIOD_KEY[p.period] ?? "paywall.planMonthly")}, ${p.price}`}
              >
                <Ionicons
                  name={selected ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={selected ? palette.star.face : colors.text.tertiary}
                />
                <AppText variant="heading" style={styles.grow}>
                  {PERIOD_KEY[p.period] ? t(PERIOD_KEY[p.period]) : p.id}
                </AppText>
                <AppText variant="numeric">{p.price}</AppText>
              </PressableScale>
            );
          })}
        </View>
      )}

      {plan ? (
        <ChunkyButton
          label={t("paywall.subscribe", { price: plan.price })}
          onPress={buy}
          loading={busy === "buy"}
          variant="star"
          size="lg"
        />
      ) : null}

      {note ? (
        <AppText
          variant="bodySmall"
          center
          color={note.error ? colors.semantic.error : palette.mint.face}
          accessibilityLiveRegion="polite"
        >
          {note.text}
        </AppText>
      ) : null}

      <ChunkyButton
        label={t("paywall.restore")}
        onPress={restore}
        loading={busy === "restore"}
        variant="ghost"
        size="md"
        uppercase={false}
      />

      <AppText variant="bodySmall" center color={colors.text.tertiary}>
        {t("paywall.renewNote")}
      </AppText>
      <View style={styles.legal}>
        <PressableScale onPress={() => open("terms")} hitSlop={8} accessibilityRole="link" style={styles.legalLink}>
          <AppText variant="bodySmall" color={colors.text.accent}>
            {t("paywall.terms")}
          </AppText>
        </PressableScale>
        <AppText variant="bodySmall" color={colors.text.tertiary}>
          ·
        </AppText>
        <PressableScale onPress={() => open("privacy")} hitSlop={8} accessibilityRole="link" style={styles.legalLink}>
          <AppText variant="bodySmall" color={colors.text.accent}>
            {t("paywall.privacy")}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  loading: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  plans: { gap: spacing.sm },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: surface.raised,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: 5,
    borderBottomColor: surface.slab,
  },
  planSelected: {
    borderColor: palette.star.face,
    borderBottomColor: palette.star.slab,
    backgroundColor: palette.star.soft,
  },
  grow: { flex: 1, minWidth: 0 },
  legal: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm },
  legalLink: { minHeight: 44, justifyContent: "center" },
});
