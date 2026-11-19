import React, { useMemo, useRef } from "react";
import { StyleSheet, View, type ViewInstance } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { TwinkleSky } from "../../components/ui/TwinkleSky";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { Chip } from "../../components/ui/Chip";
import { PressableScale } from "../../components/ui/PressableScale";
import { SpringBottomSheet, type SheetOrigin } from "../../components/ui/SpringBottomSheet";
import { useTranslation } from "../../i18n";
import { colors, palette, radii, spacing } from "../../lib/design-system";
import { useMotion } from "../../lib/motion";
import { runAfterTransition } from "../../lib/afterInteractions";
import { useAppStore } from "../../store/useAppStore";
import { useMascotStore } from "../../store/useMascotStore";
import { useReminderToggle } from "../reminders/useReminderToggle";
import type { SkyMoment } from "../../services/types";
import { track } from "../../services/analytics";
import {
  isSoftNote,
  momentBody,
  momentDate,
  momentHouseLine,
  momentIcon,
  momentTitle,
  momentTone,
  momentWhen,
  visibleMoments,
} from "./momentCopy";

interface SkyMomentCardProps {
  moments: SkyMoment[];
  /** The card's sheet is open: the card steps aside, since the sheet grew out of it. */
  open?: boolean;
  /** Tapped: the moment to show and where the card sits on screen (the sheet grows from there). */
  onOpen: (id: string, origin: SheetOrigin | null) => void;
}

/**
 * "Key moment in your sky" on Today: the highest-ranked moment that is active
 * now or starts within the next weeks, in plain words. Tapping opens the
 * sheet (MomentSheet, mounted by the screen) with the why, the exact dates and
 * the other upcoming moments; the sheet grows out of this card. Hidden when
 * there is nothing worth a card.
 */
export function SkyMomentCard({ moments, open = false, onOpen }: SkyMomentCardProps) {
  const { t, locale } = useTranslation();
  const { reduced } = useMotion();
  const visible = useMemo(() => visibleMoments(moments), [moments]);
  const report = useMascotStore((s) => s.report);
  const frameRef = useRef<ViewInstance>(null);

  const top = visible[0];
  if (!top) return null;
  const tone = momentTone(top);
  const title = momentTitle(t, top);
  const when = momentWhen(t, locale, top);
  const others = visible.length - 1;

  const openSheet = () => {
    track("sky_moment_opened");
    // Reading a key moment feeds Aster (once a day; the server caps it).
    if (!useMascotStore.getState().state?.today?.SKY_MOMENT) report("SKY_MOMENT");
    const frame = frameRef.current;
    if (!frame) {
      onOpen(top.id, null);
      return;
    }
    frame.measureInWindow((x, y, width, height) => {
      onOpen(top.id, width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  };

  return (
    // While its sheet is open the card hides: the sheet is the card, grown.
    // Under Reduce Motion the sheet only fades, so the card stays put.
    <View ref={frameRef} collapsable={false} style={open && !reduced ? styles.away : undefined}>
      <ChunkyCard
        tone={tone}
        tinted
        style={styles.card}
        onPress={openSheet}
        accessibilityLabel={`${t("moments.cardLabel")}. ${title}. ${when}`}
        accessibilityHint={t("moments.open")}
      >
        <TwinkleSky color={palette[tone].face} seed={top.id} />
        <View style={styles.top}>
          <IconBadge moment={top} />
          <AppText variant="label" color={palette[tone].face} style={styles.flex} numberOfLines={1}>
            {t("moments.cardLabel")}
          </AppText>
          {top.certainty === "possible" ? <Chip label={t("moments.possibleChip")} tone="cloud" /> : null}
        </View>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="body" color={colors.text.secondary} numberOfLines={2}>
          {momentBody(t, locale, top)}
        </AppText>
        <View style={styles.bottom}>
          <AppText variant="labelLong" color={colors.text.accent} style={styles.flex} numberOfLines={1}>
            {when}
          </AppText>
          {others > 0 ? (
            <AppText variant="labelLong" color={colors.text.tertiary}>
              {t("moments.more", { n: others })}
            </AppText>
          ) : null}
        </View>
      </ChunkyCard>
    </View>
  );
}

/** A solid candy coin with its own slab — the moment's sigil, not a flat outline. */
function IconBadge({ moment, size = 36 }: { moment: SkyMoment; size?: number }) {
  const p = palette[momentTone(moment)];
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, backgroundColor: p.face, borderColor: p.face, borderBottomColor: p.slab },
      ]}
    >
      <Ionicons name={momentIcon(moment)} size={Math.round(size * 0.52)} color={p.on} />
    </View>
  );
}

interface MomentSheetProps {
  /** All moments (the same list the card gets); the sheet picks the visible ones. */
  moments: SkyMoment[];
  openId: string | null;
  /** The card's on-screen rect, so the sheet grows out of it (and back into it). */
  origin?: SheetOrigin | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/**
 * The key-moment sheet. Mounted by the screen beside its ScrollView (never
 * inside the card), so it covers the screen rather than the card's slot.
 */
export function MomentSheet({ moments: all, openId, origin, onSelect, onClose }: MomentSheetProps) {
  const { t, locale } = useTranslation();
  const moments = useMemo(() => visibleMoments(all), [all]);
  const router = useRouter();
  const remindersOn = useAppStore((s) => !!s.reminders.skyMoments);
  const toggleReminder = useReminderToggle();
  // The body is derived in the same render that opens the sheet, so the sheet
  // is measured (and grows) with its content already in place. The last moment
  // is kept so the body stays put while the sheet animates out (openId null).
  const lastShown = useRef<SkyMoment | null>(null);
  const current = openId ? (moments.find((x) => x.id === openId) ?? all.find((x) => x.id === openId) ?? null) : null;
  if (current) lastShown.current = current;
  const m = current ?? lastShown.current;
  const others = m ? moments.filter((x) => x.id !== m.id).slice(0, 4) : [];
  const house = m ? momentHouseLine(t, locale, m) : null;
  const season =
    m?.kind === "saturn_return" && m.detail.seasonStart && m.detail.seasonEnd
      ? t("moments.when.range", {
          start: momentDate(locale, m.detail.seasonStart),
          end: momentDate(locale, m.detail.seasonEnd),
        })
      : null;
  const passes = m && m.kind !== "retrograde_period" && m.kind !== "double_retrograde" ? m.passes : [];

  const writeManifest = () => {
    onClose();
    runAfterTransition(() => router.push("/intentions/create" as Href));
  };

  return (
    <SpringBottomSheet
      visible={openId !== null}
      onClose={onClose}
      origin={origin}
      title={t("moments.sheetTitle")}
      icon="sparkles"
      tone={m ? momentTone(m) : "primary"}
    >
      {m ? (
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <IconBadge moment={m} size={44} />
            <AppText variant="title" style={styles.flex} accessibilityRole="header">
              {momentTitle(t, m)}
            </AppText>
          </View>

          {m.certainty === "possible" ? (
            <View style={styles.note}>
              <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
              <AppText variant="bodySmall" color={colors.text.secondary} style={styles.flex}>
                {t("moments.possibleNote")}
              </AppText>
            </View>
          ) : null}

          <AppText variant="body">{momentBody(t, locale, m)}</AppText>

          <View style={styles.facts}>
            {season ? <Fact label={t("moments.seasonLabel")} value={season} /> : null}
            {season && m.passes[0] ? (
              <Fact label={t("moments.peakLabel")} value={momentDate(locale, m.passes[0])} />
            ) : (
              <Fact label={momentWhen(t, locale, m)} />
            )}
            {!season && passes.length > 1 ? (
              <Fact label={t("moments.passesLabel")} value={passes.map((p) => momentDate(locale, p)).join(" · ")} />
            ) : null}
            {house ? <Fact label={house} /> : null}
          </View>

          {isSoftNote(m) ? (
            <AppText variant="bodySmall" color={colors.text.tertiary}>
              {t("moments.softNote")}
            </AppText>
          ) : null}

          <ChunkyButton
            label={t("moments.cta")}
            onPress={writeManifest}
            variant="primary"
            uppercase={false}
            accessibilityHint={t("moments.ctaHint")}
            icon={<Ionicons name="create-outline" size={20} color={palette.primary.on} />}
          />

          {remindersOn ? (
            <View style={styles.remindRow}>
              <Ionicons name="notifications" size={18} color={palette.mint.face} />
              <AppText variant="bodySmall" color={colors.text.secondary} style={styles.flex}>
                {t("moments.remindOn")}
              </AppText>
            </View>
          ) : (
            <Chip
              label={t("moments.remindMe")}
              icon="notifications-outline"
              tone="mint"
              onPress={() => toggleReminder("skyMoments", true)}
            />
          )}

          {others.length ? (
            <View style={styles.list}>
              <AppText variant="label" color={colors.text.tertiary}>
                {t("moments.upcomingTitle")}
              </AppText>
              {others.map((o) => (
                <PressableScale
                  key={o.id}
                  onPress={() => onSelect(o.id)}
                  style={styles.row}
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={`${momentTitle(t, o)}. ${momentWhen(t, locale, o)}`}
                >
                  <IconBadge moment={o} size={32} />
                  <View style={styles.flex}>
                    <AppText variant="bodySmall" numberOfLines={1}>
                      {momentTitle(t, o)}
                    </AppText>
                    <AppText variant="labelLong" color={colors.text.tertiary} numberOfLines={1}>
                      {momentWhen(t, locale, o)}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </PressableScale>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </SpringBottomSheet>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.fact}>
      <AppText variant="labelLong" color={value ? colors.text.tertiary : colors.text.accent}>
        {label}
      </AppText>
      {value ? <AppText variant="bodySmall">{value}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  away: { opacity: 0 },
  // overflow hidden clips the TwinkleSky backdrop to the rounded card.
  card: { gap: spacing.sm, overflow: "hidden" },
  flex: { flex: 1, minWidth: 0 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bottom: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: {
    borderRadius: radii.pill,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: { gap: spacing.lg, paddingBottom: spacing.lg },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.night.soft,
  },
  facts: { gap: spacing.sm },
  remindRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44 },
  fact: { gap: spacing.xs },
  list: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.night.soft,
  },
});
