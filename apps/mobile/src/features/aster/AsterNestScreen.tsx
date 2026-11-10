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
import { IconButton } from "../../components/ui/IconButton";
import { SpeechBubble } from "../../components/ui/SpeechBubble";
import { StateView } from "../../components/ui/StateView";
import { StatPill, StatRow } from "../../components/ui/StatPill";
import { PressableScale } from "../../components/ui/PressableScale";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { Disclosure } from "../../components/ui/Disclosure";
import { GoldToggle } from "../../components/ui/GoldToggle";
import { EnterView } from "../../lib/motion";
import { ECLIPSE_MAX_DAYS } from "../../lib/mascotRules";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, palette, radii, spacing, surface, Tone } from "../../lib/design-system";
import { ACCOUNTS_ENABLED } from "../../services/auth/account";
import { useAppStore } from "../../store/useAppStore";
import { useMascotStore } from "../../store/useMascotStore";
import { formatDay } from "../today/AsterHero";
import { asterA11y, asterLine, stageName } from "./asterCopy";
import { ProtectAsterSheet } from "./ProtectAsterSheet";
import { unlockLines } from "./unlockCopy";
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

/** Abilities that are live in this build even if an older server still says "coming soon". */
const LIVE_ABILITIES = new Set(["powerDays"]);

/**
 * Aster's Nest — the mascot's home, in four blocks: big Aster with its stage;
 * Light to the next stage and today's energy; four doors (constellations,
 * breathing, the shop, a chat); and "About Aster", folded — the orbit and its
 * shields, the eclipse rest, protecting Aster with an account, the abilities
 * and how Aster grows.
 */
export function AsterNestScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { state, loading, refresh } = useMascot();
  const error = useMascotStore((s) => s.error);
  const account = useAppStore((s) => s.account);
  const [playKey, setPlayKey] = useState(0);
  const [protectOpen, setProtectOpen] = useState(false);
  const setNovaLook = useMascotStore((s) => s.setNovaLook);

  if (!state) {
    return (
      <ScreenWrapper>
        <View style={styles.topBar}>
          <BackButton />
        </View>
        {error && !loading ? (
          <StateView kind="error" message={t("aster.nest.loadError")} onAction={refresh} />
        ) : (
          <StateView kind="loading" />
        )}
      </ScreenWrapper>
    );
  }

  const stage = state.stage;
  const hatched = state.hatched;
  const resting = state.eclipse.active;
  const mood = resting ? "sleepy" : state.mood;
  const xp = state.xp;
  const floor = state.stageFloorXp;
  const next = state.nextStageXp;
  const progress = next === null ? 1 : (xp - floor) / Math.max(1, next - floor);
  const showProtect = ACCOUNTS_ENABLED && !account;

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
        <StatRow>
          <StatPill
            icon="sparkles"
            tone="star"
            value={state.stardust}
            accessibilityLabel={`${state.stardust} ${t("aster.stardust")}`}
          />
          <StatPill
            icon="shield-checkmark"
            tone="primary"
            value={state.shields}
            muted={state.shields === 0}
            accessibilityLabel={`${state.shields} ${t("aster.shields")}`}
          />
        </StatRow>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.hero}>
          <SpeechBubble
            text={resting ? t("aster.eclipse.restingBubble") : asterLine(locale, mood, hatched)}
            tail="bottom"
            style={styles.bubble}
          />
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
              accessories={state.equipped}
              action={resting ? "sleep" : playKey > 0 ? (hatched ? "cheer" : "hatch") : "idle"}
              playKey={playKey}
              size={190}
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
                {next !== null ? <NextUnlocks stage={stage + 1} /> : null}
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
                {state.energy}%
              </AppText>
            </View>
            <ChunkyProgress value={state.energy / 100} tone="mint" accessibilityLabel={t("aster.energy")} />
          </ChunkyCard>
        </EnterView>

        <EnterView index={2} style={styles.actions}>
          <ActionTile
            icon="star"
            tone="star"
            title={t("aster.constellations.entry")}
            sub={t("aster.constellations.entrySub", {
              found: state.constellations.found,
              total: state.constellations.total,
            })}
            onPress={() => router.push("/aster/constellations" as Href)}
          />
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

        <EnterView index={3}>
          <Disclosure
            title={t("aster.home.aboutTitle")}
            summary={t("aster.home.aboutSummary")}
            icon="information-circle"
            tone="primary"
          >
            <OrbitCard />
            <EclipseCard />
          {showProtect ? (
              <ChunkyCard tone="primary" tinted style={styles.protect}>
                <View style={[styles.tileIcon, { backgroundColor: palette.primary.face }]}>
                  <Ionicons name="shield-checkmark" size={22} color={palette.primary.on} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading">{t("aster.protect.cardTitle")}</AppText>
                  <AppText variant="bodySmall" color={colors.text.secondary}>
                    {t("aster.protect.cardBody")}
                  </AppText>
                  <ChunkyButton
                    label={t("aster.protect.cta")}
                    size="sm"
                    variant="primary"
                    onPress={() => setProtectOpen(true)}
                    style={styles.protectCta}
                  />
                </View>
              </ChunkyCard>
          ) : null}
            <View style={styles.section}>
              <AppText variant="heading">{t("aster.home.abilitiesTitle")}</AppText>
              {state.abilities.map((a) => {
                const tone = ABILITY_TONE[a.key] ?? "primary";
                const live = a.available || LIVE_ABILITIES.has(a.key);
                const status = !a.unlocked
                  ? t("aster.home.unlocksAt", { stage: stageName(t, a.minStage) })
                  : a.key === "powerDays"
                    ? t("aster.nest.powerDaysLive")
                    : a.key === "weeklyLetter"
                      ? `${t("skypath.path.letterOpen")} ›`
                      : live
                        ? t("aster.home.active")
                        : t("aster.home.comingSoon");
                const openLetter = a.key === "weeklyLetter" && a.unlocked;
                const novaToggle = a.key === "novaTheme" && a.unlocked;
                return (
                  <ChunkyCard
                    key={a.key}
                    style={[styles.ability, !a.unlocked && styles.locked]}
                    depth="sm"
                    onPress={openLetter ? () => router.push("/aster/letter" as Href) : undefined}
                    accessibilityLabel={openLetter ? t("skypath.path.letterOpen") : undefined}
                  >
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
                        color={a.unlocked && live ? palette.mint.face : colors.text.tertiary}
                      >
                        {status}
                      </AppText>
                    </View>
                    {novaToggle ? (
                      <GoldToggle
                        value={state.novaLook}
                        onChange={(on) => void setNovaLook(on)}
                        accessibilityLabel={t(`aster.abilities.${a.key}.title` as TranslationKey)}
                      />
                    ) : null}
                  </ChunkyCard>
                );
              })}
            </View>
            <ChunkyCard tone="primary" tinted style={styles.gap}>
              <AppText variant="heading">{t("aster.home.howTitle")}</AppText>
              <AppText variant="body">{t("aster.home.howBody")}</AppText>
              <AppText variant="body">{t("aster.home.shieldsBody")}</AppText>
            </ChunkyCard>
          </Disclosure>
        </EnterView>
      </ScrollView>

      <ProtectAsterSheet visible={protectOpen} onClose={() => setProtectOpen(false)} />
    </ScreenWrapper>
  );
}

/** The orbit: days in a row, the best run, shields and the next free shield from journeys. */
/** "Next unlock": what the next stage opens, so Light always points at something worth having. */
function NextUnlocks({ stage }: { stage: number }) {
  const { t } = useTranslation();
  const lines = unlockLines(t, stage);
  if (!lines.length) return null;
  return (
    <View style={styles.nextUnlocks} accessibilityRole="list">
      <AppText variant="label" color={palette.mint.face}>
        {t("skypath.unlocks.nextTitle")}
      </AppText>
      {lines.map((line) => (
        <View key={line.key} style={styles.unlockRow}>
          <Ionicons name={line.icon} size={16} color={palette[line.tone].face} />
          <AppText variant="bodySmall" color={colors.text.primary} style={styles.flex}>
            {line.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function OrbitCard() {
  const { t } = useTranslation();
  const state = useMascotStore((s) => s.state);
  if (!state) return null;
  const { orbit, journey } = state;
  const every = Math.max(1, journey.shieldEvery);
  const into = journey.completed % every;
  const left = every - into;

  return (
    <ChunkyCard style={styles.gap}>
      <View style={styles.rowBetween}>
        <AppText variant="title">{t("aster.orbit.title")}</AppText>
        <View style={styles.orbitStat} accessible accessibilityLabel={t("aster.orbit.a11y", { n: orbit.streak })}>
          <Ionicons name={orbit.atRisk ? "flame-outline" : "flame"} size={22} color={palette.candy.face} />
          <AppText variant="stat" color={palette.candy.face}>
            {t("aster.orbit.days", { n: orbit.streak })}
          </AppText>
        </View>
      </View>
      <AppText variant="body">{t("aster.orbit.body")}</AppText>
      <View style={styles.orbitPills}>
        <View style={styles.pill}>
          <Ionicons name="trophy" size={16} color={palette.star.face} />
          <AppText variant="numeric" color={colors.text.primary}>
            {t("aster.orbit.best", { n: orbit.best })}
          </AppText>
        </View>
        <View style={styles.pill}>
          <Ionicons name="shield-checkmark" size={16} color={palette.primary.face} />
          <AppText variant="numeric" color={colors.text.primary}>
            {`${state.shields}/${state.maxShields} ${t("aster.shields")}`}
          </AppText>
        </View>
      </View>
      <View style={styles.shieldProgress}>
        <AppText variant="labelLong">{t("aster.orbit.shieldEvery", { n: every })}</AppText>
        <ChunkyProgress
          value={into / every}
          tone="primary"
          segments={every}
          height={10}
          accessibilityLabel={left === 1 ? t("aster.orbit.shieldNext") : t("aster.orbit.shieldLeft", { n: left })}
        />
        <AppText variant="bodySmall">
          {left === 1 ? t("aster.orbit.shieldNext") : t("aster.orbit.shieldLeft", { n: left })}
        </AppText>
      </View>
    </ChunkyCard>
  );
}

/** A chosen rest: pick 1–14 days; streaks pause and reminders go quiet, the chart stays open. */
function EclipseCard() {
  const { t, locale } = useTranslation();
  const state = useMascotStore((s) => s.state);
  const startEclipse = useMascotStore((s) => s.startEclipse);
  const endEclipse = useMascotStore((s) => s.endEclipse);
  const [days, setDays] = useState(3);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!state) return null;
  const { eclipse } = state;
  const max = Math.max(1, eclipse.maxDays || ECLIPSE_MAX_DAYS);
  const daysLabel = days === 1 ? t("aster.eclipse.oneDay") : t("aster.eclipse.days", { n: days });

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    setFailed(false);
    const ok = await fn();
    setBusy(false);
    if (!ok) setFailed(true);
  };

  return (
    <ChunkyCard style={styles.gap} tone={eclipse.active ? "primary" : "night"} tinted={eclipse.active}>
      <View style={styles.eclipseHead}>
        <View style={[styles.tileIcon, { backgroundColor: palette.night.face }]}>
          <Ionicons name="moon" size={22} color={colors.text.violet} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">{t("aster.eclipse.title")}</AppText>
          <AppText variant="bodySmall" color={colors.text.secondary}>
            {t("aster.eclipse.body")}
          </AppText>
        </View>
      </View>

      {eclipse.active ? (
        <>
          <AppText variant="heading" color={colors.text.violet}>
            {t("aster.eclipse.resting", { date: formatDay(eclipse.end, locale) })}
          </AppText>
          <ChunkyButton
            label={t("aster.eclipse.wake")}
            variant="night"
            size="md"
            loading={busy}
            onPress={() => run(endEclipse)}
          />
        </>
      ) : (
        <>
          <AppText variant="labelLong">{t("aster.eclipse.pick")}</AppText>
          <View style={styles.stepper}>
            <IconButton
              icon="remove"
              onPress={() => setDays((d) => Math.max(1, d - 1))}
              disabled={days <= 1}
              accessibilityLabel={t("aster.eclipse.fewer")}
            />
            <AppText variant="stat" center style={styles.flex} accessibilityLiveRegion="polite">
              {daysLabel}
            </AppText>
            <IconButton
              icon="add"
              onPress={() => setDays((d) => Math.min(max, d + 1))}
              disabled={days >= max}
              accessibilityLabel={t("aster.eclipse.more")}
            />
          </View>
          <ChunkyButton
            label={t("aster.eclipse.start", { days: daysLabel })}
            variant="primary"
            size="md"
            loading={busy}
            onPress={() => run(() => startEclipse(days))}
          />
        </>
      )}
      {failed ? (
        <AppText variant="bodySmall" color={colors.semantic.error} accessibilityLiveRegion="polite">
          {t("aster.eclipse.failed")}
        </AppText>
      ) : null}
    </ChunkyCard>
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
    <ChunkyCard onPress={onPress} accessibilityLabel={`${title}. ${sub}`} style={styles.tile} depth="md">
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
  nextUnlocks: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.mint.soft,
  },
  unlockRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
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
  orbitStat: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  orbitPills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: surface.raised,
  },
  shieldProgress: { gap: spacing.sm },
  eclipseHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  protect: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  protectCta: { alignSelf: "flex-start", marginTop: spacing.sm },
});
