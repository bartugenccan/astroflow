import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { WheelPicker, WheelItem } from "../../components/ui/WheelPicker";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

const MINUTE_STEP = 5;

interface Props {
  visible: boolean;
  onClose: () => void;
  hour: number;
  minute: number;
  onSave: (hour: number, minute: number) => void;
}

/** Hour : minute wheels for the daily reminder (5-minute steps). */
export function ReminderTimeSheet({ visible, onClose, hour: h0, minute: m0, onSave }: Props) {
  const { t } = useTranslation();
  const [hour, setHour] = useState(h0);
  const [minute, setMinute] = useState(m0 - (m0 % MINUTE_STEP));

  const hours: WheelItem[] = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ label: String(i).padStart(2, "0"), value: i })),
    [],
  );
  const minutes: WheelItem[] = useMemo(
    () =>
      Array.from({ length: 60 / MINUTE_STEP }, (_, i) => ({
        label: String(i * MINUTE_STEP).padStart(2, "0"),
        value: i * MINUTE_STEP,
      })),
    [],
  );

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("profile.reminderTimeTitle")}>
      <View style={styles.body}>
        <View style={styles.row}>
          <WheelPicker items={hours} selectedIndex={hour} onChange={(i) => setHour(hours[i].value)} width={72} />
          <AppText variant="title" color={colors.text.secondary}>:</AppText>
          <WheelPicker
            items={minutes}
            selectedIndex={minute / MINUTE_STEP}
            onChange={(i) => setMinute(minutes[i].value)}
            width={72}
          />
        </View>
        <GoldButton label={t("profile.save")} onPress={() => onSave(hour, minute)} />
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
