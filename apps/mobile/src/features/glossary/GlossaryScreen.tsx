import React, { useMemo, useState } from "react";
import { StyleSheet, View, ScrollView, TextInput } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { StateView } from "../../components/ui/StateView";
import { BackButton } from "../../components/ui/BackButton";
import { EnterView, layoutAnim } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import { GLOSSARY, GlossaryTermId, termText } from "../../lib/glossary";
import { colors, depth, spacing, radii, fonts, palette, surface, typography } from "../../lib/design-system";
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
          <AppText variant="label" color={colors.text.accent}>
            {t("glossary.ui.screenEyebrow")}
          </AppText>
          <AppText variant="title">{t("glossary.ui.screenTitle")}</AppText>
          <AsterCameo text={t("glossary.ui.screenSub")} size={56} style={styles.cameo} />
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
            accessibilityLabel={t("glossary.ui.searchPlaceholder")}
          />
        </EnterView>

        {items.length === 0 ? (
          <StateView
            kind="empty"
            compact
            message={t("glossary.ui.noResults")}
            actionLabel={t("glossary.ui.clearSearch")}
            onAction={() => setQuery("")}
          />
        ) : null}

        {items.map((e, i) => {
          const isOpen = open === e.id;
          return (
            <EnterView key={e.id} index={i + 2}>
              <Animated.View layout={layoutAnim(reduced)}>
                <ChunkyCard padded={false}>
                  <PressableScale
                    onPress={() => setOpen(isOpen ? null : e.id)}
                    scaleTo={0.98}
                    style={styles.row}
                    accessibilityRole="button"
                    accessibilityLabel={termText(t, e.id, "title")}
                    accessibilityState={{ expanded: isOpen }}
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
                </ChunkyCard>
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
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: surface.raised,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.sm + 1,
    borderBottomColor: surface.slab,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    alignSelf: "stretch",
    color: colors.text.primary,
    fontFamily: fonts.sans,
    fontSize: typography.body.fontSize,
  },
  cameo: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.lg,
  },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: palette.star.soft,
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
