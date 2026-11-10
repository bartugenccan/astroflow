import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { PaperCard } from "../../components/ui/Paper";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { StatPill, StatRow } from "../../components/ui/StatPill";
import { Disclosure } from "../../components/ui/Disclosure";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { useMascotStore } from "../../store/useMascotStore";
import { haptics } from "../../lib/haptics";
import { useTranslation } from "../../i18n";
import { colors, palette, paper, radii, spacing, surface, typography } from "../../lib/design-system";
import type { Intention, IntentionSign } from "../../services/types";

const SPARK_H = 56;

interface Props {
  intention: Intention;
  /** Active manifests can log new signs; a manifested one only shows its story. */
  active: boolean;
}

/**
 * "Your journey" with one manifest: the report card (days with it, practices,
 * longest streak), how belief moved over the last check-ins, and the signs
 * the user noticed on the way — the evidence log. Logging a sign takes a few
 * words in a small sheet and gives Aster +5 Işık (once a day).
 */
export function WishJourneyCard({ intention, active }: Props) {
  const { t } = useTranslation();
  const stats = intention.stats;
  const [reloadKey, setReloadKey] = useState(0);
  const signs = useAsync(() => astrologyApi.getIntentionSigns(intention.id), [intention.id, reloadKey]);
  const [adding, setAdding] = useState(false);

  const trend = stats?.convictionTrend ?? [];
  const list = signs.data ?? [];

  return (
    <ChunkyCard style={styles.card}>
      <AppText variant="heading" accessibilityRole="header">
        {t("wish.journey.title")}
      </AppText>

      {stats ? (
        <StatRow>
          <StatPill icon="calendar" tone="sky" value={stats.daysActive} accessibilityLabel={t("wish.journey.daysA11y", { n: stats.daysActive })} />
          <StatPill icon="create" tone="candy" value={stats.checkIns} accessibilityLabel={t("wish.journey.practicesA11y", { n: stats.checkIns })} />
          <StatPill icon="flame" tone="star" value={stats.longestStreak} accessibilityLabel={t("wish.journey.bestA11y", { n: stats.longestStreak })} />
        </StatRow>
      ) : null}

      {trend.length >= 2 ? (
        <View style={styles.trend}>
          <View style={styles.trendHead}>
            <AppText variant="label" color={colors.text.secondary} style={styles.flex}>
              {t("wish.journey.belief")}
            </AppText>
            <AppText variant="labelLong" color={palette.star.face}>
              {t("wish.journey.beliefRange", { from: trend[0], to: trend[trend.length - 1] })}
            </AppText>
          </View>
          <Sparkline values={trend} label={t("wish.journey.beliefA11y", { from: trend[0], to: trend[trend.length - 1], n: trend.length })} />
        </View>
      ) : (
        <AppText variant="bodySmall" color={colors.text.tertiary}>
          {t("wish.journey.beliefEmpty")}
        </AppText>
      )}

      <View style={styles.signsHead}>
        <AppText variant="heading" style={styles.flex}>
          {t("wish.journey.signsTitle")}
        </AppText>
        {list.length ? (
          <AppText variant="numeric" color={colors.text.secondary}>
            {list.length}
          </AppText>
        ) : null}
      </View>
      {list.length === 0 ? (
        <AppText variant="bodySmall" color={colors.text.secondary}>
          {t("wish.journey.signsEmpty")}
        </AppText>
      ) : (
        <View style={styles.signs}>
          {list.slice(0, 2).map((s) => (
            <SignNote key={s.id} sign={s} />
          ))}
          {list.length > 2 ? (
            <Disclosure title={t("wish.journey.allSigns", { n: list.length })} icon="eye" tone="candy">
              {list.slice(2).map((s) => (
                <SignNote key={s.id} sign={s} />
              ))}
            </Disclosure>
          ) : null}
        </View>
      )}
      {active ? (
        <ChunkyButton
          label={t("wish.journey.addSign")}
          variant="candy"
          size="md"
          icon={<Ionicons name="eye" size={18} color={palette.candy.on} />}
          onPress={() => setAdding(true)}
        />
      ) : null}

      <AddSignSheet
        visible={adding}
        intentionId={intention.id}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          setReloadKey((k) => k + 1);
        }}
      />
    </ChunkyCard>
  );
}

function SignNote({ sign }: { sign: IntentionSign }) {
  return (
    <PaperCard lines={2} plain>
      <AppText variant="script" color={paper.ink}>
        {sign.text}
      </AppText>
      <AppText variant="bodySmall" color={paper.ink}>
        {sign.date}
      </AppText>
    </PaperCard>
  );
}

/** Belief (1–5) over the last check-ins, oldest on the left. The range is also said in words. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const [w, setW] = useState(0);
  const pad = 6;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
  const y = (v: number) => pad + ((5 - v) / 4) * (SPARK_H - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const last = values.length - 1;
  return (
    <View
      style={styles.spark}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {w > 0 ? (
        <Svg width={w} height={SPARK_H}>
          <Path d={d} stroke={palette.star.face} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" fill="none" />
          <Circle cx={x(last)} cy={y(values[last])} r={5} fill={palette.star.face} />
        </Svg>
      ) : null}
    </View>
  );
}

function AddSignSheet({
  visible,
  intentionId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  intentionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const applyDelta = useMascotStore((s) => s.applyDelta);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = text.trim().length >= 3;

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await astrologyApi.addIntentionSign(intentionId, text);
      haptics.success();
      applyDelta(res.mascot);
      setText("");
      onSaved();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SpringBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("wish.journey.addSign")}
      icon="eye"
      tone="candy"
      dirty={text.trim().length > 0}
    >
      <View style={styles.sheet}>
        <AppText variant="bodySmall" color={colors.text.secondary}>
          {t("wish.journey.signHint")}
        </AppText>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("wish.journey.signPlaceholder")}
          placeholderTextColor={colors.text.tertiary}
          style={styles.input}
          multiline
          maxLength={280}
          autoFocus
          accessibilityLabel={t("wish.journey.addSign")}
        />
        {failed ? (
          <AppText variant="bodySmall" color={colors.semantic.error} accessibilityLiveRegion="polite">
            {t("wish.detail.actionError")}
          </AppText>
        ) : null}
        <ChunkyButton label={t("wish.journey.saveSign")} variant="candy" onPress={save} loading={busy} disabled={!ready} />
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  trend: { gap: spacing.xs },
  trendHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  spark: { height: SPARK_H, borderRadius: radii.md, backgroundColor: surface.raised },
  signsHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  signs: { gap: spacing.sm },
  sheet: { gap: spacing.md },
  input: {
    ...typography.body,
    color: colors.text.primary,
    minHeight: 96,
    textAlignVertical: "top",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    backgroundColor: surface.raised,
  },
});
