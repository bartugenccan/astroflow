import React from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { LessonFlow } from "../../src/features/skypath/LessonFlow";
import { SKY_PATH } from "../../src/lib/mascotRules";
import type { SkyLessonKey } from "../../src/services/types";

/** `/lesson/<chapter>` — one Harita Yolu chapter, as a lesson. Unknown keys fall back to the first. */
export default function LessonRoute() {
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key?: string }>();
  const lessonKey = (SKY_PATH.find((c) => c.key === key)?.key ?? "bigThree") as SkyLessonKey;
  const exit = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/sky" as Href));
  return <LessonFlow lessonKey={lessonKey} onExit={exit} />;
}
