import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenWrapper } from "./ScreenWrapper";
import { AppText } from "./ui/AppText";
import { BackButton } from "./ui/BackButton";
import { EnterView } from "../lib/motion";
import { colors, layout, spacing } from "../lib/design-system";

interface ReadingPageProps {
  title?: string;
  eyebrow?: string;
  /** Right side of the top bar (a share button, a chip). */
  action?: React.ReactNode;
  /** "close" for pages that rise like a lesson. */
  backIcon?: "chevron-back" | "close";
  /** Pinned under the scroll (one primary button). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A full-screen page for a long read or a flow that used to live in a bottom
 * sheet. Back on the left, the title as a header, the body scrolls with the
 * screen gutter, and an optional single button stays pinned at the bottom.
 * Swiping back works like every other pushed screen.
 */
export function ReadingPage({ title, eyebrow, action, backIcon = "chevron-back", footer, children }: ReadingPageProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton icon={backIcon} />
        <View style={styles.flex} />
        {action}
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: (footer ? spacing.lg : insets.bottom) + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {title ? (
          <EnterView style={styles.head}>
            {eyebrow ? (
              <AppText variant="label" color={colors.text.accent}>
                {eyebrow}
              </AppText>
            ) : null}
            <AppText variant="display" accessibilityRole="header">
              {title}
            </AppText>
          </EnterView>
        ) : null}
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View> : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    minHeight: 56,
  },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  head: { gap: spacing.xs },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
  },
});
