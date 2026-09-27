import React from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { useRouter, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { GoldButton } from "../../components/ui/GoldButton";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { PressableScale } from "../../components/ui/PressableScale";
import { BackButton } from "../../components/ui/BackButton";
import { TermInfo } from "../../components/TermInfo";
import { Glyph } from "../../components/Glyph";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { useTranslation } from "../../i18n";
import { EnterView } from "../../lib/motion";
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
      <View style={styles.topBar}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.header}>
          <View style={styles.eyebrowRow}>
            <AppText variant="label" color={colors.text.gold} style={styles.shrink}>
              {t("compatibility.eyebrow")}
            </AppText>
            <TermInfo term="synastry" size={14} />
          </View>
          <AppText variant="title">{t("compatibility.title")}</AppText>
          <AppText variant="body" style={styles.subtitle}>
            {t("compatibility.subtitle")}
          </AppText>
        </EnterView>

        <EnterView index={1}>
          <GoldButton
            label={t("compatibility.addPerson")}
            onPress={() => router.push("/compatibility/add")}
            icon={<Ionicons name="add" size={18} color={colors.text.onGold} />}
          />
        </EnterView>

        {people.loading ? (
          <View style={styles.loaderBox}>
            <CelestialLoader size="sm" />
          </View>
        ) : people.data && people.data.length > 0 ? (
          <View style={styles.list}>
            <EnterView index={2}>
              <AppText variant="label" color={colors.text.gold}>
                {t("compatibility.peopleTitle")}
              </AppText>
            </EnterView>
            {people.data.map((p, i) => (
              <EnterView key={p.id} index={i} delay={180}>
                <PressableScale
                  scaleTo={0.98}
                  accessibilityRole="button"
                  onPress={() => router.push(`/compatibility/${p.id}` as Href)}
                >
                  <HairlineCard style={styles.personCard}>
                    <View style={styles.personGlyph}>
                      <Glyph name={p.sunSign} size={24} color={colors.gold[300]} />
                    </View>
                    <View style={styles.personInfo}>
                      <AppText variant="heading" numberOfLines={2}>
                        {p.label}
                      </AppText>
                      <AppText variant="bodySmall" numberOfLines={2}>
                        {t(`signs.${p.sunSign}` as never)} · {p.birthDate}
                      </AppText>
                    </View>
                    <PressableScale
                      hitSlop={10}
                      scaleTo={0.85}
                      haptic="light"
                      style={styles.trash}
                      accessibilityRole="button"
                      accessibilityLabel={t("compatibility.delete")}
                      onPress={() => confirmDelete(p.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
                    </PressableScale>
                    <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                  </HairlineCard>
                </PressableScale>
              </EnterView>
            ))}
          </View>
        ) : (
          <EnterView index={2}>
            <HairlineCard style={styles.emptyCard}>
              <Ionicons name="people-outline" size={26} color={colors.gold[300]} />
              <AppText variant="body" center>
                {t("compatibility.noPeople")}
              </AppText>
            </HairlineCard>
          </EnterView>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  shrink: {
    flexShrink: 1,
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
    minWidth: 0,
    gap: 2,
  },
  trash: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
});
