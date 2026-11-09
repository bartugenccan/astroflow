import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, Alert, Linking } from "react-native";
import Constants from "expo-constants";
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
import { AccountSheet } from "../account/AccountSheet";
import { ACCOUNTS_ENABLED, refreshAccount } from "../../services/auth/account";
import { astrologyApi } from "../../services/astrologyApi";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { EnterView } from "../../lib/motion";
import { deleteMyData, wipeAllLocalData } from "../../services/dataWipe";
import { colors, spacing } from "../../lib/design-system";
import { GoldToggle } from "../../components/ui/GoldToggle";
import { ReminderTimeSheet } from "./ReminderTimeSheet";
import { requestReminderPermission } from "../../services/notifications";
import { legalUrl, type LegalPage } from "../../services/config";
import type { TranslationKey } from "../../i18n";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

const LEGAL_ROWS: {
  key: TranslationKey;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  page: LegalPage | null;
}[] = [
  { key: "profile.aiNotice", icon: "sparkles-outline", page: null },
  { key: "profile.privacy", icon: "shield-checkmark-outline", page: "privacy" },
  { key: "profile.terms", icon: "document-text-outline", page: "terms" },
  { key: "profile.support", icon: "help-buoy-outline", page: "support" },
];

export function ProfileScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const displayName = useAppStore((s) => s.displayName);
  const profile = useAppStore((s) => s.birthProfile);
  const isPremium = useAppStore((s) => s.isPremium);
  const setLocale = useAppStore((s) => s.setLocale);
  const setBirthProfile = useAppStore((s) => s.setBirthProfile);

  const account = useAppStore((s) => s.account);
  const [accountOpen, setAccountOpen] = useState(false);

  // The link may have changed on another phone (method added/removed, account deleted).
  useEffect(() => {
    refreshAccount().catch(() => undefined);
  }, []);

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
      closeEditor();
    } catch {
      // Keep the sheet open so the edit isn't lost; the user can retry.
      Alert.alert(t("profile.saveFailedTitle"), t("profile.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // Start over: clear this phone, keep the device identity (server data stays).
  const confirmReset = () => {
    Alert.alert(t("profile.startOver"), t("profile.startOverConfirm"), [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("profile.reset"),
        style: "destructive",
        onPress: () => {
          wipeAllLocalData({ keepIdentity: true }).catch(() => {});
        },
      },
    ]);
  };

  // Delete my data: server first, then this phone; nothing local goes if the server call fails.
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = () => {
    Alert.alert(t("profile.deleteData"), t("profile.deleteDataConfirm"), [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("profile.deleteDataAction"),
        style: "destructive",
        onPress: () => {
          setDeleting(true);
          deleteMyData()
            .catch(() => Alert.alert(t("profile.deleteData"), t("profile.deleteDataFailed")))
            .finally(() => setDeleting(false));
        },
      },
    ]);
  };

  // Reminders: permission is asked only when one is switched on. Scheduling
  // itself follows the stored settings (ReminderBridge in the root layout).
  const reminders = useAppStore((s) => s.reminders);
  const setReminders = useAppStore((s) => s.setReminders);
  const [timeOpen, setTimeOpen] = useState(false);
  const reminderTime = `${String(reminders.hour).padStart(2, "0")}:${String(reminders.minute).padStart(2, "0")}`;

  const toggleReminder = async (kind: "daily" | "intention", on: boolean) => {
    if (!on) {
      setReminders({ [kind]: false });
      return;
    }
    const permission = await requestReminderPermission().catch(() => "denied" as const);
    if (permission === "granted") {
      setReminders({ [kind]: true });
    } else if (permission === "blocked") {
      Alert.alert(t("profile.remindersBlockedTitle"), t("profile.remindersBlockedBody"), [
        { text: t("profile.cancel"), style: "cancel" },
        { text: t("profile.openSettings"), onPress: () => Linking.openSettings().catch(() => undefined) },
      ]);
    }
  };

  const openLegal = (page: LegalPage) => {
    Linking.openURL(legalUrl(page, locale)).catch(() => undefined);
  };
  const aiNoticeText = `${t("aiConsent.entertainmentBody")}\n\n${t("aiConsent.dataBody")}`;

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
        {/* Compatibility lives in For You → Match and the Solar Return only in
            Future — Profile keeps settings and the reference glossary. */}
        <EnterView index={3} style={styles.section}>
          <NavCard
            icon="book-outline"
            title={t("glossary.ui.openGlossary")}
            subtitle={t("glossary.ui.openGlossarySub")}
            onPress={() => router.push("/glossary" as Href)}
          />
          <NavCard
            icon="document-text-outline"
            title={t("reports.title")}
            subtitle={t("reports.navSub")}
            onPress={() => router.push("/reports" as Href)}
          />
        </EnterView>

        {/* Account: optional sign-in so data survives a new phone. */}
        {ACCOUNTS_ENABLED ? (
          <EnterView index={3} style={styles.section}>
            <SectionHeader eyebrow={t("account.sectionTitle")} />
            <NavCard
              icon={account ? "shield-checkmark-outline" : "cloud-upload-outline"}
              title={account ? t("account.linkedTitle") : t("account.secureTitle")}
              subtitle={
                account
                  ? (account.email ??
                    account.providers.map((p) => (p === "apple" ? "Apple" : p === "google" ? "Google" : t("account.providerEmail"))).join(", "))
                  : t("account.secureSub")
              }
              onPress={() => setAccountOpen(true)}
            />
          </EnterView>
        ) : null}

        {/* Birth details */}
        <EnterView index={4} style={styles.section}>
          <SectionHeader eyebrow={t("profile.birthDataTitle")} />
          <HairlineCard>
            {birthRows.map((row, i) => {
              const inner = (
                <View style={styles.dataRow}>
                  <View style={styles.dataLeft}>
                    <Ionicons name={row.icon} size={18} color={colors.star[300]} />
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
                {t("profile.reminderDaily")}
              </AppText>
              <GoldToggle
                value={reminders.daily}
                onChange={(on) => toggleReminder("daily", on)}
                accessibilityLabel={t("profile.reminderDaily")}
              />
            </View>
            {reminders.daily ? (
              <>
                <View style={styles.sep} />
                <PressableScale
                  onPress={() => setTimeOpen(true)}
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("profile.reminderTime")}: ${reminderTime}`}
                >
                  <View style={styles.settingRow}>
                    <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                      {t("profile.reminderTime")}
                    </AppText>
                    <AppText variant="body" color={colors.star[300]}>
                      {reminderTime}
                    </AppText>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                  </View>
                </PressableScale>
              </>
            ) : null}
            <View style={styles.sep} />
            <View style={styles.settingRow}>
              <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                {t("profile.reminderIntention")}
              </AppText>
              <GoldToggle
                value={reminders.intention}
                onChange={(on) => toggleReminder("intention", on)}
                accessibilityLabel={t("profile.reminderIntention")}
              />
            </View>
            {isPremium ? (
              <>
                <View style={styles.sep} />
                <View style={styles.settingRow}>
                  <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                    {t("paywall.premiumBadge")}
                  </AppText>
                  <View style={styles.premiumBadge}>
                    <Ionicons name="sparkles" size={12} color={colors.star[200]} />
                    <AppText variant="label" color={colors.star[200]}>
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
                {APP_VERSION}
              </AppText>
            </View>
          </HairlineCard>
        </EnterView>

        {/* Help & legal — the store-required privacy/terms/support links. */}
        <EnterView index={6} style={styles.section}>
          <SectionHeader eyebrow={t("profile.legalTitle")} />
          <HairlineCard>
            {LEGAL_ROWS.map((row, i) => (
              <View key={row.key}>
                <PressableScale
                  onPress={() =>
                    row.page ? openLegal(row.page) : Alert.alert(t("profile.aiNotice"), aiNoticeText)
                  }
                  scaleTo={0.98}
                  accessibilityRole={row.page ? "link" : "button"}
                >
                  <View style={styles.settingRow}>
                    <Ionicons name={row.icon} size={18} color={colors.star[300]} />
                    <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                      {t(row.key)}
                    </AppText>
                    <Ionicons
                      name={row.page ? "open-outline" : "chevron-forward"}
                      size={16}
                      color={colors.text.tertiary}
                    />
                  </View>
                </PressableScale>
                {i < LEGAL_ROWS.length - 1 ? <View style={styles.sep} /> : null}
              </View>
            ))}
          </HairlineCard>
        </EnterView>

        {/* Start over */}
        <EnterView index={7}>
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

        {/* Delete my data — server and phone. Required by both stores, so always shown. */}
        <EnterView index={8}>
          <PressableScale
            onPress={confirmDelete}
            disabled={deleting}
            scaleTo={0.96}
            style={styles.startOver}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color={colors.semantic.error} />
            <AppText variant="body" color={colors.semantic.error} style={styles.shrink}>
              {deleting ? t("profile.deleting") : t("profile.deleteData")}
            </AppText>
          </PressableScale>
        </EnterView>
      </ScrollView>

      <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} intent="secure" />

      {timeOpen ? (
        <ReminderTimeSheet
          visible={timeOpen}
          onClose={() => setTimeOpen(false)}
          hour={reminders.hour}
          minute={reminders.minute}
          onSave={(hour, minute) => {
            setReminders({ hour, minute });
            setTimeOpen(false);
          }}
        />
      ) : null}

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
          <Ionicons name={icon} size={20} color={colors.star[300]} />
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
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.star[600],
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.glow.starSoft,
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
