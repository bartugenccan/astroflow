import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ReadingPage } from "../../components/ReadingPage";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { StateView } from "../../components/ui/StateView";
import { ShareButton } from "../../components/ui/ShareButton";
import { ShareCardModal } from "../share/ShareCardModal";
import type { ShareCardData } from "../share/ShareableCard";
import { TransitsContent } from "../transits/TransitsScreen";
import { astrologyApi } from "../../services/astrologyApi";
import type { DailyInsight } from "../../services/types";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useMascotStore } from "../../store/useMascotStore";
import { energyLabel } from "../../lib/astroLanguage";
import { EnterView } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import { colors, palette, radii, spacing } from "../../lib/design-system";

/**
 * `/sky-today` — today's sky in one page: the day's reading first (title,
 * energy, the whole summary, share), then the sky against your chart (the
 * bi-wheel, the overview and each moving planet). Reading it counts as the
 * day's SKY_READ on the server.
 */
export function SkyTodayScreen() {
  const { t, locale } = useTranslation();
  const dto = useBirthDto();
  const refreshMascot = useMascotStore((s) => s.refresh);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [share, setShare] = useState<ShareCardData | null>(null);

  useEffect(() => {
    if (!dto) return;
    let active = true;
    setFailed(false);
    astrologyApi
      .getDailyInsight(dto, locale)
      .then((ins) => {
        if (!active) return;
        setInsight(ins);
        refreshMascot();
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [dto, locale, attempt, refreshMascot]);

  return (
    <ReadingPage
      eyebrow={t("skypath.sky.todayEyebrow")}
      title={t("skypath.sky.todayTitle")}
      action={
        insight ? (
          <ShareButton onPress={() => setShare({ variant: "daily", insight, date: new Date() })} />
        ) : null
      }
    >
      <EnterView index={1}>
        {failed && !insight ? (
          <ChunkyCard>
            <StateView kind="error" compact message={t("today.insightError")} onAction={() => setAttempt((n) => n + 1)} />
          </ChunkyCard>
        ) : !insight ? (
          <ChunkyCard style={styles.loading}>
            <CelestialLoader label={t("common.loading")} />
          </ChunkyCard>
        ) : (
          <ChunkyCard style={styles.reading}>
            <View style={styles.energy}>
              <AppText variant="label" color={palette.star.face} numberOfLines={1}>
                {energyLabel(t, insight.energyState)}
              </AppText>
            </View>
            <AppText variant="title">{insight.title}</AppText>
            <AppText variant="lead" color={colors.text.primary}>
              {insight.summary}
            </AppText>
          </ChunkyCard>
        )}
      </EnterView>
      <TransitsContent title={t("today.skyTitle")} enterIndex={2} />
      <ShareCardModal visible={share !== null} onClose={() => setShare(null)} data={share} />
    </ReadingPage>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 160, alignItems: "center", justifyContent: "center" },
  reading: { gap: spacing.sm },
  energy: {
    alignSelf: "flex-start",
    backgroundColor: palette.star.soft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
