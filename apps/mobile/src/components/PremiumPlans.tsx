import React, { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/AppText";
import { ChunkyButton } from "./ui/ChunkyButton";
import { PressableScale } from "./ui/PressableScale";
import { CelestialLoader } from "./ui/CelestialLoader";
import { TranslationKey, useTranslation } from "../i18n";
import { legalUrl } from "../services/config";
import { annualSaving, buyPlan, loadPlans, restorePurchases, type PremiumPlan } from "../services/purchases";
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
 * The store's plans (RevenueCat's current offering): pick one, subscribe, or
 * restore. Prices come from the store, never from us.
 *
 * App Review 3.1.2: the billed amount ("₺999,99/yıl") is the biggest price on
 * every card; the monthly equivalent and the badges sit under it, smaller. A
 * trial CTA names what follows ("7 gün ücretsiz, sonra ₺X/yıl") right under the
 * button, and the renewal terms, Restore, Terms and Privacy are always shown.
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
      // The yearly plan (first) is the recommended one.
      setPicked((cur) => cur ?? p[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const saving = useMemo(() => (plans ? annualSaving(plans) : null), [plans]);
  const plan = plans?.find((p) => p.id === picked) ?? null;
  const annual = plans?.find((p) => p.period === "annual") ?? null;

  const billed = (p: PremiumPlan) =>
    p.period === "annual"
      ? t("profileUi.paywall.perYear", { price: p.price })
      : p.period === "monthly"
        ? t("profileUi.paywall.perMonth", { price: p.price })
        : p.price;

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
      onPurchased();
    } else {
      setNote({ text: res === "none" ? t("paywall.restoreNone") : t("paywall.purchaseFailed"), error: res === "failed" });
    }
  };

  const open = (page: "terms" | "privacy") => Linking.openURL(legalUrl(page, locale)).catch(() => undefined);

  return (
    <View style={styles.wrap}>
      {plans === null ? (
        <View style={styles.loading} accessibilityLiveRegion="polite">
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
            const isAnnual = p.period === "annual";
            return (
              <PressableScale
                key={p.id}
                onPress={() => setPicked(p.id)}
                scaleTo={0.98}
                haptic="selection"
                style={[styles.plan, selected && styles.planSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${t(PERIOD_KEY[p.period] ?? "paywall.planMonthly")}, ${billed(p)}${
                  p.trialDays ? `, ${t("profileUi.paywall.trialBadge", { n: p.trialDays })}` : ""
                }`}
              >
                <View style={styles.planTop}>
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected ? <Ionicons name="checkmark" size={14} color={palette.star.on} /> : null}
                  </View>
                  <AppText variant="heading" style={styles.grow}>
                    {PERIOD_KEY[p.period] ? t(PERIOD_KEY[p.period]) : p.id}
                  </AppText>
                  {isAnnual && saving ? (
                    <View style={[styles.badge, styles.badgeStar]}>
                      <AppText variant="label" color={palette.star.on}>
                        {t("profileUi.paywall.saveBadge", { n: saving })}
                      </AppText>
                    </View>
                  ) : isAnnual ? (
                    <View style={[styles.badge, styles.badgeStar]}>
                      <AppText variant="label" color={palette.star.on}>
                        {t("profileUi.paywall.bestValue")}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                {/* The billed amount is the most prominent price (3.1.2). */}
                <AppText variant="title" style={styles.price}>
                  {billed(p)}
                </AppText>
                {(isAnnual && p.pricePerMonth) || p.trialDays ? (
                  <View style={styles.subRow}>
                    {isAnnual && p.pricePerMonth ? (
                      <AppText variant="bodySmall" color={colors.text.secondary}>
                        {t("profileUi.paywall.perMonthEquivalent", { price: p.pricePerMonth })}
                      </AppText>
                    ) : null}
                    {p.trialDays ? (
                      <View style={[styles.badge, styles.badgeMint]}>
                        <AppText variant="label" color={palette.mint.on}>
                          {t("profileUi.paywall.trialBadge", { n: p.trialDays })}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </View>
      )}

      {plan ? (
        <View style={styles.cta}>
          <ChunkyButton
            label={
              plan.trialDays
                ? t("profileUi.paywall.ctaTrial", { n: plan.trialDays })
                : t("profileUi.paywall.ctaSubscribe", { price: billed(plan) })
            }
            onPress={buy}
            loading={busy === "buy"}
            disabled={busy !== null}
            variant="star"
            size="lg"
            icon={<Ionicons name="sparkles" size={18} color={palette.star.on} />}
          />
          <AppText variant="bodySmall" center color={colors.text.secondary}>
            {plan.trialDays
              ? t("profileUi.paywall.afterTrial", { n: plan.trialDays, price: plan.price })
              : t("profileUi.paywall.cancelAnytime")}
          </AppText>
        </View>
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
        disabled={busy !== null}
        variant="ghost"
        size="md"
        uppercase={false}
      />

      <AppText variant="bodySmall" center color={colors.text.tertiary}>
        {plan?.trialDays && annual
          ? t("profileUi.paywall.trialRenewNote", { price: annual.price })
          : t("paywall.renewNote")}
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
  loading: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  plans: { gap: spacing.md },
  plan: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
  planTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: palette.star.face, borderColor: palette.star.face },
  grow: { flex: 1, minWidth: 0 },
  price: { marginLeft: 24 + spacing.sm },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginLeft: 24 + spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderBottomWidth: 2,
  },
  badgeStar: { backgroundColor: palette.star.face, borderBottomColor: palette.star.slab },
  badgeMint: { backgroundColor: palette.mint.face, borderBottomColor: palette.mint.slab },
  cta: { gap: spacing.sm },
  legal: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm },
  legalLink: { minHeight: 44, justifyContent: "center" },
});
