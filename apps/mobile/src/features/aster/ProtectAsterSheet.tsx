import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { Chip } from "../../components/ui/Chip";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { useTranslation } from "../../i18n";
import { spacing } from "../../lib/design-system";
import { AccountSheet } from "../account/AccountSheet";

interface ProtectAsterSheetProps {
  visible: boolean;
  /** "Not now", or the account sheet closed (linked or not). */
  onClose: () => void;
}

/**
 * Aster asks to be protected with an account — offered right after the user
 * has invested (hatching, the first journey, three days in orbit), never
 * during a rest. "Protect Aster" hands over to the account sheet.
 */
export function ProtectAsterSheet({ visible, onClose }: ProtectAsterSheetProps) {
  const { t } = useTranslation();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <SpringBottomSheet visible={visible && !accountOpen} onClose={onClose} title={t("aster.protect.title")}>
        <View style={styles.body}>
          <AsterCameo text={t("aster.protect.body")} size={84} action="talk" />
          <View style={styles.badge}>
            <Chip label={t("aster.protect.badge")} icon="sparkles" tone="star" />
          </View>
          <ChunkyButton
            label={t("aster.protect.cta")}
            variant="primary"
            onPress={() => setAccountOpen(true)}
          />
          <ChunkyButton label={t("aster.protect.later")} variant="ghost" size="md" onPress={onClose} />
        </View>
      </SpringBottomSheet>
      <AccountSheet
        visible={accountOpen}
        intent="secure"
        onClose={() => {
          setAccountOpen(false);
          onClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.lg },
  badge: { alignItems: "center" },
});
