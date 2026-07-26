import React from "react";
import { StyleSheet, View, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { GoldButton } from "../../components/ui/GoldButton";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { Glyph } from "../../components/Glyph";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

export function CompatibilityListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const people = useAsync(() => astrologyApi.listPeople(), []);

  // Refresh when returning from the add flow.
  useFocusEffect(
    React.useCallback(() => {
      people.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const confirmDelete = (id: string) => {
    Alert.alert(t("compatibility.deleteConfirm"), undefined, [
      { text: t("compatibility.cancel"), style: "cancel" },
      {
        text: t("compatibility.delete"),
        style: "destructive",
        onPress: async () => {
          await astrologyApi.deletePerson(id);
          people.reload();
        },
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="label" color={colors.text.gold}>
            {t("compatibility.eyebrow")}
          </AppText>
          <AppText variant="title">{t("compatibility.title")}</AppText>
          <AppText variant="body" style={styles.subtitle}>
            {t("compatibility.subtitle")}
          </AppText>
        </View>

        <GoldButton
          label={t("compatibility.addPerson")}
          onPress={() => router.push("/compatibility/add")}
          icon={<Ionicons name="add" size={18} color={colors.text.onGold} />}
        />

        {people.loading ? (
          <View style={styles.loaderBox}>
            <CelestialLoader size="sm" />
          </View>
        ) : people.data && people.data.length > 0 ? (
          <View style={styles.list}>
            {people.data.map((p, i) => (
              <MotiView
                key={p.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 300, delay: i * 70 }}
              >
                <Pressable
                  onPress={() => router.push(`/compatibility/${p.id}` as Href)}
                >
                  <HairlineCard style={styles.personCard}>
                    <View style={styles.personGlyph}>
                      <Glyph name={p.sunSign} size={24} color={colors.gold[300]} />
                    </View>
                    <View style={styles.personInfo}>
                      <AppText variant="heading">{p.label}</AppText>
                      <AppText variant="bodySmall">
                        {t(`signs.${p.sunSign}` as never)} · {p.birthDate}
                      </AppText>
                    </View>
                    <Pressable hitSlop={10} onPress={() => confirmDelete(p.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
                    </Pressable>
                  </HairlineCard>
                </Pressable>
              </MotiView>
            ))}
          </View>
        ) : (
          <HairlineCard>
            <AppText variant="body" center>
              {t("compatibility.noPeople")}
            </AppText>
          </HairlineCard>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  loaderBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  personGlyph: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
});
