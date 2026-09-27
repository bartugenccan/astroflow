import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { useRouter, type Href } from "expo-router";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { ChartReveal } from "../../components/ChartReveal";
import { BigThree } from "../../components/BigThree";
import { GoldButton } from "../../components/ui/GoldButton";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { StarDivider } from "../../components/ui/StarDivider";
import { astrologyApi } from "../../services/astrologyApi";
import { BirthProfileResponse, CreateBirthProfileDto } from "../../services/types";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { EnterView } from "../../lib/motion";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

export function RevealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useOnboardingDraft();
  const setDraftProfile = useOnboardingDraft((s) => s.setProfile);

  const [profile, setProfile] = useState<BirthProfileResponse | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const lat = draft.city?.lat ?? draft.manualLat ?? 41.0082;
    const lon = draft.city?.lon ?? draft.manualLon ?? 28.9784;
    const dto: CreateBirthProfileDto = {
      birthDate: draft.birthDate ?? "2000-01-01",
      birthTime: draft.birthTime ?? "12:00",
      latitude: lat,
      longitude: lon,
    };
    astrologyApi.saveBirthProfile(dto).then((p) =>
      setProfile({ ...p, placeName: draft.city?.name, unknownTime: draft.unknownTime }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = profile && revealed;

  // Onboarding completes at the end of the intro tour, so a newcomer learns
  // what the app holds (including the birthday chart) before landing in it.
  const enter = () => {
    if (!profile) return;
    setDraftProfile(profile);
    router.push("/(onboarding)/tour" as Href);
  };

  const tr = (group: "planets" | "elements", v: string) => {
    const key = `${group}.${v}` as TranslationKey;
    const out = t(key);
    return out === key ? v : out;
  };

  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <View style={styles.container}>
        {!ready ? (
          <View style={styles.revealArea}>
            <ChartReveal onComplete={() => setRevealed(true)} />
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ loop: true, type: "timing", duration: 1400 }}
              style={styles.castingWrap}
            >
              <AppText variant="serifBody" center color={colors.text.secondary}>
                {t("onboarding.casting")}
              </AppText>
            </MotiView>
          </View>
        ) : (
          <View style={styles.result}>
            <EnterView distance={24}>
              <AppText variant="label" color={colors.text.gold} center>
                {t("onboarding.revealReady")}
              </AppText>
            </EnterView>
            <EnterView index={1} distance={24} scale>
              <HairlineCard style={styles.card}>
                <BigThree
                  sunSign={profile.sunSign}
                  moonSign={profile.moonSign}
                  risingSign={profile.risingSign}
                />
                <View style={styles.divider}>
                  <StarDivider />
                </View>
                <AppText variant="labelLong" center>
                  {t("onboarding.dominantLabel")}
                </AppText>
                <AppText variant="serifBody" center>
                  {tr("elements", profile.dominantElement)} •{" "}
                  {tr("planets", profile.dominantPlanet)}
                </AppText>
              </HairlineCard>
            </EnterView>
            <EnterView index={2}>
              <GoldButton label={t("onboarding.enterApp")} onPress={enter} />
            </EnterView>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  revealArea: {
    alignItems: "center",
    gap: spacing.xxl,
  },
  castingWrap: {
    paddingHorizontal: spacing.xl,
  },
  result: {
    width: "100%",
    gap: spacing.xl,
    alignItems: "stretch",
  },
  card: {
    gap: spacing.lg,
  },
  divider: {
    paddingVertical: spacing.sm,
  },
});
