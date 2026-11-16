import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { useTranslation } from "../../i18n";
import { colors, palette, radii, spacing, type Tone } from "../../lib/design-system";
import { runAfterTransition } from "../../lib/afterInteractions";
import { JOURNEY_MIN_ENERGY } from "../../lib/mascotRules";
import type { MascotState } from "../../services/types";
import { stageName } from "./asterCopy";

interface AsterPointsSheetProps {
  visible: boolean;
  onClose: () => void;
  state: MascotState | null;
}

/**
 * F14: Işık, today's energy, Yıldız Tozu and the orbit streak arrive within
 * minutes of each other. One sheet, opened from the counters on Today, says
 * what each one is, what it's for and where the user stands.
 */
export function AsterPointsSheet({ visible, onClose, state }: AsterPointsSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const xp = state?.xp ?? 0;
  const next = state?.nextStageXp ?? null;

  const lightNow =
    next !== null && state
      ? t("aster.points.lightNext", { xp, n: Math.max(0, next - xp), stage: stageName(t, state.stage + 1) })
      : t("aster.points.lightMax", { xp });

  const openShop = () => {
    onClose();
    runAfterTransition(() => router.push("/aster/shop" as Href));
  };

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("aster.points.title")} icon="sparkles" tone="star">
      <View style={styles.body}>
        <Row
          icon="sunny"
          tone="star"
          title={t("aster.points.lightTitle")}
          body={t("aster.points.lightBody")}
          now={lightNow}
        />
        <Row
          icon="flash"
          tone="mint"
          title={t("aster.points.energyTitle")}
          body={t("aster.points.energyBody", { min: JOURNEY_MIN_ENERGY })}
          now={t("aster.points.energyNow", { n: state?.energy ?? 0 })}
        />
        <Row
          icon="sparkles"
          tone="sky"
          title={t("aster.points.stardustTitle")}
          body={t("aster.points.stardustBody")}
          now={t("aster.points.stardustNow", { n: state?.stardust ?? 0 })}
        />
        <Row
          icon="flame"
          tone="candy"
          title={t("aster.points.streakTitle")}
          body={t("aster.points.streakBody")}
          now={t("aster.streak", { n: state?.orbit?.streak ?? 0 })}
        />
        <View style={styles.actions}>
          <ChunkyButton label={t("aster.points.shop")} onPress={openShop} variant="night" uppercase={false} />
          <ChunkyButton label={t("aster.points.ok")} onPress={onClose} variant="star" />
        </View>
      </View>
    </SpringBottomSheet>
  );
}

function Row({
  icon,
  tone,
  title,
  body,
  now,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  title: string;
  body: string;
  now: string;
}) {
  const p = palette[tone];
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: p.soft, borderColor: p.face }]}>
        <Ionicons name={icon} size={18} color={p.face} />
      </View>
      <View style={styles.flex}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="bodySmall" color={colors.text.secondary}>
          {body}
        </AppText>
        <AppText variant="labelLong" color={p.face}>
          {now}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.lg },
  flex: { flex: 1, minWidth: 0, gap: spacing.xs },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { gap: spacing.sm },
});
