import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { WheelPicker, WheelItem } from "../../components/ui/WheelPicker";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

const MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
};
const YEAR_MIN = 1940;
const YEAR_MAX = 2020;

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Current stored values. */
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  saving?: boolean;
  onSave: (birthDate: string, birthTime: string) => void;
}

/** Bottom-sheet editor for birth date + time, reusing the onboarding wheels. */
export function BirthDetailsSheet({
  visible,
  onClose,
  birthDate,
  birthTime,
  saving,
  onSave,
}: Props) {
  const { t, locale } = useTranslation();

  const [y0, m0, d0] = birthDate.split("-").map(Number);
  const [h0, min0] = birthTime.split(":").map(Number);

  const [year, setYear] = useState(y0 || 2000);
  const [month, setMonth] = useState(m0 || 1); // 1-based
  const [day, setDay] = useState(d0 || 15);
  const [hour, setHour] = useState(Number.isFinite(h0) ? h0 : 12);
  const [minute, setMinute] = useState(Number.isFinite(min0) ? min0 : 0);

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
  const hours: WheelItem[] = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ label: String(i).padStart(2, "0"), value: i })),
    [],
  );
  const minutes: WheelItem[] = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ label: String(i).padStart(2, "0"), value: i })),
    [],
  );

  const dayIndex = Math.min(day, days.length) - 1;

  const save = () => {
    const mm = String(month).padStart(2, "0");
    const dd = String(Math.min(day, days.length)).padStart(2, "0");
    const hh = String(hour).padStart(2, "0");
    const mi = String(minute).padStart(2, "0");
    onSave(`${year}-${mm}-${dd}`, `${hh}:${mi}`);
  };

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("profile.editBirth")}>
      <View style={styles.body}>
        <AppText variant="label" color={colors.text.tertiary}>
          {t("profile.date")}
        </AppText>
        <View style={styles.row}>
          <WheelPicker items={days} selectedIndex={dayIndex} onChange={(i) => setDay(days[i].value)} width={64} />
          <WheelPicker items={months} selectedIndex={month - 1} onChange={(i) => setMonth(months[i].value)} width={88} />
          <WheelPicker items={years} selectedIndex={year - YEAR_MIN} onChange={(i) => setYear(years[i].value)} width={92} />
        </View>

        <AppText variant="label" color={colors.text.tertiary}>
          {t("profile.time")}
        </AppText>
        <View style={styles.row}>
          <WheelPicker items={hours} selectedIndex={hour} onChange={(i) => setHour(hours[i].value)} width={72} />
          <AppText variant="title" color={colors.text.secondary}>:</AppText>
          <WheelPicker items={minutes} selectedIndex={minute} onChange={(i) => setMinute(minutes[i].value)} width={72} />
        </View>

        <GoldButton label={t("profile.save")} onPress={save} loading={saving} />
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    alignItems: "center",
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
});
