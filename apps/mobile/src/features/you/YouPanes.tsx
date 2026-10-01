import React, { useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { EnterView } from "../../lib/motion";
import { ReadingScreen } from "../reading/ReadingScreen";
import { CompanionPrompt } from "../companion/CompanionPrompt";
import { GuidanceSheet } from "../companion/GuidanceSheet";
import { CompatibilityList } from "../compatibility/CompatibilityListScreen";
import { ElectionCard } from "../election/ElectionCard";
import { GuidanceTopic } from "../../services/types";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

/**
 * "Your chart": Election leads (it's a headline feature, so it sits first on
 * the tab's landing section), then the written reading with the wheel one tap away.
 */
export function ChartPane() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <ReadingScreen
      headerSlot={
        <View style={styles.headerSlot}>
          <EnterView index={1} scale>
            <ElectionCard />
          </EnterView>
          <EnterView index={2}>
            <PressableScale
              onPress={() => router.push("/chart" as Href)}
              scaleTo={0.98}
              accessibilityRole="button"
            >
              <HairlineCard style={styles.wheelCard}>
                <View style={styles.wheelIcon}>
                  <Ionicons name="planet-outline" size={22} color={colors.gold[200]} />
                </View>
                <View style={styles.wheelText}>
                  <AppText variant="heading" color={colors.text.primary}>
                    {t("you.wheelCardTitle")}
                  </AppText>
                  <AppText variant="bodySmall">{t("you.wheelCardSub")}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </HairlineCard>
            </PressableScale>
          </EnterView>
        </View>
      }
    />
  );
}

/** "Ask": topic chips answer in a sheet; "Talk to Aster" opens the chat. */
export function AskPane() {
  const { t } = useTranslation();
  const dto = useBirthDto();
  const [topic, setTopic] = useState<GuidanceTopic | null>(null);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.header}>
          <AppText variant="label" color={colors.text.gold}>
            {t("companion.name")}
          </AppText>
          <AppText variant="title">{t("companion.whatsOnYourMind")}</AppText>
          <AppText variant="body">{t("you.askIntro")}</AppText>
        </EnterView>
        <EnterView index={1}>
          <CompanionPrompt onSelectTopic={setTopic} />
        </EnterView>
      </ScrollView>
      {/* Sheet at the pane root, never inside the ScrollView. */}
      <GuidanceSheet topic={topic} dto={dto} onClose={() => setTopic(null)} />
    </View>
  );
}

/** "Match": compatibility — saved people and "Add a person". */
export function MatchPane() {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <CompatibilityList />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerSlot: {
    gap: spacing.lg,
  },
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 140,
    gap: spacing.xl,
  },
  header: { gap: spacing.xs },
  wheelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  wheelIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.glow.goldSoft,
  },
  wheelText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
