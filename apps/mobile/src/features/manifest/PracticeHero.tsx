import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { AppText } from "../../components/ui/AppText";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { useMascotStore, NO_EQUIPPED } from "../../store/useMascotStore";
import { useMotion } from "../../lib/motion";
import { useTranslation, type TranslationKey } from "../../i18n";
import type { PracticeDay, PracticeMethod } from "../../services/types";
import { colors, palette, radii, spacing, surface } from "../../lib/design-system";
import { METHOD_LOOK, PRACTICE_METHODS, SLOTS, methodDone, sessionsDone, slotFor, type PracticeSuggestion } from "./practiceModel";

interface PracticeHeroProps {
  suggestion: PracticeSuggestion;
  day: PracticeDay | undefined;
  onStart: (method: PracticeMethod) => void;
  onMoon: () => void;
}

/**
 * The Manifest tab's one primary action: today's practice, with Aster, and a
 * single START. Under it the four methods sit as lesson tiles, ticked when
 * done today, so any practice is one tap away without explaining them all.
 */
export function PracticeHero({ suggestion, day, onStart, onMoon }: PracticeHeroProps) {
  const { t } = useTranslation();
  const stage = useMascotStore((s) => s.state?.stage ?? 0);
  const mood = useMascotStore((s) => s.state?.mood ?? "happy");
  const accessories = useMascotStore((s) => s.state?.equipped ?? NO_EQUIPPED);

  let title: string;
  let body: string;
  let cta: { label: string; tone: keyof typeof palette; onPress: () => void } | null = null;

  if (suggestion.kind === "moon") {
    title = suggestion.phase === "new" ? t("wish.ritual.moonNewTitle") : t("wish.ritual.moonFullTitle");
    body = suggestion.phase === "new" ? t("wish.ritual.moonNewBody") : t("wish.ritual.moonFullBody");
    cta = { label: t("wish.ritual.moonCta"), tone: "star", onPress: onMoon };
  } else if (suggestion.kind === "method") {
    const m = suggestion.method;
    title = t(`practice.methods.${m}.name` as TranslationKey);
    const short = t(`practice.methods.${m}.short` as TranslationKey);
    body = suggestion.wish ? `${short} · ${t("practice.forWish", { goal: suggestion.wish.goalText })}` : short;
    cta = { label: t("practice.start"), tone: METHOD_LOOK[m].tone, onPress: () => onStart(m) };
  } else {
    title = t("practice.allDone");
    body = t("practice.allDoneBody");
  }

  const showSessions = suggestion.kind === "method" && suggestion.method === "369";

  return (
    <View style={styles.wrap}>
      <ChunkyCard depth="lg" style={styles.card}>
        <View style={styles.head}>
          <AsterMascot
            stage={stage}
            mood={suggestion.kind === "done" ? "glowing" : mood}
            action="idle"
            size={72}
            accessories={accessories}
          />
          <View style={styles.text}>
            <AppText variant="label" color={colors.text.accent}>
              {t("practice.today")}
            </AppText>
            <AppText variant="title" accessibilityRole="header">
              {title}
            </AppText>
            <AppText variant="bodySmall" color={colors.text.secondary} numberOfLines={3}>
              {body}
            </AppText>
          </View>
        </View>
        {showSessions ? <Sessions day={day} /> : null}
        {cta ? <ChunkyButton label={cta.label} variant={cta.tone} onPress={cta.onPress} /> : null}
      </ChunkyCard>

      <View style={styles.tiles}>
        {PRACTICE_METHODS.map((m) => (
          <MethodTile key={m} method={m} done={methodDone(day, m, slotFor(new Date().getHours()))} onPress={() => onStart(m)} />
        ))}
      </View>
    </View>
  );
}

/** A lesson node: a round icon that reads "done" with a tick. */
function MethodTile({ method, done, onPress }: { method: PracticeMethod; done: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const m = useMotion();
  const look = METHOD_LOOK[method];
  const tone = palette[look.tone];
  const name = t(`practice.methods.${method}.name` as TranslationKey);
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={styles.tile}
      accessibilityRole="button"
      accessibilityLabel={
        done
          ? t("practice.methodDoneA11y", { name })
          : t("practice.methodA11y", { name, short: t(`practice.methods.${method}.short` as TranslationKey) })
      }
    >
      <View style={styles.nodeShell}>
        <View style={[styles.nodeSlab, { backgroundColor: tone.slab }]} />
        <View style={[styles.node, { backgroundColor: done ? tone.face : surface.raised, borderColor: tone.face }]}>
          <Ionicons name={look.icon} size={24} color={done ? tone.on : tone.face} />
        </View>
        {done ? (
          <Animated.View entering={m.enter("pop")} style={styles.badge}>
            <Ionicons name="checkmark" size={12} color={palette.mint.on} />
          </Animated.View>
        ) : null}
      </View>
      <AppText variant="labelLong" center numberOfLines={2} color={colors.text.secondary}>
        {name}
      </AppText>
    </PressableScale>
  );
}

function Sessions({ day }: { day: PracticeDay | undefined }) {
  const { t } = useTranslation();
  return (
    <View style={styles.sessions} accessible accessibilityLabel={t("practice.methods.369.sessions", { done: sessionsDone(day) })}>
      {SLOTS.map((s) => (
        <View key={s} style={[styles.session, day?.s369?.[s] && styles.sessionOn]} />
      ))}
      <AppText variant="bodySmall" color={colors.text.tertiary}>
        {t("practice.methods.369.sessions", { done: sessionsDone(day) })}
      </AppText>
    </View>
  );
}

const NODE = 56;

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  card: { gap: spacing.lg },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  text: { flex: 1, gap: 2 },
  tiles: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  tile: { flex: 1, alignItems: "center", gap: spacing.xs, minHeight: 44 },
  nodeShell: { width: NODE, height: NODE + 4 },
  nodeSlab: { position: "absolute", left: 0, top: 4, width: NODE, height: NODE, borderRadius: NODE / 2 },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.mint.face,
    alignItems: "center",
    justifyContent: "center",
  },
  sessions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  session: { width: 12, height: 12, borderRadius: radii.pill, backgroundColor: surface.raised },
  sessionOn: { backgroundColor: palette.star.face },
});
