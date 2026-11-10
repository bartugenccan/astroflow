import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { BackButton } from "../../components/ui/BackButton";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { Chip } from "../../components/ui/Chip";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { Segmented } from "../../components/ui/Segmented";
import { WheelItem, WheelPicker } from "../../components/ui/WheelPicker";
import { PaywallSheet } from "../../components/PaywallSheet";
import { EnterView } from "../../lib/motion";
import { addDaysISO, daysInMonth, formatDayMonthYear, formatMonthYear, monthShort, todayISO } from "../../lib/dates";
import type { ElectionEventId, ElectionPlace, ElectionQuery } from "../../services/types";
import { useAppStore } from "../../store/useAppStore";
import { useElectionStore } from "../../store/useElectionStore";
import { TranslationKey, useTranslation } from "../../i18n";
import { colors, depth, fonts, palette, radii, spacing, surface, typography } from "../../lib/design-system";
import { PlaceSheet } from "./PlaceSheet";

type Mode = "check" | "search";

const GROUPS: { key: "love" | "business" | "life"; events: ElectionEventId[] }[] = [
  { key: "love", events: ["engagement", "wedding", "proposal", "first_date"] },
  { key: "business", events: ["business_launch", "contract", "job_interview", "investment"] },
  { key: "life", events: ["moving", "travel", "new_beginning"] },
];
/** How far ahead a single date may be asked about (the API allows 3 years). */
const YEARS_AHEAD = 3;
const MAX_MONTHS = 12;

const ym = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

/**
 * Ask Election a question: about a date you have in mind ("Is 30 Oct 2027 good
 * for our engagement?"), or for the best dates in a span of months. Finding
 * dates is Premium; checking a date is free.
 */
export function ElectionFormScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const profile = useAppStore((s) => s.birthProfile);
  const isPremium = useAppStore((s) => s.isPremium);
  const ask = useElectionStore((s) => s.ask);
  const recent = useElectionStore((s) => s.recent);

  const birthPlace: ElectionPlace | null = profile
    ? {
        name: profile.placeName ?? t("election.placeBirth"),
        latitude: profile.latitude,
        longitude: profile.longitude,
      }
    : null;

  const [mode, setMode] = useState<Mode>(params.mode === "search" ? "search" : "check");
  const [eventId, setEventId] = useState<ElectionEventId | null>(null);
  const [custom, setCustom] = useState(false);
  const [eventText, setEventText] = useState("");
  const [place, setPlace] = useState<ElectionPlace | null>(birthPlace);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [paywall, setPaywall] = useState(false);

  // One date: defaults to a month from today.
  const today = todayISO();
  const start = addDaysISO(today, 30).split("-").map(Number);
  const [year, setYear] = useState(start[0]);
  const [month, setMonth] = useState(start[1]);
  const [day, setDay] = useState(start[2]);

  // A span of months: this month through five months on.
  const [ty, tm] = today.split("-").map(Number);
  const [fromY, setFromY] = useState(ty);
  const [fromM, setFromM] = useState(tm);
  const [toY, setToY] = useState(tm + 5 > 12 ? ty + 1 : ty);
  const [toM, setToM] = useState(((tm + 4) % 12) + 1);

  const years: WheelItem[] = useMemo(
    () => Array.from({ length: YEARS_AHEAD + 1 }, (_, i) => ({ label: String(ty + i), value: ty + i })),
    [ty],
  );
  const months: WheelItem[] = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ label: monthShort(locale, i + 1), value: i + 1 })),
    [locale],
  );
  const days: WheelItem[] = useMemo(
    () => Array.from({ length: daysInMonth(month, year) }, (_, i) => ({ label: String(i + 1), value: i + 1 })),
    [month, year],
  );

  const date = `${ym(year, month)}-${String(Math.min(day, days.length)).padStart(2, "0")}`;
  const span = (toY - fromY) * 12 + (toM - fromM);
  const rangeValid = span >= 0 && span < MAX_MONTHS && ym(toY, toM) >= today.slice(0, 7);
  const dateValid = date >= today;
  const hasEvent = custom ? eventText.trim().length >= 2 : eventId !== null;
  const ready = !!place && hasEvent && (mode === "check" ? dateValid : rangeValid);

  const submit = (query: ElectionQuery) => {
    if (query.mode === "search" && !isPremium) {
      setPaywall(true);
      return;
    }
    ask(query);
    router.push("/election/result" as Href);
  };

  const onSubmit = () => {
    if (!place || !ready) return;
    const event = custom ? { eventText: eventText.trim() } : { eventId: eventId ?? undefined };
    submit(
      mode === "check"
        ? { mode, ...event, place, date }
        : { mode, ...event, place, from: ym(fromY, fromM), to: ym(toY, toM) },
    );
  };

  const eventName = (q: ElectionQuery) =>
    q.eventText ?? (q.eventId ? t(`election.events.${q.eventId}` as TranslationKey) : "");

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackButton />

        <EnterView style={styles.header}>
          <AppText variant="label" color={colors.text.accent}>
            {t("election.eyebrow")}
          </AppText>
          <AppText variant="title">{t("election.title")}</AppText>
          <AsterCameo text={t("election.intro")} size={60} style={styles.cameo} />
        </EnterView>

        <EnterView index={1} style={styles.block}>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { key: "check", label: t("election.modeCheck") },
              { key: "search", label: isPremium ? t("election.modeSearch") : `${t("election.modeSearch")} ✦` },
            ]}
          />
          <AppText variant="bodySmall" color={colors.text.tertiary}>
            {mode === "check" ? t("election.modeCheckHint") : t("election.modeSearchHint")}
          </AppText>
        </EnterView>

        {/* What for */}
        <EnterView index={2} style={styles.block}>
          <AppText variant="heading">{t("election.eventTitle")}</AppText>
          {GROUPS.map((g) => (
            <View key={g.key} style={styles.group}>
              <AppText variant="label" color={colors.text.tertiary}>
                {t(`election.groups.${g.key}` as TranslationKey)}
              </AppText>
              <View style={styles.chips}>
                {g.events.map((id) => {
                  const active = !custom && eventId === id;
                  return (
                    <Chip
                      key={id}
                      label={t(`election.events.${id}` as TranslationKey)}
                      tone="star"
                      selected={active}
                      onPress={() => {
                        setCustom(false);
                        setEventId(id);
                      }}
                      style={styles.chip}
                    />
                  );
                })}
              </View>
            </View>
          ))}
          <Chip
            label={t("election.custom")}
            icon="create-outline"
            tone="star"
            selected={custom}
            onPress={() => setCustom((c) => !c)}
            style={styles.chip}
          />
          {custom ? (
            <TextInput
              value={eventText}
              onChangeText={setEventText}
              placeholder={t("election.customPlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              maxLength={120}
              autoFocus
              style={styles.input}
              accessibilityLabel={t("election.custom")}
            />
          ) : null}
        </EnterView>

        {/* Where */}
        <EnterView index={3} style={styles.block}>
          <AppText variant="heading">{t("election.placeTitle")}</AppText>
            <ChunkyCard
              style={styles.placeCard}
              onPress={() => setPlaceOpen(true)}
              accessibilityLabel={`${t("election.placeTitle")}: ${place?.name ?? "—"}`}
              accessibilityHint={t("election.placeChange")}
            >
              <Ionicons name="location" size={18} color={colors.star[300]} />
              <View style={styles.placeText}>
                <AppText variant="heading" numberOfLines={1}>
                  {place?.name ?? "—"}
                </AppText>
                <AppText variant="bodySmall" color={colors.text.tertiary}>
                  {t("election.placeHint")}
                </AppText>
              </View>
              <AppText variant="labelLong" color={colors.text.accent}>
                {t("election.placeChange")}
              </AppText>
            </ChunkyCard>
        </EnterView>

        {/* When */}
        <EnterView index={4} style={styles.block}>
          {mode === "check" ? (
            <>
              <AppText variant="heading">{t("election.dateTitle")}</AppText>
              <ChunkyCard style={styles.wheels}>
                <View style={styles.wheelRow}>
                  <WheelPicker
                    key={`d-${year}-${month}`}
                    items={days}
                    selectedIndex={Math.min(day, days.length) - 1}
                    onChange={(i) => setDay(days[i].value)}
                    width={64}
                  />
                  <WheelPicker items={months} selectedIndex={month - 1} onChange={(i) => setMonth(months[i].value)} width={84} />
                  <WheelPicker items={years} selectedIndex={year - ty} onChange={(i) => setYear(years[i].value)} width={92} />
                </View>
                <AppText variant="bodySmall" center color={dateValid ? colors.star[200] : colors.semantic.error}>
                  {formatDayMonthYear(locale, date)}
                </AppText>
              </ChunkyCard>
            </>
          ) : (
            <>
              <AppText variant="heading">{t("election.rangeTitle")}</AppText>
              <ChunkyCard style={styles.wheels}>
                <View style={styles.rangeRow}>
                  <View style={styles.rangeCol}>
                    <AppText variant="label" center color={colors.text.tertiary}>
                      {t("election.rangeFrom")}
                    </AppText>
                    <View style={styles.wheelRow}>
                      <WheelPicker items={months} selectedIndex={fromM - 1} onChange={(i) => setFromM(months[i].value)} width={64} />
                      <WheelPicker items={years} selectedIndex={fromY - ty} onChange={(i) => setFromY(years[i].value)} width={76} />
                    </View>
                  </View>
                  <View style={styles.rangeCol}>
                    <AppText variant="label" center color={colors.text.tertiary}>
                      {t("election.rangeTo")}
                    </AppText>
                    <View style={styles.wheelRow}>
                      <WheelPicker items={months} selectedIndex={toM - 1} onChange={(i) => setToM(months[i].value)} width={64} />
                      <WheelPicker items={years} selectedIndex={toY - ty} onChange={(i) => setToY(years[i].value)} width={76} />
                    </View>
                  </View>
                </View>
                <AppText variant="bodySmall" center color={rangeValid ? colors.star[200] : colors.semantic.error}>
                  {rangeValid
                    ? `${formatMonthYear(locale, ym(fromY, fromM))} – ${formatMonthYear(locale, ym(toY, toM))} · ${t("election.rangeNote")}`
                    : t("election.rangeInvalid")}
                </AppText>
              </ChunkyCard>
            </>
          )}
        </EnterView>

        {!hasEvent ? (
          <AppText variant="bodySmall" center color={colors.text.tertiary}>
            {t("election.pickEvent")}
          </AppText>
        ) : null}
        <ChunkyButton
          label={mode === "check" ? t("election.cta") : t("election.ctaSearch")}
          disabled={!ready}
          onPress={onSubmit}
          icon={
            mode === "search" && !isPremium ? (
              <Ionicons name="lock-closed" size={16} color={palette.primary.on} />
            ) : undefined
          }
        />

        {recent.length ? (
          <View style={styles.block}>
            <AppText variant="label" color={colors.text.tertiary}>
              {t("election.recent")}
            </AppText>
            {recent.map((r) => (
                <ChunkyCard
                  key={r.askedAt}
                  style={styles.recentRow}
                  onPress={() => submit(r.query)}
                  accessibilityLabel={`${eventName(r.query)}, ${r.query.place.name}`}
                >
                  <Ionicons
                    name={r.query.mode === "check" ? "calendar-outline" : "search-outline"}
                    size={16}
                    color={colors.star[300]}
                  />
                  <View style={styles.placeText}>
                    <AppText variant="heading" numberOfLines={1}>
                      {eventName(r.query)}
                    </AppText>
                    <AppText variant="bodySmall" numberOfLines={1}>
                      {r.query.mode === "check"
                        ? formatDayMonthYear(locale, r.query.date)
                        : `${formatMonthYear(locale, r.query.from)} – ${formatMonthYear(locale, r.query.to)}`}
                      {" · "}
                      {r.query.place.name}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </ChunkyCard>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <PlaceSheet
        visible={placeOpen}
        birthPlace={birthPlace}
        onClose={() => setPlaceOpen(false)}
        onPick={setPlace}
      />
      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 80,
    gap: spacing.xl,
  },
  header: { gap: spacing.xs },
  cameo: { marginTop: spacing.sm },
  block: { gap: spacing.md },
  group: { gap: spacing.sm },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
  },
  input: {
    minHeight: 56,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.sm + 1,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: typography.heading.fontSize,
  },
  placeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  placeText: { flex: 1, minWidth: 0, gap: 2 },
  wheels: {
    gap: spacing.md,
    alignItems: "center",
  },
  wheelRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  rangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.lg,
  },
  rangeCol: { gap: spacing.xs },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
});
