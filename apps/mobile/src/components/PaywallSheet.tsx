import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { FullScreenOverlay } from "./ui/FullScreenOverlay";
import { ChunkyButton } from "./ui/ChunkyButton";
import { ChunkyCard } from "./ui/ChunkyCard";
import { AppText } from "./ui/AppText";
import { AsterCameo } from "./ui/AsterCameo";
import { TwinkleSky } from "./ui/TwinkleSky";
import { EnterView } from "../lib/motion";
import { TranslationKey, useTranslation } from "../i18n";
import { useAppStore } from "../store/useAppStore";
import { astrologyApi } from "../services/astrologyApi";
import { PREMIUM_BETA } from "../services/config";
import { PURCHASES_ENABLED } from "../services/purchases";
import { track } from "../services/analytics";
import { PremiumPlans } from "./PremiumPlans";
import { colors, palette, radii, spacing, type Tone } from "../lib/design-system";

export type PaywallVariant = "compat" | "forecast" | "premium";

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  variant: PaywallVariant;
  onUnlocked?: () => void;
}

/**
 * The paywall, full screen: it rises over everything like a lesson and closes
 * with ✕, "Maybe later" or the Android back button. Every gate calls it the
 * same way (and still gets `onUnlocked`). `/premium` shows the same content as
 * a page (Profile → Premium).
 */
export function PaywallSheet({ visible, onClose, variant, onUnlocked }: PaywallSheetProps) {
  return (
    <FullScreenOverlay visible={visible} onClose={onClose}>
      <PaywallContent variant={variant} onClose={onClose} onUnlocked={onUnlocked} />
    </FullScreenOverlay>
  );
}

interface Perk {
  key: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
}

const PERKS: Record<"unlimited" | "forecast" | "bestDays" | "compat" | "manifests", Perk> = {
  unlimited: { key: "paywall.perkUnlimited", icon: "chatbubbles", tone: "primary" },
  forecast: { key: "paywall.perkForecast", icon: "calendar", tone: "sky" },
  bestDays: { key: "paywall.perkBestDays", icon: "star", tone: "star" },
  compat: { key: "paywall.perkCompat", icon: "heart", tone: "candy" },
  manifests: { key: "paywall.perkManifests", icon: "sparkles", tone: "mint" },
};

/** What Premium opens and the way in; shared by the overlay and `/premium`. */
export function PaywallContent({
  variant,
  onClose,
  onUnlocked,
}: {
  variant: PaywallVariant;
  onClose: () => void;
  onUnlocked?: () => void;
}) {
  const { t } = useTranslation();
  const setPremium = useAppStore((s) => s.setPremium);
  const addUnlockedFeature = useAppStore((s) => s.addUnlockedFeature);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    track("paywall_viewed", { source: variant });
  }, [variant]);

  const title =
    variant === "compat"
      ? t("paywall.compatTitle")
      : variant === "forecast"
        ? t("paywall.forecastTitle")
        : t("paywall.title");
  const subtitle =
    variant === "compat"
      ? t("paywall.compatSubtitle")
      : variant === "forecast"
        ? t("paywall.forecastSubtitle")
        : t("paywall.subtitle");

  // Premium sells volume (more AI, more of everything); depth is earned with Light.
  // The perk that brought the user here goes first.
  const perks: Perk[] =
    variant === "compat"
      ? [PERKS.compat, PERKS.unlimited, PERKS.forecast, PERKS.manifests]
      : variant === "forecast"
        ? [PERKS.forecast, PERKS.bestDays, PERKS.unlimited, PERKS.compat]
        : [PERKS.unlimited, PERKS.forecast, PERKS.compat, PERKS.manifests];

  // Dev builds without a RevenueCat key can flip the stub. While Premium is
  // free for everyone (PREMIUM_BETA) release builds say so; otherwise they sell
  // the store's plans, or say "coming soon" when no store key is set.
  const canStubUnlock = __DEV__ && !PURCHASES_ENABLED;
  const sellsPlans = PURCHASES_ENABLED && !PREMIUM_BETA;

  const finish = () => {
    onUnlocked?.();
    onClose();
  };

  const continueBeta = () => {
    if (variant !== "compat") setPremium(true);
    finish();
  };

  const stubUnlock = async () => {
    if (!canStubUnlock) return;
    setBusy(true);
    setFailed(false);
    try {
      if (variant === "compat") {
        await astrologyApi.unlockFeature("COMPATIBILITY");
        addUnlockedFeature("COMPATIBILITY");
      } else {
        setPremium(true);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      finish();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (purchased) {
    return (
      <View style={styles.body}>
        <EnterView scale style={styles.center}>
          <AsterCameo text={t("profileUi.paywall.successBody")} size={96} action="cheer" layout="column" />
        </EnterView>
        <EnterView index={1}>
          <AppText variant="display" center accessibilityRole="header">
            {t("profileUi.paywall.successTitle")}
          </AppText>
        </EnterView>
        <EnterView index={2} style={styles.perks}>
          {perks.map((perk) => (
            <PerkRow key={perk.key} perk={perk} label={t(perk.key)} done />
          ))}
        </EnterView>
        <EnterView index={3}>
          <ChunkyButton label={t("profileUi.paywall.successCta")} onPress={finish} variant="star" size="lg" />
        </EnterView>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      {/* Hero: a window onto the night sky, Aster cheering, the promise. */}
      <EnterView>
        <ChunkyCard tone="raised" style={styles.hero}>
          <TwinkleSky color={palette.star.face} seed={`paywall-${variant}`} stars={9} />
          <View style={styles.premiumBadge}>
            <Ionicons name="sparkles" size={14} color={palette.star.on} />
            <AppText variant="label" color={palette.star.on}>
              {t("paywall.premiumBadge")}
            </AppText>
          </View>
          <AppText variant="display" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="body" color={colors.text.secondary}>
            {subtitle}
          </AppText>
          <AsterCameo text={t("profileUi.paywall.asterLine")} size={64} action="cheer" />
        </ChunkyCard>
      </EnterView>

      <EnterView index={1} style={styles.perks}>
        <AppText variant="label" color={colors.text.accent}>
          {t("profileUi.paywall.benefitsTitle")}
        </AppText>
        {perks.map((perk) => (
          <PerkRow key={perk.key} perk={perk} label={t(perk.key)} />
        ))}
      </EnterView>

      <EnterView index={2} style={styles.actions}>
        {canStubUnlock ? (
          <ChunkyButton
            label={variant === "compat" ? t("paywall.unlock") : t("paywall.unlockPremium")}
            onPress={stubUnlock}
            loading={busy}
            variant="star"
            size="lg"
            icon={<Ionicons name="lock-open" size={18} color={palette.star.on} />}
          />
        ) : PREMIUM_BETA ? (
          <>
            <View style={styles.beta}>
              <Ionicons name="gift" size={16} color={palette.mint.face} />
              <AppText variant="bodySmall" color={colors.text.primary} style={styles.grow}>
                {t("paywall.betaNote")}
              </AppText>
            </View>
            <ChunkyButton label={t("paywall.betaCta")} onPress={continueBeta} variant="star" size="lg" />
          </>
        ) : sellsPlans ? (
          <PremiumPlans onPurchased={() => setPurchased(true)} />
        ) : (
          <AppText variant="body" center color={colors.text.accent}>
            {t("paywall.comingSoon")}
          </AppText>
        )}
        {failed ? (
          <AppText variant="bodySmall" center color={colors.semantic.error} accessibilityLiveRegion="polite">
            {t("common.stateError")}
          </AppText>
        ) : null}
        <ChunkyButton
          label={t("paywall.maybeLater")}
          onPress={onClose}
          variant="ghost"
          size="md"
          uppercase={false}
          haptic="none"
        />
        <AppText variant="bodySmall" center color={colors.text.tertiary}>
          {t("paywall.pointsNote")}
        </AppText>
      </EnterView>
    </View>
  );
}

function PerkRow({ perk, label, done = false }: { perk: Perk; label: string; done?: boolean }) {
  const p = palette[perk.tone];
  return (
    <View style={styles.perkRow}>
      <View style={[styles.perkCoin, { backgroundColor: p.face, borderBottomColor: p.slab }]}>
        <Ionicons name={done ? "checkmark" : perk.icon} size={16} color={p.on} />
      </View>
      <AppText variant="body" color={colors.text.primary} style={styles.grow}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xl },
  center: { alignItems: "center" },
  hero: { gap: spacing.sm, overflow: "hidden" },
  premiumBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.star.face,
    borderBottomWidth: 2,
    borderBottomColor: palette.star.slab,
  },
  perks: { gap: spacing.md },
  perkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 32 },
  perkCoin: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
  },
  grow: { flex: 1, minWidth: 0 },
  beta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.mint.soft,
  },
  actions: { gap: spacing.md },
});
