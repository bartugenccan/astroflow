import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { Chip } from "../../components/ui/Chip";
import { useMascotStore } from "../../store/useMascotStore";
import { useTranslation, TranslationKey } from "../../i18n";
import { ordinal } from "../../lib/astroLanguage";
import { colors, palette, spacing, Tone } from "../../lib/design-system";
import type { MoodReply, MoodSky } from "../../services/types";
import { Collapse } from "./Collapse";
import { PushTile } from "./PushTile";
import { signName } from "./planCopy";

const SKIES: { sky: MoodSky; icon: keyof typeof Ionicons.glyphMap; tone: Tone }[] = [
  { sky: "RADIANT", icon: "sunny", tone: "star" },
  { sky: "CLEAR", icon: "partly-sunny", tone: "sky" },
  { sky: "PARTLY", icon: "cloudy", tone: "mint" },
  { sky: "CLOUDY", icon: "rainy", tone: "cloud" },
  { sky: "STORMY", icon: "thunderstorm", tone: "primary" },
];

const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;

interface SkyCheckInCardProps {
  /** The answer is on its way (the screen keeps the card up through Aster's reply). */
  onSubmit?: () => void;
  /** After a successful check-in (reload the plan: mood reshapes it). */
  onCheckedIn: () => void;
  /** Once the card has collapsed away. */
  onClosed: () => void;
}

/**
 * The morning check-in: "How is your sky today?" — five weather tiles and a
 * 1–5 energy picker. Aster answers in a bubble (and offers a breath on a
 * heavy day), then the card springs shut.
 */
export function SkyCheckInCard({ onSubmit, onCheckedIn, onClosed }: SkyCheckInCardProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const checkInMood = useMascotStore((s) => s.checkInMood);
  const [sky, setSky] = useState<MoodSky | null>(null);
  const [energy, setEnergy] = useState(3);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reply, setReply] = useState<MoodReply | null>(null);
  const [open, setOpen] = useState(true);

  const send = async () => {
    if (!sky || busy) return;
    setBusy(true);
    setFailed(false);
    onSubmit?.();
    const res = await checkInMood(sky, energy);
    setBusy(false);
    if (!res) {
      setFailed(true);
      return;
    }
    setReply(res);
    onCheckedIn();
  };

  const replyText = reply ? t((reply.replyKey || `mood.reply.${sky}`) as TranslationKey) : "";
  const moonText =
    reply?.moon && reply.moon.natalHouse
      ? t("mood.moon", { sign: signName(t, reply.moon.sign), n: ordinal(locale, reply.moon.natalHouse) })
      : null;

  return (
    <Collapse open={open} onClosed={onClosed}>
      <ChunkyCard style={styles.card}>
        {reply ? (
          <View style={styles.gap}>
            <AsterCameo text={moonText ? `${replyText}\n${moonText}` : replyText} size={64} action="cheer" />
            <View style={styles.replyActions}>
              {reply.suggestBreath ? (
                <Chip
                  label={t("mood.breathe")}
                  icon="leaf"
                  tone="mint"
                  onPress={() => router.push("/aster/breathe" as Href)}
                />
              ) : (
                <View />
              )}
              <ChunkyButton label={t("mood.gotIt")} size="sm" variant="night" onPress={() => setOpen(false)} />
            </View>
          </View>
        ) : (
          <View style={styles.gap}>
            <View>
              <AppText variant="heading">{t("mood.title")}</AppText>
              <AppText variant="bodySmall" color={colors.text.secondary}>
                {t("mood.subtitle")}
              </AppText>
            </View>

            <View style={styles.tiles} accessibilityRole="radiogroup" accessibilityLabel={t("mood.title")}>
              {SKIES.map((s) => {
                const selected = sky === s.sky;
                return (
                  <PushTile
                    key={s.sky}
                    tone={s.tone}
                    selected={selected}
                    onPress={() => setSky(s.sky)}
                    accessibilityLabel={t(`mood.sky.${s.sky}` as TranslationKey)}
                    style={styles.tile}
                  >
                    <Ionicons
                      name={s.icon}
                      size={26}
                      color={selected ? palette[s.tone].on : palette[s.tone].face}
                    />
                  </PushTile>
                );
              })}
            </View>
            <AppText variant="labelLong" center color={sky ? colors.text.primary : colors.text.tertiary}>
              {sky ? t(`mood.sky.${sky}` as TranslationKey) : " "}
            </AppText>

            <View style={styles.energyRow}>
              <AppText variant="label" style={styles.energyLabel}>
                {t("mood.energy")}
              </AppText>
              <View style={styles.dots} accessibilityRole="radiogroup" accessibilityLabel={t("mood.energy")}>
                {ENERGY_LEVELS.map((n) => (
                  <PushTile
                    key={n}
                    tone="mint"
                    selected={n <= energy}
                    onPress={() => setEnergy(n)}
                    accessibilityLabel={t("mood.energyA11y", { n })}
                    height={36}
                    radius={18}
                    style={styles.dot}
                  >
                    <AppText variant="numeric" color={n <= energy ? palette.mint.on : colors.text.secondary}>
                      {n}
                    </AppText>
                  </PushTile>
                ))}
              </View>
            </View>

            {failed ? (
              <AppText variant="bodySmall" color={colors.semantic.error} accessibilityLiveRegion="polite">
                {t("mood.error")}
              </AppText>
            ) : null}
            <ChunkyButton
              label={t("mood.send")}
              size="md"
              variant="primary"
              disabled={!sky}
              loading={busy}
              onPress={send}
            />
          </View>
        )}
      </ChunkyCard>
    </Collapse>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  gap: { gap: spacing.md },
  tiles: { flexDirection: "row", gap: spacing.sm },
  tile: { flex: 1 },
  energyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  energyLabel: { minWidth: 56 },
  dots: { flex: 1, flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  dot: { flex: 1, maxWidth: 52, minHeight: 44 },
  replyActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
});
