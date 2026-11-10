import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { searchCities } from "../../services/mock/cities";
import { searchCitiesRemote } from "../../services/geocoding";
import type { City, ElectionPlace } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, depth, fonts, radii, spacing, surface, typography } from "../../lib/design-system";
import { StateView } from "../../components/ui/StateView";

interface Props {
  visible: boolean;
  birthPlace: ElectionPlace | null;
  onClose: () => void;
  onPick: (place: ElectionPlace) => void;
}

const cityLabel = (c: City) => {
  const region = c.admin1 && c.admin1 !== c.name ? `, ${c.admin1}` : "";
  return `${c.name}${region}, ${c.country}`;
};

/** Where the event happens — the hours are cast for this city. Live geocoding, bundled list offline. */
export function PlaceSheet({ visible, birthPlace, onClose, onPick }: Props) {
  const { t, locale } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>(() => searchCities(""));
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
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
  }, [query, locale]);

  const pick = (place: ElectionPlace) => {
    onPick(place);
    setQuery("");
    onClose();
  };

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("election.placeTitle")}>
      <View style={styles.body}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.text.tertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("election.placeSearch")}
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            autoCorrect={false}
            accessibilityLabel={t("election.placeSearch")}
          />
          {searching ? <CelestialLoader size="sm" /> : null}
        </View>

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {birthPlace ? (
            <PressableScale
              onPress={() => pick(birthPlace)}
              scaleTo={0.98}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={`${t("election.placeUseBirth")}: ${birthPlace.name}`}
            >
              <Ionicons name="home-outline" size={18} color={colors.star[300]} />
              <View style={styles.rowText}>
                <AppText variant="heading" numberOfLines={1}>
                  {t("election.placeUseBirth")}
                </AppText>
                <AppText variant="bodySmall" numberOfLines={1}>
                  {birthPlace.name}
                </AppText>
              </View>
            </PressableScale>
          ) : null}
          {results.map((c) => (
            <PressableScale
              key={c.id}
              onPress={() => pick({ name: c.name, latitude: c.lat, longitude: c.lon })}
              scaleTo={0.98}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={cityLabel(c)}
            >
              <Ionicons name="location-outline" size={18} color={colors.text.tertiary} />
              <AppText variant="body" color={colors.text.primary} numberOfLines={1} style={styles.rowText}>
                {cityLabel(c)}
              </AppText>
            </PressableScale>
          ))}
          {!searching && query.trim().length >= 2 && results.length === 0 ? (
            <StateView kind="empty" compact message={t("onboarding.placeNoResults")} />
          ) : null}
        </ScrollView>
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.sm + 1,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: typography.heading.fontSize,
  },
  list: {
    maxHeight: 340,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
});
