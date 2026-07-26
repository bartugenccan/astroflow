import React, { useEffect, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { GoldButton } from "../../components/ui/GoldButton";
import { PaywallSheet } from "../../components/PaywallSheet";
import { ChartScreen } from "../chart/ChartScreen";
import { TransitsScreen } from "../transits/TransitsScreen";
import { savedPersonToDto, usePerson, usePersonChartAccess } from "./savedPerson";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

function formatDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Renders a saved person's natal chart or transits (Premium after
 * FREE_PERSON_CHARTS distinct people). Reuses the fully data-driven ChartScreen
 * / TransitsScreen by passing the person's DTO.
 */
export function PersonScreenFrame({ mode }: { mode: "chart" | "transits" }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person, loading } = usePerson(id);
  const { allowed, markViewed } = usePersonChartAccess(id);
  const [paywall, setPaywall] = useState(false);

  // Count this person against the free allowance once, when first shown.
  useEffect(() => {
    if (allowed && id) markViewed(id);
  }, [allowed, id, markViewed]);

  const back = (
    <Pressable
      hitSlop={12}
      onPress={() => router.back()}
      style={[styles.back, { top: insets.top + spacing.sm }]}
    >
      <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
    </Pressable>
  );

  if (loading || !person) {
    return (
      <ScreenWrapper>
        {back}
        <View style={styles.center}>
          <CelestialLoader label={t("common.loading")} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!allowed) {
    return (
      <ScreenWrapper>
        {back}
        <View style={styles.center}>
          <HairlineCard style={styles.lockCard}>
            <Ionicons name="lock-closed" size={24} color={colors.gold[300]} />
            <AppText variant="title" center>
              {person.label}
            </AppText>
            <AppText variant="body" center>
              {t("paywall.forecastSubtitle")}
            </AppText>
            <GoldButton label={t("paywall.unlockPremium")} onPress={() => setPaywall(true)} />
          </HairlineCard>
        </View>
        <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
      </ScreenWrapper>
    );
  }

  const dto = savedPersonToDto(person);
  const birthLine = `${formatDate(person.birthDate, locale)} · ${
    person.unknownTime ? t("compatibility.unknownTime") : person.birthTime
  }${person.placeName ? ` · ${person.placeName}` : ""}`;

  return (
    <View style={styles.flex}>
      {mode === "chart" ? (
        <ChartScreen dto={dto} title={person.label} birthLine={birthLine} />
      ) : (
        <TransitsScreen dto={dto} title={person.label} />
      )}
      {back}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: {
    position: "absolute",
    left: spacing.lg,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  lockCard: {
    alignItems: "center",
    gap: spacing.lg,
    width: "100%",
  },
});
