import React from "react";
import { StyleSheet, View } from "react-native";
import { ReadingPage } from "../../components/ReadingPage";
import { AppText } from "../../components/ui/AppText";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { PaperCard } from "../../components/ui/Paper";
import { StateView } from "../../components/ui/StateView";
import { mascotApi } from "../../services/mascotApi";
import { useAsync } from "../../hooks/useAsync";
import { EnterView } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import { colors, paper, palette, spacing } from "../../lib/design-system";

/**
 * Aster's weekly letter (Constellation stage): a short note on paper about the
 * week — what you practised, the signs you logged — and one small suggestion
 * for the week ahead. Written once per week on first read; later reads that
 * week return the same letter.
 */
export function LetterScreen() {
  const { t, locale } = useTranslation();
  const letter = useAsync(() => mascotApi.getLetter(locale), [locale]);

  return (
    <ReadingPage eyebrow={t("letter.eyebrow")} title={t("letter.title")}>
      {letter.loading && !letter.data ? (
        <ChunkyCard>
          <StateView kind="loading" compact message={t("letter.loading")} />
        </ChunkyCard>
      ) : letter.error || !letter.data ? (
        <ChunkyCard>
          <StateView kind="error" compact message={t("letter.error")} onAction={letter.reload} />
        </ChunkyCard>
      ) : (
        <>
          <EnterView index={1}>
            <PaperCard>
              <View style={styles.paper}>
                <AppText variant="script" color={paper.ink}>
                  {letter.data.greeting}
                </AppText>
                <AppText variant="body" color={paper.ink}>
                  {letter.data.body}
                </AppText>
                <AppText variant="script" color={paper.ink}>
                  {t("letter.signoff")}
                </AppText>
              </View>
            </PaperCard>
          </EnterView>
          <EnterView index={2}>
            <ChunkyCard tone="star" tinted style={styles.note}>
              <AppText variant="label" color={palette.star.face}>
                {t("letter.highlight")}
              </AppText>
              <AppText variant="body" color={colors.text.primary}>
                {letter.data.highlight}
              </AppText>
            </ChunkyCard>
          </EnterView>
          <EnterView index={3}>
            <ChunkyCard tone="sky" tinted style={styles.note}>
              <AppText variant="label" color={palette.sky.face}>
                {t("letter.ahead")}
              </AppText>
              <AppText variant="body" color={colors.text.primary}>
                {letter.data.ahead}
              </AppText>
            </ChunkyCard>
          </EnterView>
          <AsterCameo text={t("letter.next")} size={56} />
        </>
      )}
    </ReadingPage>
  );
}

const styles = StyleSheet.create({
  paper: { gap: spacing.md },
  note: { gap: spacing.xs },
});
