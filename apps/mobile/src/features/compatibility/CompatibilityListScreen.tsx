import React from "react";
import { runAfterTransition } from "../../lib/afterInteractions";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { useRouter, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { IconButton } from "../../components/ui/IconButton";
import { StateView } from "../../components/ui/StateView";
import { BackButton } from "../../components/ui/BackButton";
import { TermInfo } from "../../components/TermInfo";
import { Glyph } from "../../components/Glyph";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { useTranslation } from "../../i18n";
import { EnterView } from "../../lib/motion";
import { formatDayMonthYear } from "../../lib/dates";
import { colors, palette, spacing, radii } from "../../lib/design-system";

/**
 * Compatibility home: what it is, "Add a person", and the saved people. No
 * screen chrome or ScrollView — it renders on `/compatibility` and inside the
 * "For You" tab's Match section.
 */
export function CompatibilityList() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const people = useAsync(() => astrologyApi.listPeople(), []);

  // Refresh when returning from the add flow.
  useFocusEffect(
    React.useCallback(
      () => runAfterTransition(people.reload),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),
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
    <View style={styles.wrap}>
      <EnterView style={styles.header}>
        <View style={styles.eyebrowRow}>
          <AppText
            variant="label"
            color={colors.text.accent}
            style={styles.shrink}
          >
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
        <ChunkyButton
          label={t("compatibility.addPerson")}
          onPress={() => router.push("/compatibility/add")}
          icon={<Ionicons name="add" size={18} color={colors.text.onPrimary} />}
        />
      </EnterView>

      {people.loading && !people.data ? (
        <StateView kind="loading" compact />
      ) : people.error && !people.data ? (
        <StateView
          kind="error"
          compact
          message={t("profileUi.compat.loadError")}
          onAction={people.reload}
        />
      ) : people.data && people.data.length > 0 ? (
        <View style={styles.list}>
          <EnterView index={2}>
            <AppText variant="label" color={colors.text.accent}>
              {t("compatibility.peopleTitle")}
            </AppText>
          </EnterView>
          {people.data.map((p, i) => (
            <EnterView key={p.id} index={i} delay={180}>
              <ChunkyCard
                style={styles.personCard}
                onPress={() => router.push(`/compatibility/${p.id}` as Href)}
                accessibilityLabel={`${p.label}, ${t(`signs.${p.sunSign}` as never)}`}
              >
                  <View style={styles.personGlyph}>
                    <Glyph
                      name={p.sunSign}
                      size={24}
                      color={palette.candy.on}
                    />
                  </View>
                  <View style={styles.personInfo}>
                    <AppText variant="heading" numberOfLines={2}>
                      {p.label}
                    </AppText>
                    <AppText variant="bodySmall" numberOfLines={2}>
                      {t(`signs.${p.sunSign}` as never)} ·{" "}
                      {formatDayMonthYear(locale, p.birthDate)}
                    </AppText>
                  </View>
                  <IconButton
                    icon="trash-outline"
                    size={40}
                    onPress={() => confirmDelete(p.id)}
                    accessibilityLabel={`${t("compatibility.delete")}: ${p.label}`}
                  />
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.text.tertiary}
                  />
              </ChunkyCard>
            </EnterView>
          ))}
        </View>
      ) : (
        <EnterView index={2}>
          <ChunkyCard>
            <StateView
              kind="empty"
              compact
              message={t("profileUi.compat.emptyTitle")}
              detail={t("profileUi.compat.emptyDetail")}
              actionLabel={t("compatibility.addPerson")}
              onAction={() => router.push("/compatibility/add")}
            />
          </ChunkyCard>
        </EnterView>
      )}
    </View>
  );
}

/** `/compatibility` — the same list on its own screen, with a back button. */
export function CompatibilityListScreen() {
  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <CompatibilityList />
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
  wrap: {
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
    backgroundColor: palette.candy.face,
  },
  personInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
