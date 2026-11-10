import React from "react";
import { useRouter, type Href } from "expo-router";
import { ReadingPage } from "../src/components/ReadingPage";
import { LearnContent } from "../src/features/manifest/ManifestSheets";
import { useTranslation } from "../src/i18n";

/** `/learn` — "How manifesting works": the short guide cards, each opening its practice. */
export default function LearnRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <ReadingPage title={t("practice.learn.title")}>
      <LearnContent onStart={(method) => router.push(`/practice?method=${method}` as Href)} />
    </ReadingPage>
  );
}
