import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { PressableScale } from "../../components/ui/PressableScale";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { OnboardingFrame } from "./OnboardingFrame";
import { WheelPicker, WheelItem } from "../../components/ui/WheelPicker";
import { AppText } from "../../components/ui/AppText";
import { MoonPhase } from "../../components/MoonPhase";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

export function BirthTimeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const setBirthTime = useOnboardingDraft((s) => s.setBirthTime);
  const setUnknownTime = useOnboardingDraft((s) => s.setUnknownTime);

  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [unknown, setUnknown] = useState(false);

  const hours: WheelItem[] = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ label: String(i).padStart(2, "0"), value: i })),
    [],
  );
  const minutes: WheelItem[] = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ label: String(i).padStart(2, "0"), value: i })),
    [],
  );

  const toggleUnknown = () => {
    const next = !unknown;
    setUnknown(next);
    setUnknownTime(next);
  };

  const onNext = () => {
    if (!unknown) {
      setBirthTime(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
    router.push("/birth-place");
  };

  return (
    <OnboardingFrame
      step={1}
      question={t("onboarding.timeQuestion")}
      hint={t("onboarding.timeHint")}
      ctaLabel={t("common.continue")}
      onNext={onNext}
    >
      <View style={styles.moon}>
        <MoonPhase size={40} />
      </View>

      {!unknown ? (
        <View style={styles.row}>
          <WheelPicker
            items={hours}
            selectedIndex={hour}
            onChange={(i) => setHour(hours[i].value)}
            width={84}
          />
          <AppText variant="display" color={colors.text.tertiary} style={styles.colon}>
            :
          </AppText>
          <WheelPicker
            items={minutes}
            selectedIndex={minute}
            onChange={(i) => setMinute(minutes[i].value)}
            width={84}
          />
        </View>
      ) : (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.noonNote}
        >
          <AppText variant="serifBody" center color={colors.text.secondary}>
            {t("onboarding.unknownTimeNote")}
          </AppText>
        </MotiView>
      )}

      <PressableScale onPress={toggleUnknown} scaleTo={0.97} style={styles.unknownRow}>
        <Ionicons
          name={unknown ? "checkbox" : "square-outline"}
          size={20}
          color={unknown ? colors.gold[300] : colors.text.tertiary}
        />
        <AppText variant="body" color={colors.text.secondary} style={styles.unknownText}>
          {t("onboarding.unknownTime")}
        </AppText>
      </PressableScale>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  moon: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  colon: {
    marginHorizontal: spacing.xs,
  },
  noonNote: {
    paddingHorizontal: spacing.xl,
    minHeight: 120,
    justifyContent: "center",
  },
  unknownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  unknownText: {
    flexShrink: 1,
  },
});
