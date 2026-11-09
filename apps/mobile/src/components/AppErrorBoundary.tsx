import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { SplashScreen, type ErrorBoundaryProps } from "expo-router";
import { AppText } from "./ui/AppText";
import { GoldButton } from "./ui/GoldButton";
import { useTranslation } from "../i18n";
import { Sentry, SENTRY_ENABLED } from "../services/sentry";
import { colors, spacing, surface } from "../lib/design-system";

/**
 * expo-router error boundary for the root layout. It replaces the whole tree
 * (gesture root included), so it brings its own GestureHandlerRootView for the
 * GoldButton. The error goes to Sentry once; "Try again" re-mounts the route.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // A crash before the root was ready would otherwise leave the splash up forever.
    SplashScreen.hideAsync().catch(() => {});
    if (SENTRY_ENABLED) Sentry.captureException(error, { tags: { boundary: "root" } });
  }, [error]);

  const onRetry = () => {
    setRetrying(true);
    retry().finally(() => setRetrying(false));
  };

  return (
    <GestureHandlerRootView style={styles.flex}>
      <View style={styles.root}>
        <Ionicons name="planet-outline" size={44} color={colors.star[300]} />
        <AppText variant="title" center>
          {t("common.crashTitle")}
        </AppText>
        <AppText variant="body" center>
          {t("common.crashBody")}
        </AppText>
        <GoldButton label={t("common.retry")} onPress={onRetry} loading={retrying} style={styles.button} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: surface.base },
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  button: { alignSelf: "stretch", marginTop: spacing.md },
});
