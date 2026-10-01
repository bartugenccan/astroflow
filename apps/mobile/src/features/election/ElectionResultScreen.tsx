import React, { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { BackButton } from "../../components/ui/BackButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { useBirthDto } from "../../hooks/useBirthDto";
import type { ElectionCheckQuery } from "../../services/types";
import { useElectionStore } from "../../store/useElectionStore";
import { useTranslation } from "../../i18n";
import { colors, radii, spacing } from "../../lib/design-system";
import { CheckResult } from "./CheckResult";
import { SearchResult } from "./SearchResult";

/** The answer to the current Election question — a date check or a date search. */
export function ElectionResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dto = useBirthDto();
  const query = useElectionStore((s) => s.current);
  const ask = useElectionStore((s) => s.ask);
  const scroll = useRef<ScrollView>(null);

  if (!dto || !query) return <Frame title={t("election.title")} onNew={() => router.back()} />;

  return (
    <Frame title={t("election.title")} onNew={() => router.back()} scrollRef={scroll}>
      {query.mode === "check" ? (
        <CheckResult
          dto={dto}
          query={query}
          onOpenDate={(date) => {
            ask({ ...query, date });
            scroll.current?.scrollTo({ y: 0, animated: true });
          }}
        />
      ) : (
        <SearchResult
          dto={dto}
          query={query}
          onOpenDate={(date) => router.push(`/election/day?date=${date}` as Href)}
        />
      )}
    </Frame>
  );
}

/** One day from a date search, checked in full (same event and place). */
export function ElectionDayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dto = useBirthDto();
  const { date } = useLocalSearchParams<{ date: string }>();
  const search = useElectionStore((s) => s.current);
  const scroll = useRef<ScrollView>(null);

  if (!dto || !search || !date) return <Frame title={t("election.title")} onNew={() => router.back()} />;
  const query: ElectionCheckQuery = {
    mode: "check",
    eventId: search.eventId,
    eventText: search.eventText,
    place: search.place,
    date,
  };

  return (
    <Frame title={t("election.title")} scrollRef={scroll}>
      <CheckResult
        dto={dto}
        query={query}
        onOpenDate={(d) => {
          router.setParams({ date: d });
          scroll.current?.scrollTo({ y: 0, animated: true });
        }}
      />
    </Frame>
  );
}

function Frame({
  title,
  onNew,
  scrollRef,
  children,
}: {
  title: string;
  onNew?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <ScreenWrapper>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.bar}>
          <BackButton />
          <AppText variant="label" color={colors.text.gold} style={styles.barTitle}>
            {title}
          </AppText>
          {onNew ? (
            <PressableScale onPress={onNew} scaleTo={0.95} style={styles.newBtn}>
              <AppText variant="bodySmall" color={colors.gold[200]}>
                {t("election.newQuery")}
              </AppText>
            </PressableScale>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 80,
    gap: spacing.lg,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  barTitle: { flex: 1 },
  newBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
});
