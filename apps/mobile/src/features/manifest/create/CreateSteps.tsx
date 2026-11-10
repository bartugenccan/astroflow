import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../../components/ui/AppText";
import { ChunkyButton } from "../../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../../components/ui/ChunkyCard";
import { PaperCard, PaperInput } from "../../../components/ui/Paper";
import { PressableScale } from "../../../components/ui/PressableScale";
import { StateView } from "../../../components/ui/StateView";
import { AsterPrompt } from "../practice/PracticeParts";
import { houseLabel } from "../../../lib/astroLanguage";
import { useTranslation, type TranslationKey } from "../../../i18n";
import type { LifeArea, LifeAreaContext } from "../../../services/types";
import { areaTone, colors, depth, palette, radii, spacing, surface } from "../../../lib/design-system";
import { WishStarGlyph } from "../WishStarGlyph";
import { planetName, signName } from "../WishChartCard";
import { AREA_ICON, LIFE_AREAS, shortDate, whenLabel } from "../wishModel";

export const GOAL_MAX = 140;
export type Plant = "now" | "newMoon";

// ─── Step 1: the life area ───────────────────────────────────────────────────

/** Four big tiles; each says where that area lives in the user's chart. */
export function AreaStep({
  area,
  onPick,
  contexts,
  loading,
  error,
}: {
  area: LifeArea | null;
  onPick: (a: LifeArea) => void;
  contexts: LifeAreaContext[] | null;
  loading: boolean;
  error: boolean;
}) {
  const { t, locale } = useTranslation();

  const natalLine = (ctx: LifeAreaContext | undefined): string | null => {
    if (!ctx) return null;
    const house = houseLabel(t, locale, ctx.house);
    const where = ctx.sign
      ? t("wish.create.areaHouse", { house, sign: signName(t, ctx.sign) })
      : t("wish.create.areaHouseOnly", { house });
    const extra = ctx.planets.length
      ? t("wish.create.areaPlanets", { planets: ctx.planets.map((p) => planetName(t, p)).join(", ") })
      : ctx.ruler
        ? t("wish.create.areaRuler", { planet: planetName(t, ctx.ruler) })
        : "";
    return extra ? `${where} · ${extra}` : where;
  };

  return (
    <>
      <AppText variant="title" accessibilityRole="header">
        {t("wish.create.areaTitle")}
      </AppText>
      {loading ? (
        <AppText variant="bodySmall">{t("wish.create.areaLoading")}</AppText>
      ) : error ? (
        <AppText variant="bodySmall">{t("wish.create.areaError")}</AppText>
      ) : null}
      <View style={styles.grid} accessibilityRole="radiogroup">
        {LIFE_AREAS.map((a) => {
          const ctx = contexts?.find((c) => c.area === a);
          const line = natalLine(ctx);
          const selected = a === area;
          const p = palette[areaTone[a]];
          const name = t(`wish.areas.${a}.name` as TranslationKey);
          return (
            <PressableScale
              key={a}
              onPress={() => onPick(a)}
              scaleTo={0.96}
              style={[
                styles.tile,
                { borderColor: p.face, borderBottomColor: p.slab },
                selected ? { backgroundColor: p.face } : { backgroundColor: p.soft },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={[
                name,
                line ? `${t("wish.create.areaInChart", { area: name })}: ${line}` : null,
                ctx?.approximate ? t("wish.create.approximate") : null,
              ]
                .filter(Boolean)
                .join(". ")}
            >
              <View style={styles.tileHead}>
                <View style={[styles.tileIcon, { backgroundColor: selected ? p.on : p.face }]}>
                  <Ionicons name={AREA_ICON[a]} size={24} color={selected ? p.face : p.on} />
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={24} color={p.on} /> : null}
              </View>
              <AppText variant="heading" color={selected ? p.on : colors.text.primary}>
                {name}
              </AppText>
              {line ? (
                <AppText variant="bodySmall" color={selected ? p.on : colors.text.secondary} numberOfLines={3}>
                  {line}
                </AppText>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </>
  );
}

// ─── Step 2: write it as if it happened ──────────────────────────────────────

export function WriteStep({
  area,
  goal,
  onGoal,
  suggestions,
}: {
  area: LifeArea;
  goal: string;
  onGoal: (v: string) => void;
  suggestions: string[];
}) {
  const { t } = useTranslation();
  const tone = palette[areaTone[area]];
  const examples = [
    ...suggestions.slice(0, 1),
    t(`wish.create.ex.${area}.a` as TranslationKey),
    t(`wish.create.ex.${area}.b` as TranslationKey),
  ].filter((v, i, all) => v && all.indexOf(v) === i);

  return (
    <>
      <AppText variant="title" accessibilityRole="header">
        {t("wish.create.writeTitle")}
      </AppText>
      <AsterPrompt text={t("wish.create.writeHint")} />
      <PaperCard lines={4} tilt={-0.4}>
        <PaperInput
          value={goal}
          onChangeText={onGoal}
          placeholder={t("wish.create.writePlaceholder")}
          minLines={3}
          maxLength={GOAL_MAX}
          autoFocus
          accessibilityLabel={t("wish.create.writeA11y")}
        />
      </PaperCard>
      <AppText variant="numeric" style={styles.counter}>
        {goal.length}/{GOAL_MAX}
      </AppText>
      <AppText variant="label" color={colors.text.accent}>
        {t("wish.create.examples")}
      </AppText>
      <View style={styles.examples}>
        {examples.map((ex) => (
          <PressableScale
            key={ex}
            onPress={() => onGoal(ex)}
            scaleTo={0.97}
            style={[styles.example, goal === ex && { borderColor: tone.face, backgroundColor: tone.soft }]}
            accessibilityRole="button"
            accessibilityState={{ selected: goal === ex }}
            accessibilityLabel={ex}
          >
            <Ionicons name="sparkles" size={14} color={tone.face} />
            <AppText variant="body" color={colors.text.primary} style={styles.flex}>
              {ex}
            </AppText>
          </PressableScale>
        ))}
      </View>
    </>
  );
}

// ─── Step 3: the affirmation (what will be read aloud) ───────────────────────

export function AffirmStep({
  value,
  state,
  onChange,
  onRegenerate,
}: {
  value: string;
  state: "idle" | "loading" | "error" | "ready";
  onChange: (v: string) => void;
  onRegenerate: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <AppText variant="title" accessibilityRole="header">
        {t("wish.create.affirmTitle")}
      </AppText>
      {state === "loading" ? (
        <ChunkyCard>
          <StateView kind="loading" compact message={t("wish.create.affirmLoading")} />
        </ChunkyCard>
      ) : (
        <>
          {state === "error" ? (
            <ChunkyCard>
              <StateView kind="error" compact message={t("wish.create.affirmError")} onAction={onRegenerate} />
            </ChunkyCard>
          ) : (
            <AsterPrompt text={t("wish.create.affirmHint")} />
          )}
          <PaperCard lines={4} plain tilt={0.4}>
            <PaperInput
              value={value}
              onChangeText={onChange}
              placeholder={t("wish.create.writePlaceholder")}
              minLines={3}
              large
              maxLength={240}
              accessibilityLabel={t("wish.create.affirmA11y")}
            />
          </PaperCard>
          <ChunkyButton
            label={t("wish.create.regenerate")}
            variant="night"
            size="md"
            onPress={onRegenerate}
            icon={<Ionicons name="refresh" size={18} color={palette.night.on} />}
          />
        </>
      )}
    </>
  );
}

// ─── Step 4: when, and how often ─────────────────────────────────────────────

export function WhenStep({
  plant,
  onPlant,
  atNewMoon,
  daysToNew,
  waxing,
  powerDay,
  area,
  target,
  onTarget,
}: {
  plant: Plant;
  onPlant: (p: Plant) => void;
  atNewMoon: boolean;
  daysToNew: number;
  waxing: boolean;
  powerDay: string | null;
  area: LifeArea;
  target: number;
  onTarget: (n: number) => void;
}) {
  const { t, locale } = useTranslation();
  // Aster's pick: start now while the Moon grows; wait when the new moon is close.
  const pick: Plant = atNewMoon || waxing || daysToNew > 10 ? "now" : "newMoon";
  const options: { key: Plant; title: string; body: string }[] = atNewMoon
    ? [{ key: "now", title: t("wish.create.plantNowMoon"), body: t("wish.create.plantNowMoonBody") }]
    : [
        { key: "now", title: t("wish.create.plantNow"), body: t("wish.create.plantNowBody") },
        {
          key: "newMoon",
          title: t("wish.create.plantMoon"),
          body: t("wish.create.plantMoonBody", { when: whenLabel(t, daysToNew) }),
        },
      ];

  return (
    <>
      <AppText variant="title" accessibilityRole="header">
        {t("wish.create.plantTitle")}
      </AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((o) => (
          <OptionTile
            key={o.key}
            selected={atNewMoon || plant === o.key}
            onPress={() => onPlant(o.key)}
            title={o.title}
            body={o.body}
            badge={o.key === pick && options.length > 1 ? t("wish.create.recommended") : null}
            star={o.key === "newMoon" ? "waiting" : "spark"}
          />
        ))}
      </View>
      {powerDay ? (
        <View style={styles.note}>
          <Ionicons name="flash" size={16} color={colors.star[300]} />
          <AppText variant="body" style={styles.flex}>
            {t("wish.create.powerNote", {
              area: t(`wish.areas.${area}.inline` as TranslationKey),
              date: shortDate(locale, powerDay),
            })}
          </AppText>
        </View>
      ) : null}

      <AppText variant="heading" accessibilityRole="header" style={styles.subhead}>
        {t("wish.create.targetTitle")}
      </AppText>
      <View style={styles.targets} accessibilityRole="radiogroup">
        {[1, 2, 3].map((n) => {
          const selected = target === n;
          const label = t(`wish.create.target${n}` as TranslationKey);
          const body = t(`wish.create.target${n}Body` as TranslationKey);
          return (
            <PressableScale
              key={n}
              onPress={() => onTarget(n)}
              scaleTo={0.95}
              style={[styles.target, selected && styles.targetOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t("wish.create.targetA11y", { label, body })}
            >
              <AppText variant="stat" color={selected ? palette.star.on : colors.text.primary}>
                {n}
              </AppText>
              <AppText variant="labelLong" center numberOfLines={2} color={selected ? palette.star.on : colors.text.secondary}>
                {body}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </>
  );
}

function OptionTile({
  selected,
  onPress,
  title,
  body,
  badge,
  star,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  body: string;
  badge?: string | null;
  star: "spark" | "waiting";
}) {
  const p = palette.star;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      style={[styles.option, selected && { borderColor: p.face, borderBottomColor: p.slab, backgroundColor: p.soft }]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[title, body, badge].filter(Boolean).join(". ")}
    >
      <View style={styles.optionIcon} importantForAccessibility="no-hide-descendants">
        <WishStarGlyph look={star} size={36} />
      </View>
      <View style={styles.flex}>
        {badge ? (
          <View style={styles.badge}>
            <AppText variant="label" color={palette.mint.on}>
              {badge}
            </AppText>
          </View>
        ) : null}
        <AppText variant="heading">{title}</AppText>
        <AppText variant="bodySmall" color={colors.text.secondary}>
          {body}
        </AppText>
      </View>
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={24}
        color={selected ? p.face : colors.text.tertiary}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: {
    width: "47%",
    flexGrow: 1,
    minHeight: 132,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderBottomWidth: depth.lg,
  },
  tileHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  tileIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  counter: { alignSelf: "flex-end", marginTop: -spacing.sm },
  examples: { gap: spacing.sm },
  example: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    backgroundColor: surface.card,
  },
  options: { gap: spacing.md },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 76,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderBottomWidth: depth.md,
    borderColor: colors.border.chunky,
    borderBottomColor: surface.slab,
    backgroundColor: surface.card,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: surface.raised,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: palette.mint.face,
    marginBottom: 2,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.star.soft,
  },
  subhead: { marginTop: spacing.sm },
  targets: { flexDirection: "row", gap: spacing.sm },
  target: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    minHeight: 96,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderBottomWidth: depth.md,
    borderColor: colors.border.chunky,
    borderBottomColor: surface.slab,
    backgroundColor: surface.card,
  },
  targetOn: { backgroundColor: palette.star.face, borderColor: palette.star.face, borderBottomColor: palette.star.slab },
  flex: { flex: 1, minWidth: 0 },
});
