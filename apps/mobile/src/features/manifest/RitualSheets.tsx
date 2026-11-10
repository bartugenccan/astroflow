import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { astrologyApi } from "../../services/astrologyApi";
import { useReflectionStore } from "../../store/useReflectionStore";
import { useMascotStore } from "../../store/useMascotStore";
import { daysBetween } from "../../lib/mascotRules";
import { useTranslation } from "../../i18n";
import type { Intention } from "../../services/types";
import { colors, palette, radii, spacing, surface, typography, type Tone } from "../../lib/design-system";
import { WishStarGlyph } from "./WishStarGlyph";
import { celebrateManifested, starLook, whenLabel, type LunarInfo } from "./wishModel";

type Choice = "keep" | "cameTrue" | "letGo";

const CHOICES: { key: Choice; tone: Tone; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "keep", tone: "mint", icon: "leaf" },
  { key: "cameTrue", tone: "star", icon: "star" },
  { key: "letGo", tone: "sky", icon: "cloud-outline" },
];

/** Where the ritual is drawn: a page (`/ritual`) wraps it with its own title. */
export type RitualFrame = (title: string, body: React.ReactNode) => React.ReactNode;

interface MoonRitualFlowProps {
  frame: RitualFrame;
  /** Leave the ritual (done, or nothing to do now). */
  onClose: () => void;
  lunar: LunarInfo;
  wishes: Intention[];
  /** Plant a new wish. */
  onPlant: () => void;
  /** Wishes changed (came true / let go) — reload the sky. */
  onChanged: () => void;
}

/**
 * The Moon ritual. New moon: say what you call in, renew your wishes, watch
 * the seeds planted for this moon open. Full moon: look at each star and keep
 * it, harvest it (it came true) or let it go — plus what you release. The
 * written words stay on the phone; only the fact feeds Aster (MOON_RITUAL).
 * Outside a moon window (e.g. opened from a link) it says when the next one is.
 */
export function MoonRitualFlow({ frame, onClose, lunar, wishes, onPlant, onChanged }: MoonRitualFlowProps) {
  const { t } = useTranslation();
  const saveRitual = useReflectionStore((s) => s.saveRitual);
  const report = useMascotStore((s) => s.report);
  const [text, setText] = useState("");
  const [decisions, setDecisions] = useState<Record<string, Choice>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const phase = lunar.window?.phase ?? null;
  const ritualKey = lunar.windowKey;

  const close = () => {
    setError(false);
    onClose();
  };

  if (!phase || !ritualKey) {
    return frame(
      t("wish.moon.betweenTitle"),
      <View style={styles.sheet}>
          <AsterCameo
            text={t("wish.moon.betweenBody", {
              newWhen: whenLabel(t, lunar.daysToNew),
              fullWhen: whenLabel(t, lunar.daysToFull),
            })}
            size={72}
          />
          <ChunkyButton label={t("wish.moon.gotIt")} variant="night" onPress={close} />
      </View>,
    );
  }

  const peak = lunar.window!.peakDate;
  const active = wishes.filter((w) => starLook(w) !== "waiting");
  const seeds = active.filter((w) => w.plantedMoon && Math.abs(daysBetween(peak, w.plantedMoon)) <= 2);
  const renew = active.filter((w) => !seeds.includes(w));
  const decided = Object.keys(decisions).length > 0;
  const ready = phase === "new" ? text.trim().length > 0 : text.trim().length > 0 || decided;

  const finish = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(false);
    let failed = false;
    let changed = false;
    for (const [id, choice] of Object.entries(decisions)) {
      const wish = wishes.find((w) => w.id === id);
      if (!wish || choice === "keep") continue;
      try {
        if (choice === "cameTrue") {
          const res = await astrologyApi.manifestIntention(id);
          celebrateManifested(res, wish.goalText);
        } else {
          await astrologyApi.archiveIntention(id);
        }
        changed = true;
      } catch {
        failed = true;
      }
    }
    // As before: keep the words on the phone, then tell Aster the ritual happened.
    saveRitual(ritualKey, text);
    report("MOON_RITUAL");
    if (changed) onChanged();
    setBusy(false);
    setText("");
    setDecisions({});
    if (failed) {
      setError(true);
      return;
    }
    onClose();
  };

  return frame(
    phase === "new" ? t("wish.moon.newTitle") : t("wish.moon.fullTitle"),
    <View style={styles.sheet}>
        {phase === "new" ? (
          <>
            {seeds.length > 0 ? (
              <View style={styles.block}>
                <AppText variant="heading">{t("wish.moon.seedsTitle")}</AppText>
                <AppText variant="bodySmall">{t("wish.moon.seedsBody")}</AppText>
                {seeds.map((w) => (
                  <WishLine key={w.id} wish={w} />
                ))}
              </View>
            ) : null}
            {renew.length > 0 ? (
              <View style={styles.block}>
                <AppText variant="heading">{t("wish.moon.renewTitle")}</AppText>
                <AppText variant="bodySmall">{t("wish.moon.renewBody")}</AppText>
                {renew.map((w) => (
                  <WishLine key={w.id} wish={w} />
                ))}
              </View>
            ) : null}
            <ChunkyButton
              label={t("wish.moon.plantNew")}
              variant="night"
              size="md"
              onPress={() => {
                close();
                onPlant();
              }}
              icon={<Ionicons name="add" size={18} color={palette.night.on} />}
            />
            <AppText variant="lead">{t("wish.moon.newPrompt")}</AppText>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("wish.moon.newPlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              multiline
              maxLength={500}
              accessibilityLabel={t("wish.moon.newPrompt")}
            />
          </>
        ) : (
          <>
            {active.length > 0 ? (
              <View style={styles.block}>
                <AppText variant="lead">{t("wish.moon.fullPrompt")}</AppText>
                {active.map((w) => (
                  <View key={w.id} style={styles.decision}>
                    <WishLine wish={w} />
                    <View style={styles.choices}>
                      {CHOICES.map((c) => {
                        const selected = decisions[w.id] === c.key;
                        const p = palette[c.tone];
                        const label = t(`wish.moon.${c.key}`);
                        return (
                          <PressableScale
                            key={c.key}
                            onPress={() => setDecisions((d) => ({ ...d, [w.id]: c.key }))}
                            scaleTo={0.94}
                            style={[
                              styles.choice,
                              selected
                                ? { backgroundColor: p.face, borderColor: p.slab, borderBottomColor: p.slab }
                                : null,
                            ]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            accessibilityLabel={t("wish.moon.choiceA11y", { choice: label, goal: w.goalText })}
                          >
                            <Ionicons name={c.icon} size={16} color={selected ? p.on : colors.text.secondary} />
                            <AppText variant="label" color={selected ? p.on : colors.text.secondary} numberOfLines={1}>
                              {label}
                            </AppText>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <AppText variant="body">{t("wish.moon.noWishes")}</AppText>
            )}
            <AppText variant="lead">{t("wish.moon.releasePrompt")}</AppText>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("wish.moon.releasePlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              multiline
              maxLength={500}
              accessibilityLabel={t("wish.moon.releasePrompt")}
            />
          </>
        )}
        <AppText variant="bodySmall">{t("wish.moon.privacy")}</AppText>
        {error ? (
          <AppText variant="bodySmall" color={colors.semantic.error} accessibilityLiveRegion="polite">
            {t("wish.moon.error")}
          </AppText>
        ) : null}
        <ChunkyButton
          label={t("wish.moon.finish")}
          variant="star"
          onPress={finish}
          loading={busy}
          disabled={!ready}
        />
    </View>,
  );
}

function WishLine({ wish }: { wish: Intention }) {
  return (
    <View style={styles.wishLine}>
      <WishStarGlyph look={starLook(wish)} size={32} />
      <AppText variant="heading" style={styles.flex} numberOfLines={2}>
        {wish.goalText}
      </AppText>
    </View>
  );
}

/** Close the day: three small lights, kept on the phone; Aster hears that it happened. */
export function EveningReflectionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const closeDay = useReflectionStore((s) => s.closeDay);
  const report = useMascotStore((s) => s.report);
  const [items, setItems] = useState(["", "", ""]);
  const prompts = [t("wish.evening.p1"), t("wish.evening.p2"), t("wish.evening.p3")];
  const ready = items.some((x) => x.trim());

  const finish = () => {
    if (!ready) return;
    closeDay(items);
    report("EVENING_REFLECTION");
    setItems(["", "", ""]);
    onClose();
  };

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("wish.evening.title")}>
      <View style={styles.sheet}>
        <AppText variant="lead">{t("wish.evening.intro")}</AppText>
        {prompts.map((p, i) => (
          <View key={p} style={styles.reflectRow}>
            <View style={styles.reflectNum} importantForAccessibility="no-hide-descendants">
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
              accessibilityLabel={p}
            />
          </View>
        ))}
        <AppText variant="bodySmall">{t("wish.evening.privacy")}</AppText>
        <ChunkyButton label={t("wish.evening.cta")} variant="primary" onPress={finish} disabled={!ready} />
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: spacing.lg },
  block: { gap: spacing.sm },
  flex: { flex: 1 },
  wishLine: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
  decision: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    backgroundColor: surface.card,
  },
  choices: { flexDirection: "row", gap: spacing.sm },
  choice: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border.chunky,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    minHeight: 96,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    backgroundColor: surface.raised,
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
