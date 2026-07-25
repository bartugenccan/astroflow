import React from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { LangSwitch } from "../../components/ui/LangSwitch";
import { BigThree } from "../../components/BigThree";
import { BouncyButton } from "../../components/ui/BouncyButton";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

export function ProfileScreen() {
  const { t, locale } = useTranslation();
  const displayName = useAppStore((s) => s.displayName);
  const profile = useAppStore((s) => s.birthProfile);
  const setLocale = useAppStore((s) => s.setLocale);
  const reset = useAppStore((s) => s.reset);

  const confirmReset = () => {
    Alert.alert(t("profile.startOver"), t("profile.startOverConfirm"), [
      { text: t("profile.cancel"), style: "cancel" },
      { text: t("profile.reset"), style: "destructive", onPress: reset },
    ]);
  };

  const birthRows = profile
    ? [
        { icon: "calendar-outline" as const, label: t("profile.date"), value: formatDate(profile.birthDate, locale) },
        { icon: "time-outline" as const, label: t("profile.time"), value: profile.birthTime },
        {
          icon: "location-outline" as const,
          label: t("profile.place"),
          value: profile.placeName ?? `${profile.latitude.toFixed(2)}, ${profile.longitude.toFixed(2)}`,
        },
      ]
    : [];

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400 }}
          style={styles.header}
        >
          <SectionHeader eyebrow="PROFILE" title={displayName || t("profile.title")} />
        </MotiView>

        {profile ? (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 400, delay: 100 }}
          >
            <BigThree
              sunSign={profile.sunSign}
              moonSign={profile.moonSign}
              risingSign={profile.risingSign}
            />
          </MotiView>
        ) : null}

        {/* Birth details */}
        <View style={styles.section}>
          <SectionHeader eyebrow={t("profile.birthDataTitle")} />
          <HairlineCard>
            {birthRows.map((row, i) => (
              <View key={row.label}>
                <View style={styles.dataRow}>
                  <View style={styles.dataLeft}>
                    <Ionicons name={row.icon} size={18} color={colors.gold[300]} />
                    <AppText variant="body" color={colors.text.secondary}>
                      {row.label}
                    </AppText>
                  </View>
                  <AppText variant="body" color={colors.text.primary}>
                    {row.value}
                  </AppText>
                </View>
                {i < birthRows.length - 1 ? <View style={styles.sep} /> : null}
              </View>
            ))}
          </HairlineCard>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <SectionHeader eyebrow={t("profile.settingsTitle")} />
          <HairlineCard>
            <View style={styles.settingRow}>
              <AppText variant="body" color={colors.text.primary}>
                {t("profile.language")}
              </AppText>
              <LangSwitch value={locale} onChange={setLocale} />
            </View>
            <View style={styles.sep} />
            <View style={styles.settingRow}>
              <AppText variant="body" color={colors.text.primary}>
                {t("profile.notifications")}
              </AppText>
              <View style={styles.comingSoon}>
                <AppText variant="label" color={colors.text.tertiary}>
                  {t("profile.comingSoon")}
                </AppText>
              </View>
            </View>
            <View style={styles.sep} />
            <View style={styles.settingRow}>
              <AppText variant="body" color={colors.text.primary}>
                {t("profile.version")}
              </AppText>
              <AppText variant="body" color={colors.text.tertiary}>
                1.0.0
              </AppText>
            </View>
          </HairlineCard>
        </View>

        {/* Start over */}
        <BouncyButton onPress={confirmReset} scaleTo={0.97} style={styles.startOver}>
          <Ionicons name="refresh-outline" size={18} color={colors.text.tertiary} />
          <AppText variant="body" color={colors.text.tertiary}>
            {t("profile.startOver")}
          </AppText>
        </BouncyButton>
      </ScrollView>
    </ScreenWrapper>
  );
}

function formatDate(iso: string, locale: string): string {
  // Build from components (local midnight) — avoids Hermes parsing the string
  // as UTC, which shifts the date back a day in negative-offset timezones.
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  header: {
    marginBottom: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  dataLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  comingSoon: {
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
  startOver: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
});
