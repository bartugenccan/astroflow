import React, { useRef, useState } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { GoldButton } from "../../components/ui/GoldButton";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { PressableScale } from "../../components/ui/PressableScale";
import { BackButton } from "../../components/ui/BackButton";
import { CountUp } from "../../components/ui/CountUp";
import { CheckInSheet } from "./CheckInSheet";
import { StarBurst } from "./StarBurst";
import { EnterView } from "../../lib/motion";
import { astrologyApi } from "../../services/astrologyApi";
import { CheckInResult, Intention } from "../../services/types";
import { useAsync } from "../../hooks/useAsync";
import { useTranslation } from "../../i18n";
import { isUuid } from "../../lib/ids";
import { colors, spacing, radii } from "../../lib/design-system";

export function IntentionDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  // Route params can come from a deep link; only a well-formed id reaches the API.
  const id = isUuid(params.id) ? params.id : null;
  const loaded = useAsync(
    () => (id ? astrologyApi.getIntention(id) : Promise.reject(new Error("invalid id"))),
    [id],
  );
  const [local, setLocal] = useState<Intention | null>(null);
  const [checking, setChecking] = useState(false);
  // Bumped when the sheet closes after a check-in that completed the day, so
  // the celebration plays on this screen once the sheet is out of the way.
  const [burstKey, setBurstKey] = useState(0);
  const pendingBurst = useRef(false);

  const intention = local ?? loaded.data;
  const done = intention ? intention.progress.count >= intention.progress.target : false;

  const applyResult = (r: CheckInResult) => {
    if (!intention) return;
    setLocal({ ...intention, progress: r.progress, streak: r.streak });
    if (r.dayCompleted) pendingBurst.current = true;
  };

  const closeSheet = () => {
    setChecking(false);
    if (pendingBurst.current) {
      pendingBurst.current = false;
      // Let the sheet finish sliding away before the stars fly.
      setTimeout(() => setBurstKey((k) => k + 1), 260);
    }
  };

  const confirmDelete = () => {
    Alert.alert(t("intentions.deleteConfirm"), undefined, [
      { text: t("intentions.cancel"), style: "cancel" },
      {
        text: t("intentions.delete"),
        style: "destructive",
        onPress: async () => {
          if (id) await astrologyApi.deleteIntention(String(id));
          router.back();
        },
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
        <AppText variant="heading" numberOfLines={1} style={styles.topTitle}>
          {intention?.goalText ?? t("intentions.title")}
        </AppText>
        <PressableScale
          hitSlop={10}
          scaleTo={0.85}
          haptic="light"
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={t("intentions.delete")}
          onPress={confirmDelete}
        >
          <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
        </PressableScale>
      </View>

      {!intention ? (
        <View style={styles.center}>
          <CelestialLoader label={t("common.loading")} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Streak + progress */}
          <EnterView style={styles.statsRow}>
            <HairlineCard style={styles.statCard}>
              <View style={styles.statNumRow}>
                <Ionicons name="flame" size={20} color={colors.gold[300]} />
                <CountUp
                  value={intention.streak.currentStreak}
                  delay={200}
                  duration={800}
                  variant="display"
                  style={styles.statNum}
                />
              </View>
              <AppText
                variant="labelLong"
                color={colors.text.tertiary}
                center
                numberOfLines={2}
                style={styles.statLabel}
              >
                {t("intentions.streakLabel")}
              </AppText>
              <StarBurst playKey={burstKey} radius={70} />
            </HairlineCard>
            <HairlineCard style={styles.statCard}>
              <AppText
                variant="display"
                style={styles.statNum}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {intention.progress.count}/{intention.progress.target}
              </AppText>
              <AppText
                variant="labelLong"
                color={colors.text.tertiary}
                center
                numberOfLines={2}
                style={styles.statLabel}
              >
                {t("intentions.todayPractice")}
              </AppText>
            </HairlineCard>
          </EnterView>

          {/* Affirmation */}
          <EnterView index={1} style={styles.section}>
            <SectionHeader eyebrow={t("intentions.affirmationLabel")} />
            <HairlineCard elevated>
              <AppText variant="serifBody" center>
                “{intention.affirmation}”
              </AppText>
            </HairlineCard>
          </EnterView>

          {done ? (
            <EnterView key="done" index={2} scale style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.semantic.harmonic} />
              <AppText variant="heading" color={colors.text.primary} style={styles.shrink}>
                {t("intentions.doneToday")}
              </AppText>
              <StarBurst playKey={burstKey} radius={90} count={12} />
            </EnterView>
          ) : (
            <EnterView key="cta" index={2}>
              <GoldButton
                label={t("intentions.checkInCta")}
                onPress={() => setChecking(true)}
                icon={<Ionicons name="add" size={18} color={colors.text.onGold} />}
              />
            </EnterView>
          )}
        </ScrollView>
      )}

      {intention ? (
        <CheckInSheet
          visible={checking}
          onClose={closeSheet}
          intentionId={intention.id}
          affirmation={intention.affirmation}
          onResult={applyResult}
        />
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  shrink: { flexShrink: 1 },
  topTitle: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.lg,
    overflow: "visible",
  },
  statNumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statLabel: {
    alignSelf: "stretch",
  },
  statNum: {
    fontSize: 34,
    lineHeight: 40,
    color: colors.gold[200],
  },
  section: {
    gap: spacing.md,
  },
  doneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
});
