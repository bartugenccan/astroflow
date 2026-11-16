import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AsterCameo } from "./AsterCameo";
import { ChunkyButton } from "./ChunkyButton";
import { CelestialLoader } from "./CelestialLoader";
import { AppText } from "./AppText";
import { useTranslation } from "../../i18n";
import { spacing } from "../../lib/design-system";

type StateKind = "loading" | "empty" | "error";

interface StateViewProps {
  kind: StateKind;
  /** What Aster says. Defaults: loading → "Reading the sky…", error → a gentle "that didn't work". */
  message?: string;
  /** A second, quieter line under the bubble. */
  detail?: string;
  /** The way forward: "Create your first…", "Try again". Errors default to retry when given `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
  /** A quieter second way out, e.g. "Go back" beside "Try again". */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Smaller, for a state inside a card instead of a whole screen. */
  compact?: boolean;
  /**
   * An error because the phone couldn't reach the server (`isConnectionError`):
   * Aster says to check the connection instead of the screen's own message.
   */
  offline?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one way a screen says "not yet": loading, nothing here yet, or
 * something went wrong — always with Aster and always with a way forward,
 * never a blank area.
 */
export function StateView({
  kind,
  message,
  detail,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact,
  offline,
  style,
}: StateViewProps) {
  const { t } = useTranslation();

  if (kind === "loading") {
    return (
      <View style={[styles.wrap, compact && styles.compact, style]} accessibilityLiveRegion="polite">
        <CelestialLoader size={compact ? "sm" : "lg"} label={message ?? t("common.loading")} />
      </View>
    );
  }

  const noConnection = kind === "error" && !!offline;
  const text = noConnection
    ? t("common.offlineError")
    : (message ?? (kind === "error" ? t("common.stateError") : t("common.stateEmpty")));
  const subline = noConnection ? t("common.offlineDetail") : detail;
  const label = actionLabel ?? (kind === "error" ? t("common.retry") : undefined);

  return (
    <View style={[styles.wrap, compact && styles.compact, style]} accessibilityLiveRegion="polite">
      <AsterCameo
        text={text}
        size={compact ? 64 : 96}
        action={kind === "error" ? "idle" : "talk"}
        mood={kind === "error" ? "sleepy" : undefined}
        layout={compact ? "row" : "column"}
      />
      {subline ? (
        <AppText variant="body" center>
          {subline}
        </AppText>
      ) : null}
      {onAction && label ? (
        <ChunkyButton
          label={label}
          onPress={onAction}
          variant={kind === "error" ? "night" : "primary"}
          size={compact ? "md" : "lg"}
          style={styles.action}
        />
      ) : null}
      {onSecondary && secondaryLabel ? (
        <ChunkyButton
          label={secondaryLabel}
          onPress={onSecondary}
          variant="ghost"
          size="md"
          uppercase={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "stretch", justifyContent: "center", gap: spacing.lg, paddingVertical: spacing.xxl },
  compact: { paddingVertical: spacing.lg, gap: spacing.md },
  action: { alignSelf: "center", minWidth: 200 },
});
