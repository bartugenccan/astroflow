import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { GoldButton } from "../../components/ui/GoldButton";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { CheckInSheet } from "./CheckInSheet";
import { astrologyApi } from "../../services/astrologyApi";
import { CheckInResult, Intention } from "../../services/types";
import { useAsync } from "../../hooks/useAsync";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

export function IntentionDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loaded = useAsync(() => astrologyApi.getIntention(String(id)), [id]);
  const [local, setLocal] = useState<Intention | null>(null);
  const [checking, setChecking] = useState(false);

  const intention = local ?? loaded.data;
  const done = intention ? intention.progress.count >= intention.progress.target : false;

  const applyResult = (r: CheckInResult) => {
    if (!intention) return;
    setLocal({ ...intention, progress: r.progress, streak: r.streak });
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
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text.secondary} />
        </Pressable>
        <AppText variant="heading" numberOfLines={1} style={styles.topTitle}>
          {intention?.goalText ?? t("intentions.title")}
        </AppText>
        <Pressable hitSlop={10} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
        </Pressable>
      </View>

      {!intention ? (
        <View style={styles.center}>
          <CelestialLoader label={t("common.loading")} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Streak + progress */}
          <View style={styles.statsRow}>
            <HairlineCard style={styles.statCard}>
              <AppText variant="display" style={styles.statNum}>
                {intention.streak.currentStreak}
              </AppText>
              <AppText variant="label" color={colors.text.tertiary}>
                {t("intentions.streakLabel")}
              </AppText>
            </HairlineCard>
            <HairlineCard style={styles.statCard}>
              <AppText variant="display" style={styles.statNum}>
                {intention.progress.count}/{intention.progress.target}
              </AppText>
              <AppText variant="label" color={colors.text.tertiary}>
                {t("intentions.todayPractice")}
              </AppText>
            </HairlineCard>
          </View>

          {/* Affirmation */}
          <View style={styles.section}>
            <SectionHeader eyebrow={t("intentions.affirmationLabel")} />
            <HairlineCard elevated>
              <AppText variant="serifBody" center>
                “{intention.affirmation}”
              </AppText>
            </HairlineCard>
          </View>

          {done ? (
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.semantic.harmonic} />
              <AppText variant="heading" color={colors.text.primary}>
                {t("intentions.doneToday")}
              </AppText>
            </View>
          ) : (
            <GoldButton
              label={t("intentions.checkInCta")}
              onPress={() => setChecking(true)}
              icon={<Ionicons name="add" size={18} color={colors.text.onGold} />}
            />
          )}
        </ScrollView>
      )}

      {intention ? (
        <CheckInSheet
          visible={checking}
          onClose={() => setChecking(false)}
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
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
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
    alignItems: "center",
    gap: spacing.xs,
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
