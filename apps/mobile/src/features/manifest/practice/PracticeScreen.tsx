import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { ScreenWrapper } from "../../../components/ScreenWrapper";
import { AppText } from "../../../components/ui/AppText";
import { AsterCameo } from "../../../components/ui/AsterCameo";
import { ChunkyButton } from "../../../components/ui/ChunkyButton";
import { CelestialLoader } from "../../../components/ui/CelestialLoader";
import { IconButton } from "../../../components/ui/IconButton";
import { StateView } from "../../../components/ui/StateView";
import { astrologyApi } from "../../../services/astrologyApi";
import { useAsync } from "../../../hooks/useAsync";
import { usePlanStore } from "../../../store/usePlanStore";
import { useReflectionStore } from "../../../store/useReflectionStore";
import { localDay } from "../../../store/useAffirmationStore";
import { useTranslation } from "../../../i18n";
import type { PracticeMethod } from "../../../services/types";
import { spacing } from "../../../lib/design-system";
import { lunarInfo, starLook } from "../wishModel";
import { isMethod, pickPractice, pickWish } from "../practiceModel";
import { ScriptFlow } from "./ScriptFlow";
import { ReadFlow } from "./ReadFlow";
import { Flow369 } from "./Flow369";
import { VisualizeFlow } from "./VisualizeFlow";

/**
 * `/practice?method=script|read|369|visualize&id=<manifestation id>` — one
 * guided practice, Duolingo-lesson style. Without a method it opens today's
 * suggestion; without an id it practises for the manifestation that needs it
 * most (today's power one first). Reminders open `?method=369`.
 */
export function PracticeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ method?: string; id?: string }>();
  const powerId = usePlanStore((s) => s.plan?.powerIntentionId ?? null);
  const today = useReflectionStore((s) => s.practice[localDay()]);
  const ritualDone = useReflectionStore((s) => {
    const key = lunarInfo(new Date()).windowKey;
    return key ? key in s.rituals : false;
  });
  const wishes = useAsync(() => astrologyApi.listIntentions(), []);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/manifest" as Href));

  const live = useMemo(() => (wishes.data ?? []).filter((w) => starLook(w) !== "waiting"), [wishes.data]);
  const initial = useMemo(
    () => (params.id ? live.find((w) => w.id === params.id) : undefined) ?? pickWish(live, powerId),
    [live, params.id, powerId],
  );

  // The method is decided once, when the manifestations arrive: the link's, or today's suggestion.
  const method: PracticeMethod = useMemo(() => {
    if (isMethod(params.method)) return params.method;
    const s = pickPractice({
      lunar: lunarInfo(new Date()),
      ritualDone,
      hour: new Date().getHours(),
      day: today,
      wishes: live,
      powerIntentionId: powerId,
    });
    return s?.kind === "method" ? s.method : "script";
    // Only the first answer counts; marking a step done mustn't switch practices mid-way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.method, wishes.data]);

  if (wishes.loading && !wishes.data) {
    return (
      <Frame onClose={close}>
        <CelestialLoader label={t("practice.loading")} />
      </Frame>
    );
  }
  if (wishes.error && !wishes.data) {
    return (
      <Frame onClose={close}>
        <StateView kind="error" message={t("practice.error")} onAction={wishes.reload} />
      </Frame>
    );
  }
  if (!initial) {
    return (
      <Frame onClose={close}>
        <View style={styles.empty}>
          <AsterCameo text={t("practice.noWishBody")} size={96} layout="column" />
          <AppText variant="title" center>
            {t("practice.noWishTitle")}
          </AppText>
          <ChunkyButton
            label={t("practice.noWishCta")}
            variant="star"
            onPress={() => router.replace("/intentions/create" as Href)}
          />
        </View>
      </Frame>
    );
  }

  const props = { wishes: live, initial, onClose: close };
  switch (method) {
    case "read":
      return <ReadFlow {...props} />;
    case "369":
      return <Flow369 {...props} />;
    case "visualize":
      return <VisualizeFlow {...props} />;
    default:
      return <ScriptFlow {...props} />;
  }
}

/** Loading / error / empty: the same X in the corner, content centred. */
function Frame({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <ScreenWrapper variant="still">
      <View style={styles.top}>
        <IconButton icon="close" onPress={onClose} size={44} accessibilityLabel={t("practice.close")} />
      </View>
      <View style={styles.center}>{children}</View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  empty: { alignSelf: "stretch", gap: spacing.lg },
});
