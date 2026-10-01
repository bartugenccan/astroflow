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
import { colors, fonts, radii, spacing } from "../../lib/design-system";

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
          />
          {searching ? <CelestialLoader size="sm" /> : null}
        </View>

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {birthPlace ? (
            <PressableScale onPress={() => pick(birthPlace)} scaleTo={0.98} style={styles.row}>
              <Ionicons name="home-outline" size={18} color={colors.gold[300]} />
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
            >
              <Ionicons name="location-outline" size={18} color={colors.text.tertiary} />
              <AppText variant="body" color={colors.text.primary} numberOfLines={1} style={styles.rowText}>
                {cityLabel(c)}
              </AppText>
            </PressableScale>
          ))}
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
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
  list: {
    maxHeight: 340,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
});
