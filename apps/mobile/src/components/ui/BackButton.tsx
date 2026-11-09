import React from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { IconButton } from "./IconButton";
import { useTranslation } from "../../i18n";

interface BackButtonProps {
  /** Override the default `router.back()` (e.g. to go to a specific tab). */
  onPress?: () => void;
  icon?: "chevron-back" | "close";
}

/**
 * The one back affordance for pushed screens — a round chunky button. Falls
 * back to the Today tab when there's no history (deep link / fresh launch)
 * instead of doing nothing.
 */
export function BackButton({ onPress, icon = "chevron-back" }: BackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const goBack = () => {
    if (onPress) return onPress();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };
  return (
    <IconButton
      icon={icon}
      onPress={goBack}
      size={40}
      accessibilityLabel={icon === "close" ? t("common.close") : t("common.back")}
      style={styles.btn}
    />
  );
}

const styles = StyleSheet.create({
  btn: { marginLeft: -4 },
});
