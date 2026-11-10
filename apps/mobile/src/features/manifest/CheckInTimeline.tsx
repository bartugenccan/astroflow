import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { PaperCard } from "../../components/ui/Paper";
import { StateView } from "../../components/ui/StateView";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { useTranslation } from "../../i18n";
import { colors, palette, paper, spacing } from "../../lib/design-system";
import { shortDate } from "./wishModel";

/** The newest pages first; a few at a time so the screen stays light. */
const PAGE = 3;

/**
 * "Your pages": every practice written for this manifestation, newest first,
 * as torn-out paper — the date and how bright it felt, what the user wrote
 * (in their hand), and Aster's reply as a margin note.
 */
export function CheckInTimeline({ intentionId, reloadKey }: { intentionId: string; reloadKey: number }) {
  const { t, locale } = useTranslation();
  const history = useAsync(() => astrologyApi.getIntentionHistory(intentionId), [intentionId, reloadKey]);
  const [shown, setShown] = useState(PAGE);
  const rows = history.data ?? [];

  let body: React.ReactNode;
  if (history.loading && !history.data) body = <StateView kind="loading" compact />;
  else if (history.error && !history.data)
    body = <StateView kind="error" compact message={t("wish.detail.historyError")} onAction={history.reload} />;
  else if (rows.length === 0) body = <StateView kind="empty" compact message={t("wish.detail.historyEmpty")} />;
  else
    body = (
      <View style={styles.list}>
        {rows.slice(0, shown).map((r, i) => (
          <PaperCard key={r.id} lines={r.userText ? 3 : 2} plain tilt={i % 2 === 0 ? -0.5 : 0.5}>
            <View style={styles.meta}>
              <AppText variant="label" color={paper.inkSoft}>
                {shortDate(locale, r.date || r.createdAt)}
              </AppText>
              <View
                style={styles.stars}
                accessible
                accessibilityLabel={t("wish.detail.brightness", { n: r.conviction })}
              >
                {Array.from({ length: 5 }, (_, k) => (
                  <Ionicons
                    key={k}
                    name={k < r.conviction ? "star" : "star-outline"}
                    size={12}
                    color={k < r.conviction ? palette.star.slab : paper.inkTrace}
                  />
                ))}
              </View>
            </View>
            {r.userText ? <AppText variant="script">{r.userText}</AppText> : null}
            {r.aiResponse ? (
              <View style={styles.note}>
                <AppText variant="bodySmall" color={paper.ink}>
                  {r.aiResponse}
                </AppText>
              </View>
            ) : null}
          </PaperCard>
        ))}
        {rows.length > shown ? (
          <ChunkyButton
            label={t("wish.detail.showMore")}
            variant="night"
            size="sm"
            onPress={() => setShown((n) => n + PAGE)}
          />
        ) : null}
      </View>
    );

  return (
    <View style={styles.wrap}>
      <AppText variant="heading" accessibilityRole="header" color={colors.text.primary}>
        {t("wish.detail.historyTitle")}
      </AppText>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  list: { gap: spacing.lg },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 24 },
  stars: { flexDirection: "row", gap: 2 },
  note: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: paper.note,
  },
});
