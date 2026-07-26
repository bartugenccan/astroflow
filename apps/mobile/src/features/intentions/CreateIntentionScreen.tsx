import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, TextInput, Pressable } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { GoldButton } from "../../components/ui/GoldButton";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { DotRating } from "../../components/ui/DotRating";
import { astrologyApi } from "../../services/astrologyApi";
import { IntentionSuggestion, LifeArea } from "../../services/types";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing, radii, fonts } from "../../lib/design-system";

const PRESETS: { key: string; area: LifeArea }[] = [
  { key: "strength", area: "energy" },
  { key: "reading", area: "career" },
  { key: "calm", area: "energy" },
  { key: "confidence", area: "energy" },
  { key: "love", area: "love" },
  { key: "money", area: "money" },
];

export function CreateIntentionScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const dto = useBirthDto();

  const [suggestions, setSuggestions] = useState<IntentionSuggestion[] | null>(null);
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState<string>("strength");
  const [lifeArea, setLifeArea] = useState<LifeArea>("energy");
  const [target, setTarget] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dto) return;
    astrologyApi
      .getIntentionSuggestions(dto, locale)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [dto, locale]);

  const pickSuggestion = (s: IntentionSuggestion) => {
    setGoal(s.goal);
    setLifeArea(s.lifeArea);
    setCategory(s.lifeArea);
  };

  const pickPreset = (p: { key: string; area: LifeArea }) => {
    setCategory(p.key);
    setLifeArea(p.area);
  };

  const create = async () => {
    if (!dto || !goal.trim() || saving) return;
    setSaving(true);
    try {
      const intention = await astrologyApi.createIntention(
        dto,
        { goalText: goal.trim(), category, lifeArea, dailyTarget: target },
        locale,
      );
      router.replace(`/intentions/${intention.id}` as Href);
    } catch {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text.secondary} />
        </Pressable>
        <AppText variant="heading">{t("intentions.createTitle")}</AppText>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Transit-derived suggestions */}
        <View style={styles.section}>
          <SectionHeader eyebrow={t("intentions.suggestionsTitle")} />
          {suggestions === null ? (
            <View style={styles.loaderBox}>
              <CelestialLoader size="sm" label={t("intentions.suggestionsLoading")} />
            </View>
          ) : (
            <View style={styles.suggestions}>
              {suggestions.map((s, i) => (
                <MotiView
                  key={`${s.goal}-${i}`}
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "timing", duration: 260, delay: i * 70 }}
                >
                  <Pressable onPress={() => pickSuggestion(s)}>
                    <HairlineCard
                      style={[styles.suggestion, goal === s.goal && styles.suggestionActive]}
                    >
                      <AppText variant="heading">{s.goal}</AppText>
                      <AppText variant="bodySmall" style={styles.suggestionWhy}>
                        {s.why}
                      </AppText>
                    </HairlineCard>
                  </Pressable>
                </MotiView>
              ))}
            </View>
          )}
        </View>

        {/* Goal */}
        <View style={styles.section}>
          <AppText variant="label" color={colors.text.gold}>
            {t("intentions.goalLabel")}
          </AppText>
          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder={t("intentions.goalPlaceholder")}
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
          />
          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => pickPreset(p)}
                style={[styles.preset, category === p.key && styles.presetActive]}
              >
                <AppText
                  variant="bodySmall"
                  color={category === p.key ? colors.gold[200] : colors.text.tertiary}
                >
                  {t(`intentions.categories.${p.key}` as TranslationKey)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Target */}
        <View style={styles.section}>
          <AppText variant="label" color={colors.text.gold}>
            {t("intentions.targetLabel")}
          </AppText>
          <DotRating value={target} onChange={setTarget} count={5} />
        </View>

        <GoldButton
          label={t("intentions.createCta")}
          onPress={create}
          loading={saving}
          disabled={!goal.trim()}
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
  section: { gap: spacing.md },
  loaderBox: { alignItems: "center", paddingVertical: spacing.lg },
  suggestions: { gap: spacing.md },
  suggestion: { gap: spacing.xs },
  suggestionActive: {
    borderColor: colors.gold[400],
    backgroundColor: colors.glow.goldSoft,
  },
  suggestionWhy: { marginTop: 2 },
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
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  preset: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  presetActive: {
    borderColor: colors.gold[400],
    backgroundColor: colors.glow.goldSoft,
  },
});
