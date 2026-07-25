import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { OnboardingFrame } from "./OnboardingFrame";
import { WheelPicker, WheelItem } from "../../components/ui/WheelPicker";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { useTranslation } from "../../i18n";
import { spacing } from "../../lib/design-system";

const MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
};

const YEAR_MIN = 1940;
const YEAR_MAX = 2020;

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function BirthDateScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const setBirthDate = useOnboardingDraft((s) => s.setBirthDate);

  const [year, setYear] = useState(2000);
  const [month, setMonth] = useState(1); // 1-based
  const [day, setDay] = useState(15);

  const years: WheelItem[] = useMemo(
    () =>
      Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => ({
        label: String(YEAR_MIN + i),
        value: YEAR_MIN + i,
      })),
    [],
  );
  const months: WheelItem[] = useMemo(
    () => (MONTHS[locale] ?? MONTHS.en).map((m, i) => ({ label: m, value: i + 1 })),
    [locale],
  );
  const days: WheelItem[] = useMemo(() => {
    const n = daysInMonth(month, year);
    return Array.from({ length: n }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
  }, [month, year]);

  const dayIndex = Math.min(day, days.length) - 1;

  const onNext = () => {
    const mm = String(month).padStart(2, "0");
    const dd = String(Math.min(day, days.length)).padStart(2, "0");
    setBirthDate(`${year}-${mm}-${dd}`);
    router.push("/birth-time");
  };

  return (
    <OnboardingFrame
      step={0}
      question={t("onboarding.dateQuestion")}
      hint={t("onboarding.dateHint")}
      ctaLabel={t("common.continue")}
      onNext={onNext}
    >
      <View style={styles.row}>
        <WheelPicker
          items={days}
          selectedIndex={dayIndex}
          onChange={(i) => setDay(days[i].value)}
          width={70}
        />
        <WheelPicker
          items={months}
          selectedIndex={month - 1}
          onChange={(i) => setMonth(months[i].value)}
          width={96}
        />
        <WheelPicker
          items={years}
          selectedIndex={year - YEAR_MIN}
          onChange={(i) => setYear(years[i].value)}
          width={100}
        />
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
});
