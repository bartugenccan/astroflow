import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { EnterView } from "../../lib/motion";
import { useTranslation, type TranslationKey } from "../../i18n";
import { useAppStore } from "../../store/useAppStore";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { useReminderToggle } from "../reminders/useReminderToggle";
import { syncProfileMeta } from "../../services/auth/account";
import { colors, layout, palette, radii, spacing, type Tone } from "../../lib/design-system";
import { LessonFlow } from "../skypath/LessonFlow";
import { clearTourCheckpoint, readTourCheckpoint, writeTourCheckpoint } from "./tourCheckpoint";

/** Checkpointed pages: the first lesson, then "you're ready". */
const LESSON = 0;
const READY = 1;

const EGG_STAGE = 0;

const PROMISES: { icon: keyof typeof Ionicons.glyphMap; tone: Tone; key: "p1" | "p2" | "p3" }[] = [
  { icon: "map", tone: "sky", key: "p1" },
  { icon: "sparkles", tone: "candy", key: "p2" },
  { icon: "star", tone: "star", key: "p3" },
];

/**
 * After the chart reveal: the first Harita Yolu chapter (your Big Three) as a
 * real lesson — the newcomer reads their own chart and earns their first Işık
 * before being asked for anything else — then one "you're ready" page with
 * three promises, a soft reminder ask and two ways in (Sky, or the first
 * manifest, which hatches Aster). Either completes onboarding. The page is
 * checkpointed, so a reload resumes the lesson or the ready page.
 */
export function TourScreen() {
  const router = useRouter();
  const profile = useOnboardingDraft((s) => s.profile);
  const name = useOnboardingDraft((s) => s.name);
  const setName = useOnboardingDraft((s) => s.setName);
  const setProfile = useOnboardingDraft((s) => s.setProfile);
  const setBirthProfile = useAppStore((s) => s.setBirthProfile);
  const [page, setPage] = useState<number | null>(null);

  // The draft is in memory only: after a reload, pick the cast chart and the
  // page back up from the checkpoint (or start onboarding over without one).
  useEffect(() => {
    let active = true;
    readTourCheckpoint().then((checkpoint) => {
      if (!active) return;
      let cast = profile;
      if (!cast) {
        if (!checkpoint) {
          router.replace("/(onboarding)" as Href);
          return;
        }
        setName(checkpoint.name);
        setProfile(checkpoint.profile);
        cast = checkpoint.profile;
      }
      // The lesson reads the chart through the app store, as the tabs will.
      setBirthProfile(cast);
      setPage(checkpoint?.page === READY ? READY : LESSON);
    });
    return () => {
      active = false;
    };
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile || page === null) return;
    writeTourCheckpoint({ name: name.trim(), profile, page });
  }, [page, profile, name]);

  if (!profile || page === null) {
    return <ScreenWrapper variant="dense" edges={["top", "bottom"]}>{null}</ScreenWrapper>;
  }

  if (page === LESSON) {
    return <LessonFlow lessonKey="bigThree" onExit={() => setPage(READY)} onFinished={() => setPage(READY)} />;
  }
  return <ReadyPage />;
}

function ReadyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useOnboardingDraft((s) => s.profile);
  const name = useOnboardingDraft((s) => s.name);
  const clearDraft = useOnboardingDraft((s) => s.clear);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const dailyOn = useAppStore((s) => s.reminders.daily);
  const toggleReminder = useReminderToggle();
  const finishing = useRef(false);

  const finish = (then?: Href) => {
    if (!profile || finishing.current) return;
    finishing.current = true;
    // Flipping `hasOnboarded` swaps the protected stacks; the tabs open on Sky.
    completeOnboarding(name.trim() || "Traveler", profile);
    clearDraft();
    clearTourCheckpoint();
    // Name + birth place label go next to the server chart, so a later sign-in restores them.
    syncProfileMeta();
    if (then) setTimeout(() => router.push(then), 400);
  };

  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <View style={styles.root}>
        <View style={styles.body}>
          <EnterView>
            <AsterCameo text={t("skypath.ready.aster")} stage={EGG_STAGE} size={84} action="cheer" />
          </EnterView>
          <EnterView index={1}>
            <AppText variant="display" accessibilityRole="header">
              {t("skypath.ready.title")}
            </AppText>
          </EnterView>
          <View style={styles.promises}>
            {PROMISES.map((p, i) => (
              <EnterView key={p.key} index={i + 2} style={styles.promise}>
                <View style={[styles.promiseIcon, { backgroundColor: palette[p.tone].face }]}>
                  <Ionicons name={p.icon} size={20} color={palette[p.tone].on} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading">{t(`skypath.ready.${p.key}Title` as TranslationKey)}</AppText>
                  <AppText variant="bodySmall">{t(`skypath.ready.${p.key}Body` as TranslationKey)}</AppText>
                </View>
              </EnterView>
            ))}
          </View>
          <EnterView index={5}>
            <ChunkyCard tone="sky" tinted style={styles.remind}>
              <Ionicons name="notifications" size={20} color={palette.sky.face} />
              <AppText variant="bodySmall" color={colors.text.primary} style={styles.flex}>
                {dailyOn ? t("skypath.ready.remindOn") : t("skypath.ready.remindAsk")}
              </AppText>
              {!dailyOn ? (
                <PressableScale
                  onPress={() => void toggleReminder("daily", true)}
                  style={styles.remindBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t("skypath.ready.remindCta")}
                >
                  <AppText variant="label" color={palette.sky.on}>
                    {t("skypath.ready.remindCta")}
                  </AppText>
                </PressableScale>
              ) : (
                <Ionicons name="checkmark-circle" size={22} color={palette.mint.face} />
              )}
            </ChunkyCard>
          </EnterView>
        </View>
        <View style={styles.footer}>
          <ChunkyButton label={t("skypath.ready.toSky")} onPress={() => finish()} size="lg" variant="sky" />
          <ChunkyButton
            label={t("skypath.ready.toManifest")}
            onPress={() => finish("/intentions/create" as Href)}
            variant="ghost"
            uppercase={false}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: layout.gutter, paddingTop: spacing.lg },
  body: { flex: 1, gap: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  promises: { gap: spacing.md },
  promise: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  promiseIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  remind: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  remindBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.sky.face,
  },
  footer: { gap: spacing.sm, paddingBottom: spacing.md },
});
