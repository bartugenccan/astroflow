import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { SpeechBubble } from "../../components/ui/SpeechBubble";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { PressableScale } from "../../components/ui/PressableScale";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { PaywallSheet } from "../../components/PaywallSheet";
import { EnterView } from "../../lib/motion";
import { IntentionsList } from "../intentions/IntentionsList";
import { CheckInSheet } from "../intentions/CheckInSheet";
import { AddAffirmationSheet, AffirmationsSection } from "../affirmations/AffirmationsSection";
import { localDay } from "../../store/useAffirmationStore";
import { useReflectionStore } from "../../store/useReflectionStore";
import { useMascotStore } from "../../store/useMascotStore";
import { lunarWindow } from "../../lib/mascotRules";
import type { AffirmationCategory, Intention } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, fonts, palette, radii, spacing, surface } from "../../lib/design-system";
import { useMascot } from "../aster/useMascot";
import { asterA11y, asterLine } from "../aster/asterCopy";

/**
 * Manifest — everything that feeds Aster in one place: Aster holding your
 * intention, the Moon ritual when a new/full moon is near, your intentions
 * with one-tap check-ins, closing the day in the evening, and affirmations.
 * Journaling text (rituals, reflections) stays on the device; only the fact
 * that it happened is reported to Aster.
 */
export function ManifestScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { state } = useMascot();
  const [paywall, setPaywall] = useState(false);
  const [checkIn, setCheckIn] = useState<Intention | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [addCategory, setAddCategory] = useState<AffirmationCategory | null>(null);
  const [moonOpen, setMoonOpen] = useState(false);
  const [reflectOpen, setReflectOpen] = useState(false);

  const moon = useMemo(() => lunarWindow(new Date()), []);
  const moonKey = moon ? `${moon.phase}:${moon.peakDate}` : null;
  const ritualDone = useReflectionStore((s) => (moonKey ? moonKey in s.rituals : false));
  const dayClosed = useReflectionStore((s) => localDay() in s.days);
  const evening = new Date().getHours() >= 17;

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero: Aster + what this space is for */}
        <EnterView style={styles.hero}>
          <View style={styles.heroText}>
            <AppText variant="label" color={palette.candy.face}>
              {t("manifest.eyebrow")}
            </AppText>
            <AppText variant="title">{t("manifest.title")}</AppText>
            <AppText variant="bodySmall">{t("manifest.subtitle")}</AppText>
          </View>
          <PressableScale
            onPress={() => router.push("/aster" as Href)}
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={asterA11y(t, state)}
          >
            <AsterMascot
              stage={state?.stage ?? 0}
              mood={state?.mood ?? "sleepy"}
              accessories={state?.equipped ?? []}
              size={112}
            />
          </PressableScale>
        </EnterView>

        <EnterView index={1}>
          <SpeechBubble text={asterLine(locale, state?.mood ?? "sleepy", state?.hatched ?? false, 1)} tail="top" />
        </EnterView>

        {/* Moon ritual — only around a new or full moon */}
        {moon ? (
          <EnterView index={2}>
            <ChunkyCard tone="star" tinted style={styles.feature}>
              <View style={styles.featureHead}>
                <View style={[styles.featureIcon, { backgroundColor: palette.star.face }]}>
                  <Ionicons name={moon.phase === "new" ? "ellipse-outline" : "ellipse"} size={22} color={palette.star.on} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading">
                    {moon.phase === "new" ? t("manifest.moon.newTitle") : t("manifest.moon.fullTitle")}
                  </AppText>
                  <AppText variant="bodySmall" color={colors.text.secondary}>
                    {ritualDone
                      ? t("manifest.moon.done")
                      : moon.phase === "new"
                        ? t("manifest.moon.newBody")
                        : t("manifest.moon.fullBody")}
                  </AppText>
                </View>
              </View>
              {!ritualDone ? (
                <ChunkyButton label={t("manifest.moon.cta")} variant="star" size="md" onPress={() => setMoonOpen(true)} />
              ) : null}
            </ChunkyCard>
          </EnterView>
        ) : null}

        {/* Intentions */}
        <View style={styles.section}>
          <EnterView index={3}>
            <AppText variant="title">{t("manifest.intentionsTitle")}</AppText>
          </EnterView>
          <IntentionsList
            enterIndex={4}
            reloadKey={reloadKey}
            onPaywall={() => setPaywall(true)}
            onCheckIn={setCheckIn}
          />
        </View>

        {/* Close the day */}
        <EnterView index={6}>
          <ChunkyCard tone="primary" tinted={!evening || dayClosed} style={styles.feature}>
            <View style={styles.featureHead}>
              <View style={[styles.featureIcon, { backgroundColor: evening && !dayClosed ? palette.cloud.face : palette.primary.face }]}>
                <Ionicons
                  name={dayClosed ? "checkmark" : "moon"}
                  size={22}
                  color={evening && !dayClosed ? palette.primary.face : palette.primary.on}
                />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading" color={evening && !dayClosed ? palette.primary.on : undefined}>
                  {t("manifest.reflection.title")}
                </AppText>
                <AppText variant="bodySmall" color={evening && !dayClosed ? palette.primary.on : colors.text.secondary}>
                  {dayClosed ? t("manifest.reflection.done") : t("manifest.reflection.body")}
                </AppText>
              </View>
            </View>
            {!dayClosed ? (
              <ChunkyButton
                label={t("manifest.reflection.cta")}
                variant={evening ? "cloud" : "primary"}
                size="md"
                onPress={() => setReflectOpen(true)}
              />
            ) : null}
          </ChunkyCard>
        </EnterView>

        {/* Affirmations */}
        <View style={styles.section}>
          <AffirmationsSection enterIndex={7} onAdd={setAddCategory} />
        </View>
      </ScrollView>

      {checkIn ? (
        <CheckInSheet
          visible={checkIn !== null}
          onClose={() => {
            setCheckIn(null);
            setReloadKey((k) => k + 1);
          }}
          intentionId={checkIn.id}
          affirmation={checkIn.affirmation}
          onResult={() => undefined}
        />
      ) : null}
      <AddAffirmationSheet category={addCategory} onClose={() => setAddCategory(null)} />
      {moon && moonKey ? (
        <MoonRitualSheet
          visible={moonOpen}
          phase={moon.phase}
          ritualKey={moonKey}
          onClose={() => setMoonOpen(false)}
        />
      ) : null}
      <ReflectionSheet visible={reflectOpen} onClose={() => setReflectOpen(false)} />
      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </ScreenWrapper>
  );
}

function MoonRitualSheet({
  visible,
  phase,
  ritualKey,
  onClose,
}: {
  visible: boolean;
  phase: "new" | "full";
  ritualKey: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const saveRitual = useReflectionStore((s) => s.saveRitual);
  const report = useMascotStore((s) => s.report);
  const [text, setText] = useState("");

  const finish = () => {
    if (!text.trim()) return;
    saveRitual(ritualKey, text);
    report("MOON_RITUAL");
    setText("");
    onClose();
  };

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("manifest.moon.sheetTitle")}>
      <View style={styles.sheet}>
        <AppText variant="lead">
          {phase === "new" ? t("manifest.moon.newPrompt") : t("manifest.moon.fullPrompt")}
        </AppText>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("manifest.moon.placeholder")}
          placeholderTextColor={colors.text.tertiary}
          style={styles.input}
          multiline
          maxLength={500}
        />
        <AppText variant="bodySmall">{t("manifest.moon.privacy")}</AppText>
        <ChunkyButton label={t("manifest.moon.finish")} variant="star" onPress={finish} disabled={!text.trim()} />
      </View>
    </SpringBottomSheet>
  );
}

function ReflectionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const closeDay = useReflectionStore((s) => s.closeDay);
  const report = useMascotStore((s) => s.report);
  const [items, setItems] = useState(["", "", ""]);
  const prompts = [t("manifest.reflection.p1"), t("manifest.reflection.p2"), t("manifest.reflection.p3")];
  const ready = items.some((x) => x.trim());

  const finish = () => {
    if (!ready) return;
    closeDay(items);
    report("EVENING_REFLECTION");
    setItems(["", "", ""]);
    onClose();
  };

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("manifest.reflection.title")}>
      <View style={styles.sheet}>
        {prompts.map((p, i) => (
          <View key={p} style={styles.reflectRow}>
            <View style={styles.reflectNum}>
              <AppText variant="heading" color={palette.primary.on}>
                {i + 1}
              </AppText>
            </View>
            <TextInput
              value={items[i]}
              onChangeText={(v) => setItems((prev) => prev.map((x, j) => (j === i ? v : x)))}
              placeholder={p}
              placeholderTextColor={colors.text.tertiary}
              style={[styles.input, styles.reflectInput]}
              maxLength={200}
            />
          </View>
        ))}
        <AppText variant="bodySmall">{t("manifest.reflection.privacy")}</AppText>
        <ChunkyButton label={t("manifest.reflection.cta")} variant="primary" onPress={finish} disabled={!ready} />
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 140, gap: spacing.xl },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroText: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.lg },
  feature: { gap: spacing.md },
  featureHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  featureIcon: { width: 44, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, gap: 2 },
  sheet: { gap: spacing.lg },
  input: {
    minHeight: 96,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    backgroundColor: surface.raised,
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    textAlignVertical: "top",
  },
  reflectRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  reflectNum: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: palette.primary.face,
    alignItems: "center",
    justifyContent: "center",
  },
  reflectInput: { flex: 1, minHeight: 48, paddingVertical: spacing.md },
});
