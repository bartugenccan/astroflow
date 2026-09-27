import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { BackButton } from "../../components/ui/BackButton";
import { EnterView } from "../../lib/motion";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { WheelPicker, WheelItem } from "../../components/ui/WheelPicker";
import { searchCities } from "../../services/mock/cities";
import { searchCitiesRemote } from "../../services/geocoding";
import { astrologyApi } from "../../services/astrologyApi";
import { City } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, fonts } from "../../lib/design-system";

const MONTHS: Record<string, string[]> = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  tr: [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ],
};
const YEAR_MIN = 1940;
const YEAR_MAX = 2020;

function cityLabel(c: City): string {
  const region = c.admin1 && c.admin1 !== c.name ? `, ${c.admin1}` : "";
  return `${c.name}${region}, ${c.country}`;
}

export function AddPersonScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [name, setName] = useState("");
  const [year, setYear] = useState(2000);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(15);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [unknown, setUnknown] = useState(false);

  const [city, setCity] = useState<City | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>(() => searchCities(""));
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // The place search sits at the bottom of a long form. When it's focused we
  // scroll it to the top of the viewport so the field and its results stay
  // above the keyboard, however few results there are.
  const scrollRef = useRef<ScrollView>(null);
  const placeY = useRef(0);
  const revealPlace = () => {
    // Wait a beat for the keyboard to start opening and the view to resize.
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, placeY.current - spacing.md),
        animated: true,
      });
    }, 150);
  };

  const years: WheelItem[] = useMemo(
    () =>
      Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => ({
        label: String(YEAR_MIN + i),
        value: YEAR_MIN + i,
      })),
    [],
  );
  const months: WheelItem[] = useMemo(
    () =>
      (MONTHS[locale] ?? MONTHS.en).map((m, i) => ({ label: m, value: i + 1 })),
    [locale],
  );
  const days: WheelItem[] = useMemo(() => {
    const n = new Date(year, month, 0).getDate();
    return Array.from({ length: n }, (_, i) => ({
      label: String(i + 1),
      value: i + 1,
    }));
  }, [month, year]);
  const hours: WheelItem[] = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        label: String(i).padStart(2, "0"),
        value: i,
      })),
    [],
  );
  const minutes: WheelItem[] = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        label: String(i).padStart(2, "0"),
        value: i,
      })),
    [],
  );

  useEffect(() => {
    const q = query.trim();
    if (city && query === cityLabel(city)) return;
    if (q.length < 2) {
      setResults(searchCities(""));
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        setResults(await searchCitiesRemote(q, locale));
      } catch {
        setResults(searchCities(q));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, locale, city]);

  const canSave = name.trim().length > 0 && !!city;

  const onSave = async () => {
    if (!canSave || !city) return;
    setSaving(true);
    try {
      const mm = String(month).padStart(2, "0");
      const dd = String(Math.min(day, days.length)).padStart(2, "0");
      const person = await astrologyApi.savePerson({
        label: name.trim(),
        birthDate: `${year}-${mm}-${dd}`,
        birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        latitude: city.lat,
        longitude: city.lon,
        unknownTime: unknown,
        placeName: cityLabel(city),
      });
      router.replace(`/compatibility/${person.id}` as Href);
    } catch {
      setSaving(false);
    }
  };

  const dayIndex = Math.min(day, days.length) - 1;
  const citySelected = !!city && query === cityLabel(city);

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
        <AppText variant="heading" numberOfLines={1} style={styles.topTitle}>
          {t("compatibility.addTitle")}
        </AppText>
        <View style={styles.topSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <EnterView index={0} style={styles.field}>
            <AppText variant="label" color={colors.text.gold}>
              {t("compatibility.nameLabel")}
            </AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("compatibility.namePlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              autoCorrect={false}
            />
          </EnterView>

          {/* Date */}
          <EnterView index={1} style={styles.field}>
            <AppText variant="label" color={colors.text.gold}>
              {t("compatibility.birthDateQ")}
            </AppText>
            <View style={styles.wheelRow}>
              <WheelPicker
                items={days}
                selectedIndex={dayIndex}
                onChange={(i) => setDay(days[i].value)}
                width={64}
              />
              <WheelPicker
                items={months}
                selectedIndex={month - 1}
                onChange={(i) => setMonth(months[i].value)}
                width={90}
              />
              <WheelPicker
                items={years}
                selectedIndex={year - YEAR_MIN}
                onChange={(i) => setYear(years[i].value)}
                width={92}
              />
            </View>
          </EnterView>

          {/* Time */}
          <EnterView index={2} style={styles.field}>
            <AppText variant="label" color={colors.text.gold}>
              {t("compatibility.birthTimeQ")}
            </AppText>
            {!unknown ? (
              <View style={styles.wheelRow}>
                <WheelPicker
                  items={hours}
                  selectedIndex={hour}
                  onChange={(i) => setHour(hours[i].value)}
                  width={80}
                />
                <AppText variant="display" color={colors.text.tertiary}>
                  :
                </AppText>
                <WheelPicker
                  items={minutes}
                  selectedIndex={minute}
                  onChange={(i) => setMinute(minutes[i].value)}
                  width={80}
                />
              </View>
            ) : null}
            <PressableScale
              onPress={() => setUnknown((u) => !u)}
              style={styles.unknownRow}
              scaleTo={0.97}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: unknown }}
            >
              <Ionicons
                name={unknown ? "checkbox" : "square-outline"}
                size={20}
                color={unknown ? colors.gold[300] : colors.text.tertiary}
              />
              <AppText
                variant="body"
                color={colors.text.secondary}
                style={styles.shrink}
              >
                {t("compatibility.unknownTime")}
              </AppText>
            </PressableScale>
          </EnterView>

          {/* Place */}
          <View onLayout={(e) => (placeY.current = e.nativeEvent.layout.y)}>
            <EnterView index={3} style={styles.field}>
              <AppText variant="label" color={colors.text.gold}>
                {t("compatibility.birthPlaceQ")}
              </AppText>
              <View style={styles.searchField}>
                <Ionicons
                  name="search"
                  size={18}
                  color={colors.text.tertiary}
                />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onFocus={revealPlace}
                  placeholder={t("onboarding.placeSearchPlaceholder")}
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.searchInput}
                  autoCorrect={false}
                />
                {searching ? <CelestialLoader size="sm" /> : null}
              </View>
              {!citySelected ? (
                // Fixed minimum height: the area doesn't collapse while typing, so
                // the form below (and the field itself) never jumps.
                <View style={styles.results}>
                  {!searching &&
                  query.trim().length >= 2 &&
                  results.length === 0 ? (
                    <AppText
                      variant="body"
                      color={colors.text.tertiary}
                      style={styles.noResults}
                    >
                      {t("onboarding.placeNoResults")}
                    </AppText>
                  ) : null}
                  {results.slice(0, 6).map((c, i) => (
                    <EnterView key={c.id} index={i} distance={6}>
                      <PressableScale
                        onPress={() => {
                          setCity(c);
                          setQuery(cityLabel(c));
                        }}
                        style={styles.cityRow}
                        scaleTo={0.98}
                        accessibilityRole="button"
                      >
                        <AppText variant="heading" numberOfLines={2}>
                          {c.name}
                        </AppText>
                        <AppText variant="bodySmall" numberOfLines={2}>
                          {c.admin1 && c.admin1 !== c.name
                            ? `${c.admin1} · ${c.country}`
                            : c.country}
                        </AppText>
                      </PressableScale>
                    </EnterView>
                  ))}
                </View>
              ) : null}
            </EnterView>
          </View>

          <GoldButton
            label={t("compatibility.save")}
            onPress={onSave}
            loading={saving}
            disabled={!canSave}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  topSpacer: {
    width: 32,
  },
  shrink: {
    flexShrink: 1,
  },
  flex: {
    flex: 1,
  },
  noResults: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 140,
    gap: spacing.xl,
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
  wheelRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  unknownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
    paddingHorizontal: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
  results: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    minHeight: 200,
  },
  cityRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
});
