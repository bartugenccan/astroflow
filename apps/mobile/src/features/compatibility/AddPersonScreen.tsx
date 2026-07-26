import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, TextInput, Pressable, ScrollView } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { WheelPicker, WheelItem } from "../../components/ui/WheelPicker";
import { searchCities } from "../../services/mock/cities";
import { searchCitiesRemote } from "../../services/geocoding";
import { astrologyApi } from "../../services/astrologyApi";
import { City } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, fonts } from "../../lib/design-system";

const MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
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

  const years: WheelItem[] = useMemo(
    () => Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => ({ label: String(YEAR_MIN + i), value: YEAR_MIN + i })),
    [],
  );
  const months: WheelItem[] = useMemo(
    () => (MONTHS[locale] ?? MONTHS.en).map((m, i) => ({ label: m, value: i + 1 })),
    [locale],
  );
  const days: WheelItem[] = useMemo(() => {
    const n = new Date(year, month, 0).getDate();
    return Array.from({ length: n }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
  }, [month, year]);
  const hours: WheelItem[] = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ label: String(i).padStart(2, "0"), value: i })),
    [],
  );
  const minutes: WheelItem[] = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ label: String(i).padStart(2, "0"), value: i })),
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
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text.secondary} />
        </Pressable>
        <AppText variant="heading">{t("compatibility.addTitle")}</AppText>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={styles.field}>
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
        </View>

        {/* Date */}
        <View style={styles.field}>
          <AppText variant="label" color={colors.text.gold}>
            {t("compatibility.birthDateQ")}
          </AppText>
          <View style={styles.wheelRow}>
            <WheelPicker items={days} selectedIndex={dayIndex} onChange={(i) => setDay(days[i].value)} width={64} />
            <WheelPicker items={months} selectedIndex={month - 1} onChange={(i) => setMonth(months[i].value)} width={90} />
            <WheelPicker items={years} selectedIndex={year - YEAR_MIN} onChange={(i) => setYear(years[i].value)} width={92} />
          </View>
        </View>

        {/* Time */}
        <View style={styles.field}>
          <AppText variant="label" color={colors.text.gold}>
            {t("compatibility.birthTimeQ")}
          </AppText>
          {!unknown ? (
            <View style={styles.wheelRow}>
              <WheelPicker items={hours} selectedIndex={hour} onChange={(i) => setHour(hours[i].value)} width={80} />
              <AppText variant="display" color={colors.text.tertiary}>:</AppText>
              <WheelPicker items={minutes} selectedIndex={minute} onChange={(i) => setMinute(minutes[i].value)} width={80} />
            </View>
          ) : null}
          <Pressable onPress={() => setUnknown((u) => !u)} style={styles.unknownRow}>
            <Ionicons
              name={unknown ? "checkbox" : "square-outline"}
              size={20}
              color={unknown ? colors.gold[300] : colors.text.tertiary}
            />
            <AppText variant="body" color={colors.text.secondary}>
              {t("compatibility.unknownTime")}
            </AppText>
          </Pressable>
        </View>

        {/* Place */}
        <View style={styles.field}>
          <AppText variant="label" color={colors.text.gold}>
            {t("compatibility.birthPlaceQ")}
          </AppText>
          <View style={styles.searchField}>
            <Ionicons name="search" size={18} color={colors.text.tertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("onboarding.placeSearchPlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              style={styles.searchInput}
              autoCorrect={false}
            />
            {searching ? <CelestialLoader size="sm" /> : null}
          </View>
          {!citySelected ? (
            <View style={styles.results}>
              {results.slice(0, 6).map((c, i) => (
                <MotiView
                  key={c.id}
                  from={{ opacity: 0, translateY: 6 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "timing", duration: 200, delay: Math.min(i, 6) * 30 }}
                >
                  <Pressable
                    onPress={() => {
                      setCity(c);
                      setQuery(cityLabel(c));
                    }}
                    style={styles.cityRow}
                  >
                    <AppText variant="heading">{c.name}</AppText>
                    <AppText variant="bodySmall" numberOfLines={1}>
                      {c.admin1 && c.admin1 !== c.name ? `${c.admin1} · ${c.country}` : c.country}
                    </AppText>
                  </Pressable>
                </MotiView>
              ))}
            </View>
          ) : null}
        </View>

        <GoldButton
          label={t("compatibility.save")}
          onPress={onSave}
          loading={saving}
          disabled={!canSave}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
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
