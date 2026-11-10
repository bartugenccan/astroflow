import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, Alert, Linking } from "react-native";
import Constants from "expo-constants";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { Chip } from "../../components/ui/Chip";
import { StatPill, StatRow } from "../../components/ui/StatPill";
import { StateView } from "../../components/ui/StateView";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { LangSwitch } from "../../components/ui/LangSwitch";
import { PressableScale } from "../../components/ui/PressableScale";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { BirthDetailsSheet } from "./BirthDetailsSheet";
import { AccountSheet } from "../account/AccountSheet";
import { ACCOUNTS_ENABLED, refreshAccount } from "../../services/auth/account";
import { astrologyApi } from "../../services/astrologyApi";
import { useAppStore } from "../../store/useAppStore";
import { useMascotStore } from "../../store/useMascotStore";
import { useTranslation } from "../../i18n";
import { EnterView } from "../../lib/motion";
import { deleteMyData, wipeAllLocalData } from "../../services/dataWipe";
import { useReminderToggle } from "../reminders/useReminderToggle";
import { colors, palette, radii, spacing, type Tone } from "../../lib/design-system";
import { Disclosure } from "../../components/ui/Disclosure";
import { GoldToggle } from "../../components/ui/GoldToggle";
import { ReminderTimeSheet } from "./ReminderTimeSheet";
import { legalUrl, type LegalPage } from "../../services/config";
import { asterA11y, stageName } from "../aster/asterCopy";
import type { TranslationKey } from "../../i18n";
import type { AccountInfo, AuthProviderId } from "../../services/types";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const LEGAL_ROWS: {
  key: TranslationKey;
  icon: IconName;
  page: LegalPage | null;
}[] = [
  { key: "profile.aiNotice", icon: "sparkles-outline", page: null },
  { key: "profile.privacy", icon: "shield-checkmark-outline", page: "privacy" },
  { key: "profile.terms", icon: "document-text-outline", page: "terms" },
  { key: "profile.support", icon: "help-buoy-outline", page: "support" },
];

const PROVIDER_LABEL: Record<AuthProviderId, TranslationKey> = {
  apple: "account.providerApple",
  google: "account.providerGoogle",
  email: "account.providerEmail",
};

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
  const openAster = () => router.push("/aster" as Href);

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

  const toggleReminder = useReminderToggle();

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

        {/* Aster first: the companion is the heart of the profile. */}
        <EnterView index={1}>
          <AsterSummaryCard onPress={openAster} />
        </EnterView>

        {/* Protect Aster: optional sign-in so Aster and the notes survive a new phone. */}
        {ACCOUNTS_ENABLED ? (
          <EnterView index={2}>
            <ProtectAsterCard account={account} onPress={() => setAccountOpen(true)} />
          </EnterView>
        ) : null}

        {/* Compatibility lives in For You → Match and the Solar Return only in
            Future — Profile keeps Aster's rest, settings and the reference glossary. */}
        <EnterView index={4} style={styles.section}>
          <SectionHeader eyebrow={t("profileUi.profile.exploreTitle")} />
          {!isPremium ? (
            <NavCard
              icon="sparkles"
              tone="star"
              title={t("profileUi.profile.premiumTitle")}
              subtitle={t("profileUi.profile.premiumSub")}
              onPress={() => router.push("/premium" as Href)}
            />
          ) : null}
          <EclipseRow onPress={openAster} />
          <NavCard
            icon="book-outline"
            tone="sky"
            title={t("glossary.ui.openGlossary")}
            subtitle={t("glossary.ui.openGlossarySub")}
            onPress={() => router.push("/glossary" as Href)}
          />
          <NavCard
            icon="document-text-outline"
            tone="candy"
            title={t("reports.title")}
            subtitle={t("reports.navSub")}
            onPress={() => router.push("/reports" as Href)}
          />
        </EnterView>

        {/* Birth details */}
        <EnterView index={5} style={styles.section}>
          <SectionHeader eyebrow={t("profile.birthDataTitle")} />
          <ChunkyCard>
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
                      accessibilityLabel={`${t("profile.editBirth")}: ${row.label}, ${row.value}`}
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
          </ChunkyCard>
        </EnterView>

        {/* Settings */}
        <EnterView index={6} style={styles.section}>
          <SectionHeader eyebrow={t("profile.settingsTitle")} />
          <ChunkyCard>
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
                    <AppText variant="heading" color={colors.text.accent}>
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
            <View style={styles.sep} />
            <View style={styles.settingRow}>
              <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                {t("profile.reminder369")}
              </AppText>
              <GoldToggle
                value={!!reminders.practice369}
                onChange={(on) => toggleReminder("practice369", on)}
                accessibilityLabel={t("profile.reminder369")}
              />
            </View>
            {isPremium ? (
              <>
                <View style={styles.sep} />
                <View style={styles.settingRow}>
                  <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                    {t("paywall.premiumBadge")}
                  </AppText>
                  <Chip label={t("paywall.premiumBadge")} tone="star" icon="sparkles" selected />
                </View>
              </>
            ) : null}
            <View style={styles.sep} />
            <View style={styles.settingRow}>
              <AppText variant="body" color={colors.text.primary} style={styles.settingLabel}>
                {t("profile.version")}
              </AppText>
              <AppText variant="numeric" color={colors.text.tertiary}>
                {APP_VERSION}
              </AppText>
            </View>
          </ChunkyCard>
        </EnterView>

        {/* Help & legal — the store-required privacy/terms/support links. */}
        <EnterView index={7} style={styles.section}>
          <SectionHeader eyebrow={t("profile.legalTitle")} />
          <ChunkyCard>
            {LEGAL_ROWS.map((row, i) => (
              <View key={row.key}>
                <PressableScale
                  onPress={() =>
                    row.page ? openLegal(row.page) : Alert.alert(t("profile.aiNotice"), aiNoticeText)
                  }
                  scaleTo={0.98}
                  accessibilityRole={row.page ? "link" : "button"}
                  accessibilityLabel={t(row.key)}
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
          </ChunkyCard>
        </EnterView>

        {/* Start over, and delete my data (server and phone — required by both stores, so always shown). */}
        <EnterView index={8} style={styles.section}>
          <Disclosure
            title={t("profileUi.profile.dataTitle")}
            summary={t("profileUi.profile.dataSummary")}
            icon="trash-outline"
            tone="danger"
          >
          <ChunkyButton
            label={t("profile.startOver")}
            onPress={confirmReset}
            variant="ghost"
            size="md"
            uppercase={false}
            icon={<Ionicons name="refresh-outline" size={18} color={colors.text.primary} />}
          />
          <ChunkyButton
            label={deleting ? t("profile.deleting") : t("profile.deleteData")}
            onPress={confirmDelete}
            variant="danger"
            size="md"
            uppercase={false}
            loading={deleting}
            disabled={deleting}
            icon={<Ionicons name="trash-outline" size={18} color={palette.danger.on} />}
          />
          </Disclosure>
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

/** Aster at a glance: stage, orbit streak, constellations. Tapping opens the nest. */
function AsterSummaryCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const state = useMascotStore((s) => s.state);
  const loading = useMascotStore((s) => s.loading);
  const error = useMascotStore((s) => s.error);
  const refresh = useMascotStore((s) => s.refresh);

  useEffect(() => {
    if (!state) refresh().catch(() => undefined);
    // Only on mount: the store refreshes itself after every award.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) {
    return (
      <ChunkyCard tone="primary" tinted>
        {error && !loading ? (
          <StateView
            kind="error"
            compact
            message={t("profileUi.profile.asterError")}
            onAction={() => refresh().catch(() => undefined)}
          />
        ) : (
          <StateView kind="loading" compact message={t("profileUi.profile.asterLoading")} />
        )}
      </ChunkyCard>
    );
  }

  const stage = stageName(t, state.stage);
  const orbit = state.orbit.streak;
  const { found, total } = state.constellations;
  const label = [
    asterA11y(t, state),
    t("profileUi.profile.asterOrbitA11y", { n: orbit }),
    t("profileUi.profile.asterConstellationsA11y", { found, total }),
  ].join(", ");

  return (
    <ChunkyCard
      tone="primary"
      tinted
      depth="lg"
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint={t("profileUi.profile.asterOpen")}
    >
      <View style={styles.asterRow}>
        <View style={styles.asterArt}>
          <AsterMascot
            stage={state.stage}
            mood={state.mood}
            accessories={state.equipped}
            size={76}
            action={state.eclipse.active ? "sleep" : "idle"}
          />
        </View>
        <View style={styles.asterText}>
          <AppText variant="label" color={colors.text.violet}>
            {t("profileUi.profile.asterEyebrow")}
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {stage}
          </AppText>
          <StatRow style={styles.asterStats}>
            <StatPill
              icon="planet"
              tone="sky"
              value={orbit}
              muted={orbit === 0}
              accessibilityLabel={t("profileUi.profile.asterOrbitA11y", { n: orbit })}
            />
            <StatPill
              icon="star"
              tone="star"
              value={t("profileUi.profile.asterConstellations", { found, total })}
              accessibilityLabel={t("profileUi.profile.asterConstellationsA11y", { found, total })}
            />
            <StatPill
              icon="sparkles"
              tone="candy"
              value={state.stardust}
              accessibilityLabel={t("profileUi.profile.asterStardustA11y", { n: state.stardust })}
            />
          </StatRow>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.violet} />
      </View>
    </ChunkyCard>
  );
}

/** "Protect Aster" while anonymous; "Protected via …" once an account is linked. */
function ProtectAsterCard({ account, onPress }: { account: AccountInfo | null; onPress: () => void }) {
  const { t } = useTranslation();

  if (account) {
    const providers = account.providers.map((p) => t(PROVIDER_LABEL[p])).join(", ");
    const title = t("profileUi.profile.protectedTitle", { provider: providers });
    return (
      <ChunkyCard
        tone="mint"
        tinted
        onPress={onPress}
        accessibilityLabel={`${title}. ${t("profileUi.profile.vaultNote")}`}
        accessibilityHint={t("profileUi.profile.protectedManage")}
      >
        <View style={styles.protectRow}>
          <View style={[styles.badge, { backgroundColor: palette.mint.face }]}>
            <Ionicons name="checkmark" size={22} color={palette.mint.on} />
          </View>
          <View style={styles.grow}>
            <AppText variant="heading" numberOfLines={2}>
              {title}
            </AppText>
            {account.email ? (
              <AppText variant="bodySmall" numberOfLines={1}>
                {account.email}
              </AppText>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </View>
        <View style={styles.vaultNote}>
          <Ionicons name="lock-closed" size={14} color={palette.mint.face} />
          <AppText variant="bodySmall" color={colors.text.secondary} style={styles.grow}>
            {t("profileUi.profile.vaultNote")}
          </AppText>
        </View>
      </ChunkyCard>
    );
  }

  return (
    <ChunkyCard tone="star" tinted>
      <View style={styles.protectRow}>
        <View style={[styles.badge, { backgroundColor: palette.star.face }]}>
          <Ionicons name="shield-half" size={22} color={palette.star.on} />
        </View>
        <View style={styles.grow}>
          <AppText variant="label" color={colors.text.accent}>
            {t("profileUi.profile.protectEyebrow")}
          </AppText>
          <AppText variant="heading" numberOfLines={2}>
            {t("profileUi.profile.protectTitle")}
          </AppText>
        </View>
        <Chip label={t("profileUi.profile.protectReward")} tone="star" icon="sparkles" />
      </View>
      <AppText variant="body" style={styles.protectBody}>
        {t("profileUi.profile.protectBody")}
      </AppText>
      <ChunkyButton
        label={t("profileUi.profile.protectCta")}
        onPress={onPress}
        variant="star"
        size="md"
        icon={<Ionicons name="shield-checkmark" size={18} color={palette.star.on} />}
      />
    </ChunkyCard>
  );
}

/** Shortcut to an eclipse (rest days) — the switch itself lives in Aster's nest. */
function EclipseRow({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const active = useMascotStore((s) => s.state?.eclipse.active ?? false);
  return (
    <NavCard
      icon={active ? "moon" : "moon-outline"}
      tone="night"
      title={t("profileUi.profile.eclipseTitle")}
      subtitle={active ? t("profileUi.profile.eclipseActive") : t("profileUi.profile.eclipseSub")}
      onPress={onPress}
    />
  );
}

/** A chunky row leading to another screen. */
function NavCard({
  icon,
  tone,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  tone: Tone;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const p = palette[tone];
  return (
    <ChunkyCard onPress={onPress} accessibilityLabel={`${title}. ${subtitle}`} style={styles.navRow}>
      <View style={[styles.badge, { backgroundColor: tone === "night" ? p.soft : p.face }]}>
        <Ionicons name={icon} size={20} color={tone === "night" ? colors.moon : p.on} />
      </View>
      <View style={styles.grow}>
        <AppText variant="heading" numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="bodySmall" numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
    </ChunkyCard>
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
  grow: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  asterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  asterArt: {
    width: 84,
    alignItems: "center",
  },
  asterText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  asterStats: {
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
  protectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  protectBody: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  vaultNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.hairline,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
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
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  settingLabel: {
    flex: 1,
    minWidth: 0,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
});
