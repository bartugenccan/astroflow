import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { OnboardingFrame } from "./OnboardingFrame";
import { AppText } from "../../components/ui/AppText";
import { searchCities } from "../../services/mock/cities";
import { searchCitiesRemote } from "../../services/geocoding";
import { City } from "../../services/types";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, fonts } from "../../lib/design-system";

function cityLabel(c: City): string {
  const region = c.admin1 && c.admin1 !== c.name ? `, ${c.admin1}` : "";
  return `${c.name}${region}, ${c.country}`;
}

export function BirthPlaceScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const city = useOnboardingDraft((s) => s.city);
  const setCity = useOnboardingDraft((s) => s.setCity);
  const setManualCoords = useOnboardingDraft((s) => s.setManualCoords);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>(() => searchCities(""));
  const [searching, setSearching] = useState(false);
  const [offline, setOffline] = useState(false);
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  // Debounced live geocoding, with an offline fallback to the bundled list.
  useEffect(() => {
    if (manual) return;
    const q = query.trim();
    if (city && query === cityLabel(city)) return; // don't re-search the picked label
    if (q.length < 2) {
      setResults(searchCities(""));
      setSearching(false);
      setOffline(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const r = await searchCitiesRemote(q, locale);
        setResults(r);
        setOffline(false);
      } catch {
        setResults(searchCities(q));
        setOffline(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, manual, locale, city]);

  const selectCity = (c: City) => {
    setCity(c);
    setQuery(cityLabel(c));
  };

  const manualValid =
    manual &&
    !Number.isNaN(parseFloat(lat)) &&
    !Number.isNaN(parseFloat(lon)) &&
    Math.abs(parseFloat(lat)) <= 90 &&
    Math.abs(parseFloat(lon)) <= 180;

  const citySelected = !!city && query === cityLabel(city);
  const canContinue = manual ? manualValid : citySelected;

  const onNext = () => {
    if (manual && manualValid) {
      setManualCoords(parseFloat(lat), parseFloat(lon));
    }
    router.push("/reveal");
  };

  const showNoResults = !searching && query.trim().length >= 2 && results.length === 0;

  return (
    <OnboardingFrame
      step={2}
      question={t("onboarding.placeQuestion")}
      hint={t("onboarding.placeHint")}
      ctaLabel={t("common.continue")}
      onNext={onNext}
      nextDisabled={!canContinue}
    >
      {!manual ? (
        <View style={styles.flex}>
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
            {searching ? (
              <ActivityIndicator size="small" color={colors.gold[300]} />
            ) : null}
          </View>

          {offline ? (
            <AppText variant="bodySmall" color={colors.text.tertiary} style={styles.note}>
              {t("onboarding.placeOffline")}
            </AppText>
          ) : null}

          <ScrollView
            style={styles.results}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {showNoResults ? (
              <AppText variant="body" color={colors.text.tertiary} style={styles.empty}>
                {t("onboarding.placeNoResults")}
              </AppText>
            ) : (
              results.map((c, i) => {
                const selected = city?.id === c.id;
                const subtitle =
                  c.admin1 && c.admin1 !== c.name ? `${c.admin1} · ${c.country}` : c.country;
                return (
                  <MotiView
                    key={c.id}
                    from={{ opacity: 0, translateY: 8 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 240, delay: Math.min(i, 8) * 35 }}
                  >
                    <Pressable
                      onPress={() => selectCity(c)}
                      style={[styles.cityRow, selected && styles.cityRowSelected]}
                    >
                      <View style={styles.cityText}>
                        <AppText variant="heading" color={colors.text.primary}>
                          {c.name}
                        </AppText>
                        <AppText variant="bodySmall" numberOfLines={1}>
                          {subtitle}
                        </AppText>
                      </View>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.gold[300]} />
                      ) : null}
                    </Pressable>
                  </MotiView>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.manualWrap}>
          <View style={styles.coordField}>
            <AppText variant="label" color={colors.text.gold}>
              {t("onboarding.latitude")}
            </AppText>
            <TextInput
              value={lat}
              onChangeText={setLat}
              placeholder="41.0082"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="numbers-and-punctuation"
              style={styles.coordInput}
            />
          </View>
          <View style={styles.coordField}>
            <AppText variant="label" color={colors.text.gold}>
              {t("onboarding.longitude")}
            </AppText>
            <TextInput
              value={lon}
              onChangeText={setLon}
              placeholder="28.9784"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="numbers-and-punctuation"
              style={styles.coordInput}
            />
          </View>
        </View>
      )}

      <Pressable onPress={() => setManual((m) => !m)} style={styles.toggle}>
        <Ionicons
          name={manual ? "search" : "location-outline"}
          size={16}
          color={colors.gold[300]}
        />
        <AppText variant="bodySmall" color={colors.gold[300]}>
          {manual ? t("onboarding.placeSearchPlaceholder") : t("onboarding.manualCoords")}
        </AppText>
      </Pressable>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  note: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  results: {
    marginTop: spacing.md,
    maxHeight: 260,
  },
  empty: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  cityText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cityRowSelected: {
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  manualWrap: {
    gap: spacing.lg,
  },
  coordField: {
    gap: spacing.sm,
  },
  coordInput: {
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
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
