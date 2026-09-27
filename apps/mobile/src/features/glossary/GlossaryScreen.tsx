import React, { useMemo, useState } from "react";
import { StyleSheet, View, ScrollView, TextInput } from "react-native";
import Animated, { LinearTransition, useReducedMotion } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { BackButton } from "../../components/ui/BackButton";
import { EnterView } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import { GLOSSARY, GlossaryTermId, termText } from "../../lib/glossary";
import { colors, spacing, radii, fonts } from "../../lib/design-system";
import { TermBody } from "./TermBody";
import { TermMark } from "./TermMark";

/**
 * Every term in one searchable place. Rows expand inline to the same layered
 * body the term sheet uses, so the glossary and the ⓘ buttons never disagree.
 */
export function GlossaryScreen() {
  const { t, locale } = useTranslation();
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<GlossaryTermId | null>(null);

  const items = useMemo(() => {
    const tag = locale === "tr" ? "tr-TR" : "en-US";
    const q = query.trim().toLocaleLowerCase(tag);
    if (!q) return GLOSSARY;
    return GLOSSARY.filter((e) =>
      `${termText(t, e.id, "title")} ${termText(t, e.id, "short")}`
        .toLocaleLowerCase(tag)
        .includes(q),
    );
  }, [query, t, locale]);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton />
        <EnterView style={styles.header}>
          <AppText variant="label" color={colors.text.gold}>
            {t("glossary.ui.screenEyebrow")}
          </AppText>
          <AppText variant="title">{t("glossary.ui.screenTitle")}</AppText>
          <AppText variant="body">{t("glossary.ui.screenSub")}</AppText>
        </EnterView>

        <EnterView index={1} style={styles.search}>
          <Ionicons name="search" size={16} color={colors.text.tertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("glossary.ui.searchPlaceholder")}
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            autoCorrect={false}
            maxFontSizeMultiplier={1.3}
          />
        </EnterView>

        {items.length === 0 ? (
          <AppText variant="bodySmall" center>
            {t("glossary.ui.noResults")}
          </AppText>
        ) : null}

        {items.map((e, i) => {
          const isOpen = open === e.id;
          return (
            <EnterView key={e.id} index={i + 2}>
              <Animated.View layout={reduced ? undefined : LinearTransition.springify().damping(18)}>
                <HairlineCard padded={false}>
                  <PressableScale
                    onPress={() => setOpen(isOpen ? null : e.id)}
                    scaleTo={0.98}
                    style={styles.row}
                  >
                    <View style={styles.glyph}>
                      <TermMark mark={e.mark} size={18} />
                    </View>
                    <View style={styles.rowText}>
                      <AppText variant="heading">{termText(t, e.id, "title")}</AppText>
                      {!isOpen ? (
                        <AppText variant="bodySmall" numberOfLines={2}>
                          {termText(t, e.id, "short")}
                        </AppText>
                      ) : null}
                    </View>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.text.tertiary}
                    />
                  </PressableScale>
                  {isOpen ? (
                    <View style={styles.body}>
                      <TermBody id={e.id} onRelated={setOpen} />
                    </View>
                  ) : null}
                </HairlineCard>
              </Animated.View>
            </EnterView>
          );
        })}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.border.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
