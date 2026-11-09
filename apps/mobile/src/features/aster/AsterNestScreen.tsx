import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { BackButton } from "../../components/ui/BackButton";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { SpeechBubble } from "../../components/ui/SpeechBubble";
import { StatPill, StatRow } from "../../components/ui/StatPill";
import { PressableScale } from "../../components/ui/PressableScale";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { EnterView } from "../../lib/motion";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, palette, radii, spacing, surface, Tone } from "../../lib/design-system";
import { asterA11y, asterLine, stageName } from "./asterCopy";
import { useMascot } from "./useMascot";

const ABILITY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  skyWhisper: "chatbubble-ellipses",
  streakShield: "shield-checkmark",
  powerDays: "flash",
  weeklyLetter: "mail",
  novaTheme: "color-palette",
};

const ABILITY_TONE: Record<string, Tone> = {
  skyWhisper: "sky",
  streakShield: "primary",
  powerDays: "star",
  weeklyLetter: "candy",
  novaTheme: "mint",
};

/**
 * Aster's Nest — the mascot's home: big Aster, stage and Işık to the next
 * stage, today's energy, Yıldız Tozu and shields, unlocked abilities, and
 * doors to the shop, the breathing exercise and the companion chat.
 */
export function AsterNestScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { state } = useMascot();
  const [playKey, setPlayKey] = useState(0);

  const stage = state?.stage ?? 0;
  const hatched = state?.hatched ?? false;
  const mood = state?.mood ?? "sleepy";
  const xp = state?.xp ?? 0;
  const floor = state?.stageFloorXp ?? 0;
  const next = state?.nextStageXp ?? null;
  const progress = next === null ? 1 : (xp - floor) / Math.max(1, next - floor);

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
        <StatRow>
          <StatPill
            icon="sparkles"
            tone="star"
            value={state?.stardust ?? 0}
            accessibilityLabel={`${state?.stardust ?? 0} ${t("aster.stardust")}`}
          />
          <StatPill
            icon="shield-checkmark"
            tone="primary"
            value={state?.shields ?? 0}
            muted={(state?.shields ?? 0) === 0}
            accessibilityLabel={`${state?.shields ?? 0} ${t("aster.shields")}`}
          />
        </StatRow>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.hero}>
          <SpeechBubble text={asterLine(locale, mood, hatched)} tail="bottom" style={styles.bubble} />
          <PressableScale
            onPress={() => setPlayKey((k) => k + 1)}
            scaleTo={0.94}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={asterA11y(t, state)}
            accessibilityHint={t("aster.home.tapHint")}
          >
            <AsterMascot
              stage={stage}
              mood={mood}
              accessories={state?.equipped ?? []}
              action={playKey > 0 ? (hatched ? "cheer" : "hatch") : "idle"}
              playKey={playKey}
              size={220}
            />
          </PressableScale>
          <AppText variant="label" color={colors.text.accent} center>
            {t("aster.home.eyebrow")}
          </AppText>
          <AppText variant="display" center>
            {stageName(t, stage)}
          </AppText>
        </EnterView>

        <EnterView index={1}>
          <ChunkyCard style={styles.gap}>
            {hatched ? (
              <>
                <View style={styles.rowBetween}>
                  <AppText variant="heading">{t("aster.light")}</AppText>
                  <AppText variant="heading" color={palette.star.face}>
                    {next === null ? xp : `${xp} / ${next}`}
                  </AppText>
                </View>
                <ChunkyProgress value={progress} tone="star" accessibilityLabel={t("aster.light")} />
                <AppText variant="bodySmall">
                  {next === null
                    ? t("aster.home.maxed")
                    : t("aster.home.toNext", { n: next - xp, stage: stageName(t, stage + 1) })}
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="heading">{t("aster.home.eggHint")}</AppText>
                <ChunkyButton
                  label={t("aster.home.eggCta")}
                  variant="candy"
                  size="md"
                  onPress={() => router.push("/intentions/create" as Href)}
                />
              </>
            )}
            <View style={[styles.rowBetween, styles.energyHead]}>
              <AppText variant="heading">{t("aster.energy")}</AppText>
              <AppText variant="heading" color={palette.mint.face}>
                {state?.energy ?? 0}%
              </AppText>
            </View>
            <ChunkyProgress value={(state?.energy ?? 0) / 100} tone="mint" accessibilityLabel={t("aster.energy")} />
          </ChunkyCard>
        </EnterView>

        <EnterView index={2} style={styles.actions}>
          <ActionTile
            icon="leaf"
            tone="mint"
            title={t("aster.home.breathe")}
            sub={t("aster.home.breatheSub")}
            onPress={() => router.push("/aster/breathe" as Href)}
          />
          <ActionTile
            icon="shirt"
            tone="candy"
            title={t("aster.home.shop")}
            sub={t("aster.home.shopSub")}
            onPress={() => router.push("/aster/shop" as Href)}
          />
          <ActionTile
            icon="chatbubbles"
            tone="sky"
            title={t("aster.home.talk")}
            sub={t("aster.home.talkSub")}
            onPress={() => router.push("/companion" as Href)}
          />
        </EnterView>

        <EnterView index={3} style={styles.section}>
          <AppText variant="title">{t("aster.home.abilitiesTitle")}</AppText>
          {(state?.abilities ?? []).map((a) => {
            const tone = ABILITY_TONE[a.key] ?? "primary";
            const status = !a.unlocked
              ? t("aster.home.unlocksAt", { stage: stageName(t, a.minStage) })
              : a.available
                ? t("aster.home.active")
                : t("aster.home.comingSoon");
            return (
              <ChunkyCard key={a.key} style={[styles.ability, !a.unlocked && styles.locked]} depth="sm">
                <View style={[styles.abilityIcon, { backgroundColor: a.unlocked ? palette[tone].face : surface.raised }]}>
                  <Ionicons
                    name={a.unlocked ? ABILITY_ICON[a.key] : "lock-closed"}
                    size={22}
                    color={a.unlocked ? palette[tone].on : colors.text.tertiary}
                  />
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading">{t(`aster.abilities.${a.key}.title` as TranslationKey)}</AppText>
                  <AppText variant="bodySmall">{t(`aster.abilities.${a.key}.body` as TranslationKey)}</AppText>
                  <AppText
                    variant="labelLong"
                    color={a.unlocked && a.available ? palette.mint.face : colors.text.tertiary}
                  >
                    {status}
                  </AppText>
                </View>
              </ChunkyCard>
            );
          })}
        </EnterView>

        <EnterView index={4}>
          <ChunkyCard tone="primary" tinted style={styles.gap}>
            <AppText variant="heading">{t("aster.home.howTitle")}</AppText>
            <AppText variant="body">{t("aster.home.howBody")}</AppText>
            <AppText variant="body">{t("aster.home.shieldsBody")}</AppText>
          </ChunkyCard>
        </EnterView>
      </ScrollView>
    </ScreenWrapper>
  );
}

function ActionTile({
  icon,
  tone,
  title,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <ChunkyCard onPress={onPress} accessibilityLabel={title} style={styles.tile} depth="md">
      <View style={[styles.tileIcon, { backgroundColor: palette[tone].face }]}>
        <Ionicons name={icon} size={22} color={palette[tone].on} />
      </View>
      <View style={styles.flex}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="bodySmall">{sub}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 80, gap: spacing.xl },
  hero: { alignItems: "center", gap: spacing.xs },
  bubble: { maxWidth: 300, marginBottom: spacing.xs },
  gap: { gap: spacing.md },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  energyHead: { marginTop: spacing.sm },
  actions: { gap: spacing.md },
  tile: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: spacing.md },
  ability: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  locked: { opacity: 0.7 },
  abilityIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, gap: 2 },
});
