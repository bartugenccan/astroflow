import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { LangSwitch } from "../../components/ui/LangSwitch";
import { BigThree } from "../../components/BigThree";
import { PressableScale } from "../../components/ui/PressableScale";
import { BirthDetailsSheet } from "./BirthDetailsSheet";
import { astrologyApi } from "../../services/astrologyApi";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { EnterView } from "../../lib/motion";
import { colors, spacing } from "../../lib/design-system";

export function ProfileScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const displayName = useAppStore((s) => s.displayName);
  const profile = useAppStore((s) => s.birthProfile);
  const isPremium = useAppStore((s) => s.isPremium);
  const setLocale = useAppStore((s) => s.setLocale);
  const setBirthProfile = useAppStore((s) => s.setBirthProfile);
  const reset = useAppStore((s) => s.reset);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEditor = () => setEditing(true);
  const closeEditor = () => setEditing(false);

  const handleSave = async (birthDate: string, birthTime: string) => {
    if (!profile) return;
    setSaving(true);
    try {
      const p = await astrologyApi.saveBirthProfile({
        birthDate,
        birthTime,
        latitude: profile.latitude,
        longitude: profile.longitude,
      });
      // Re-cast the chart from the corrected date/time; keep display-only fields.
      setBirthProfile({ ...p, placeName: profile.placeName, unknownTime: profile.unknownTime });
    } finally {
      setSaving(false);
      closeEditor();
    }
  };

  const confirmReset = () => {
    Alert.alert(t("profile.startOver"), t("profile.startOverConfirm"), [
      { text: t("profile.cancel"), style: "cancel" },
      { text: t("profile.reset"), style: "destructive", onPress: reset },
    ]);
  };

  const birthRows = profile
    ? [
        { icon: "calendar-outline" as const, label: t("profile.date"), value: formatDate(profile.birthDate, locale), editable: true },
        { icon: "time-outline" as const, label: t("profile.time"), value: profile.birthTime, editable: true },
        {
          icon: "location-outline" as const,
          label: t("profile.place"),
          value: profile.placeName ?? `${profile.latitude.toFixed(2)}, ${profile.longitude.toFixed(2)}`,
          editable: false,
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
        <EnterView style={styles.header}>
          <SectionHeader eyebrow={t("profile.eyebrow")} title={displayName || t("profile.title")} />
        </EnterView>

        {profile ? (
          <EnterView index={1}>
            <BigThree
              sunSign={profile.sunSign}
              moonSign={profile.moonSign}
              risingSign={profile.risingSign}
            />
          </EnterView>
        ) : null}

        {/* Compatibility entry */}
        <EnterView index={2} style={styles.section}>
          <SectionHeader eyebrow={t("compatibility.title")} />
          <NavCard
            icon="heart-outline"
            title={t("compatibility.addPerson")}
            subtitle={t("compatibility.subtitle")}
            onPress={() => router.push("/compatibility" as Href)}
          />
        </EnterView>

        {/* Explore: birthday chart + glossary */}
        <EnterView index={3} style={styles.section}>
          <NavCard
            icon="gift-outline"
            title={t("yearAhead.title")}
            subtitle={t("yearAhead.techName")}
            onPress={() => router.push("/year-ahead" as Href)}
          />
          <NavCard
            icon="book-outline"
            title={t("glossary.ui.openGlossary")}
            subtitle={t("glossary.ui.openGlossarySub")}
            onPress={() => router.push("/glossary" as Href)}
          />
        </EnterView>

        {/* Birth details */}
        <EnterView index={4} style={styles.section}>
          <SectionHeader eyebrow={t("profile.birthDataTitle")} />
          <HairlineCard>
            {birthRows.map((row, i) => {
              const inner = (
                <View style={styles.dataRow}>
                  <View style={styles.dataLeft}>
                    <Ionicons name={row.icon} size={18} color={colors.gold[300]} />
                    <AppText variant="body" color={colors.text.secondary} numberOfLines={1}>
                      {row.label}
                    </AppText>
                  </View>
                  <View style={styles.dataRight}>
                    <AppText
                      variant="body"
                      color={colors.text.primary}
                      numberOfLines={2}
                      style={styles.dataValue}
                    >
                      {row.value}
                    </AppText>
                    {row.editable ? (
                      <Ionicons name="pencil" size={14} color={colors.text.tertiary} />
                    ) : null}
                  </View>
                </View>
              );
              return (
                <View key={row.label}>
                  {row.editable ? (
                    <PressableScale
                      onPress={openEditor}
                      scaleTo={0.98}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("profile.editBirth")}: ${row.label}`}
                    >
                      {inner}
                    </PressableScale>
                  ) : (
                    inner
                  )}
                  {i < birthRows.length - 1 ? <View style={styles.sep} /> : null}
                </View>
              );
            })}
          </HairlineCard>
        </EnterView>

        {/* Settings */}
        <EnterView index={5} style={styles.section}>
          <SectionHeader eyebrow={t("profile.settingsTitle")} />
          <HairlineCard>
            <View style={styles.settingRow}>
              <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                {t("profile.language")}
              </AppText>
              <LangSwitch value={locale} onChange={setLocale} />
            </View>
            <View style={styles.sep} />
            <View style={styles.settingRow}>
              <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                {t("profile.notifications")}
              </AppText>
              <View style={styles.comingSoon}>
                <AppText variant="label" color={colors.text.tertiary}>
                  {t("profile.comingSoon")}
                </AppText>
              </View>
            </View>
            {isPremium ? (
              <>
                <View style={styles.sep} />
                <View style={styles.settingRow}>
                  <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                    {t("paywall.premiumBadge")}
                  </AppText>
                  <View style={styles.premiumBadge}>
                    <Ionicons name="sparkles" size={12} color={colors.gold[200]} />
                    <AppText variant="label" color={colors.gold[200]}>
                      {t("paywall.premiumBadge")}
                    </AppText>
                  </View>
                </View>
              </>
            ) : null}
            <View style={styles.sep} />
            <View style={styles.settingRow}>
              <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                {t("profile.version")}
              </AppText>
              <AppText variant="body" color={colors.text.tertiary}>
                1.0.0
              </AppText>
            </View>
          </HairlineCard>
        </EnterView>

        {/* Start over */}
        <EnterView index={6}>
          <PressableScale
            onPress={confirmReset}
            scaleTo={0.96}
            style={styles.startOver}
            accessibilityRole="button"
          >
            <Ionicons name="refresh-outline" size={18} color={colors.text.tertiary} />
            <AppText variant="body" color={colors.text.tertiary} style={styles.shrink}>
              {t("profile.startOver")}
            </AppText>
          </PressableScale>
        </EnterView>
      </ScrollView>

      {profile ? (
        <BirthDetailsSheet
          visible={editing}
          onClose={closeEditor}
          birthDate={profile.birthDate}
          birthTime={profile.birthTime}
          saving={saving}
          onSave={handleSave}
        />
      ) : null}
    </ScreenWrapper>
  );
}

/** A tappable hairline row leading to another screen. */
function NavCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityRole="button">
      <HairlineCard style={styles.navRow}>
        <View style={styles.navIcon}>
          <Ionicons name={icon} size={20} color={colors.gold[300]} />
        </View>
        <View style={styles.navText}>
          <AppText variant="heading" numberOfLines={2}>
            {title}
          </AppText>
          <AppText variant="bodySmall" numberOfLines={2}>
            {subtitle}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
      </HairlineCard>
    </PressableScale>
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
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dataRight: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  dataValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  settingLabel: {
    flex: 1,
    minWidth: 0,
  },
  shrink: {
    flexShrink: 1,
  },
  comingSoon: {
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gold[600],
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.glow.goldSoft,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
  navText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
