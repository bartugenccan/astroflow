import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { IconButton } from "./IconButton";
import { useTranslation } from "../../i18n";

interface ShareButtonProps {
  onPress: () => void;
  /** Face diameter (the touch target never drops below 44pt). */
  size?: 40 | 44;
  style?: StyleProp<ViewStyle>;
}

/** Share affordance — a round chunky icon button in the night tone. */
export function ShareButton({ onPress, size = 40, style }: ShareButtonProps) {
  const { t } = useTranslation();
  return (
    <IconButton icon="share-outline" onPress={onPress} size={size} accessibilityLabel={t("common.share")} style={style} />
  );
}
