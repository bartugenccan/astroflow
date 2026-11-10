import type { Ionicons } from "@expo/vector-icons";
import { CATALOG, unlocksAt } from "../../lib/mascotRules";
import type { TFunction, TranslationKey } from "../../i18n";
import type { Tone } from "../../lib/design-system";

export interface UnlockLine {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
}

/** Everything a stage opens, in the order that matters most: chapters, spreads, abilities, shop. */
export function unlockLines(t: TFunction, stage: number): UnlockLine[] {
  const u = unlocksAt(stage);
  const lines: UnlockLine[] = [
    ...u.lessons.map((k) => ({
      key: `l-${k}`,
      label: t("skypath.unlocks.lesson", { name: t(`skypath.lessons.${k}.title` as TranslationKey) }),
      icon: "map" as const,
      tone: "sky" as Tone,
    })),
    ...u.spreads.map((k) => ({
      key: `s-${k}`,
      label: t("skypath.unlocks.spread", { name: t(`skypath.unlocks.spreads.${k}` as TranslationKey) }),
      icon: "albums" as const,
      tone: "primary" as Tone,
    })),
    ...u.abilities.map((k) => ({
      key: `a-${k}`,
      label: t("skypath.unlocks.ability", { name: t(`aster.abilities.${k}.title` as TranslationKey) }),
      icon: "lock-open" as const,
      tone: "mint" as Tone,
    })),
  ];
  const items = CATALOG.filter((i) => i.minStage === stage && i.kind === "accessory");
  if (items.length) {
    lines.push({
      key: "items",
      label: t("skypath.unlocks.item", {
        name: items.map((i) => t(`aster.shop.items.${i.id}` as TranslationKey)).join(", "),
      }),
      icon: "bag-handle",
      tone: "candy",
    });
  }
  return lines;
}
