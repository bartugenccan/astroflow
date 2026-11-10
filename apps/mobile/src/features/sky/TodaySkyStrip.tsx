import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { usePlanStore } from "../../store/usePlanStore";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, palette, radii, spacing } from "../../lib/design-system";
import { AREA_ICON, NATURE_TONE, areaName, moonLine, whyPhrase } from "../today/planCopy";

/**
 * Today, in one sentence, at the top of Sky: the day's focus and the transit
 * behind it, with where the Moon is in your chart. One tap opens the whole day
 * (`/sky-today`: the reading, the bi-wheel and every moving planet).
 */
export function TodaySkyStrip() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const dto = useBirthDto();
  const plan = usePlanStore((s) => s.plan);
  const loading = usePlanStore((s) => s.loading);
  const refresh = usePlanStore((s) => s.refresh);

  useEffect(() => {
    if (dto && !usePlanStore.getState().plan) refresh(dto);
  }, [dto, refresh]);

  const tone = plan?.focusWhy ? (NATURE_TONE[plan.focusWhy.nature] ?? "sky") : "sky";
  const focus = plan ? t("plan.focus", { area: areaName(t, plan.focusArea) }) : null;
  const why = plan?.focusWhy ? whyPhrase(t, plan.focusWhy) : null;
  const moon = plan ? moonLine(t, locale, plan.moon) : null;
  const moonSign = plan?.moon?.sign ? t(`signs.${plan.moon.sign}` as TranslationKey) : null;
  const headline = why ?? focus ?? t("skypath.sky.todayFallback");

  return (
    <ChunkyCard
      tone="sky"
      tinted
      depth="lg"
      onPress={() => router.push("/sky-today" as Href)}
      accessibilityLabel={`${t("skypath.sky.todayEyebrow")}. ${headline}`}
      accessibilityHint={t("skypath.sky.todayDetail")}
      style={styles.card}
    >
      <View style={styles.top}>
        <AppText variant="label" color={palette.sky.face} style={styles.flex} numberOfLines={1}>
          {t("skypath.sky.todayEyebrow")}
          {moonSign ? ` · ${t("skypath.sky.moonIn", { sign: moonSign })}` : ""}
        </AppText>
        <View style={styles.detail}>
          <AppText variant="labelLong" color={palette.sky.face}>
            {t("skypath.sky.todayDetail")}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={palette.sky.face} />
        </View>
      </View>
      {loading && !plan ? (
        <ShimmerLines lines={2} />
      ) : (
        <View style={styles.body}>
          {plan ? (
            <View style={[styles.icon, { backgroundColor: palette[tone].face }]}>
              <Ionicons name={AREA_ICON[plan.focusArea]} size={20} color={palette[tone].on} />
            </View>
          ) : null}
          <View style={styles.flex}>
            <AppText variant="heading">{headline}</AppText>
            {why && focus ? (
              <AppText variant="bodySmall" color={colors.text.secondary}>
                {moon ? `${focus} · ${moon}` : focus}
              </AppText>
            ) : null}
          </View>
        </View>
      )}
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  detail: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 24 },
  body: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
