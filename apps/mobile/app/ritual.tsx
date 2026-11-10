import React, { useMemo, useState } from "react";
import { useRouter, type Href } from "expo-router";
import { ReadingPage } from "../src/components/ReadingPage";
import { ChunkyCard } from "../src/components/ui/ChunkyCard";
import { StateView } from "../src/components/ui/StateView";
import { MoonRitualFlow } from "../src/features/manifest/RitualSheets";
import { lunarInfo } from "../src/features/manifest/wishModel";
import { astrologyApi } from "../src/services/astrologyApi";
import { useAsync } from "../src/hooks/useAsync";
import { useTranslation } from "../src/i18n";

/**
 * `/ritual` — the Moon ritual as its own page (it used to be a long sheet).
 * New moon: call in and renew; full moon: keep, harvest or let go. Outside a
 * moon window it says when the next one is.
 */
export default function RitualRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const lunar = useMemo(() => lunarInfo(new Date()), []);
  const wishes = useAsync(() => astrologyApi.listIntentions(), [reloadKey]);
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/manifest" as Href));

  if (wishes.loading && !wishes.data) {
    return (
      <ReadingPage title={t("wish.moon.newTitle")}>
        <ChunkyCard>
          <StateView kind="loading" compact message={t("wish.sky.loading")} />
        </ChunkyCard>
      </ReadingPage>
    );
  }

  return (
    <MoonRitualFlow
      frame={(title, body) => <ReadingPage title={title}>{body}</ReadingPage>}
      onClose={leave}
      lunar={lunar}
      wishes={wishes.data ?? []}
      onPlant={() => router.replace("/intentions/create" as Href)}
      onChanged={() => setReloadKey((k) => k + 1)}
    />
  );
}
