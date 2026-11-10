import { useEffect, useMemo, useState } from "react";
import { astrologyApi } from "../../services/astrologyApi";
import { cachedCall, dtoKey, houseKey } from "../../services/interpretationCache";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { personalLine, termText, type GlossaryTermId } from "../../lib/glossary";
import { aspectName } from "../../lib/astroLanguage";
import type { TFunction, TranslationKey, Locale } from "../../i18n";
import type {
  AspectInterpretation,
  BigThreeReading,
  ChartContext,
  ChartOverview,
  HouseInterpretation,
  NatalChartData,
  NodeAnalysis,
  PlacementInterpretation,
  SkyLessonKey,
} from "../../services/types";
import type { Tone } from "../../lib/design-system";

/** One page of a lesson. */
export interface LessonStep {
  key: string;
  kind: "why" | "read" | "echo";
  title: string;
  body: string;
  /** Astro glyph shown on the page (a planet name, "Ascendant", "NorthNode"). */
  glyph?: string;
  /** Small chips under the title ("House 7", "orb 1.2°"). */
  chips?: string[];
  /** ⓘ beside the title. */
  term?: GlossaryTermId;
}

export const LESSON_TONE: Record<SkyLessonKey, Tone> = {
  bigThree: "star",
  chartMood: "sky",
  personal: "candy",
  housesSelf: "mint",
  housesWorld: "mint",
  aspects: "primary",
  jupiterSaturn: "star",
  nodes: "sky",
};

export const LESSON_ICON: Record<SkyLessonKey, string> = {
  bigThree: "sunny",
  chartMood: "partly-sunny",
  personal: "heart",
  housesSelf: "home",
  housesWorld: "earth",
  aspects: "git-network",
  jupiterSaturn: "planet",
  nodes: "compass",
};

/**
 * Split a reading into `n` short pages. Paragraphs first; when there are
 * fewer paragraphs than pages, sentences are shared out evenly. Never returns
 * empty pages: a short text simply yields fewer of them.
 */
export function chunks(text: string, n: number): string[] {
  const clean = text.trim();
  if (!clean || n <= 1) return clean ? [clean] : [];
  const paras = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length >= n) {
    const per = Math.ceil(paras.length / n);
    return Array.from({ length: n }, (_, i) => paras.slice(i * per, (i + 1) * per).join("\n\n")).filter(Boolean);
  }
  const sentences = clean.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
  const per = Math.max(1, Math.ceil(sentences.length / n));
  return Array.from({ length: n }, (_, i) => sentences.slice(i * per, (i + 1) * per).join(" ")).filter(Boolean);
}

const sign = (t: TFunction, s: string) => {
  const k = `signs.${s}` as TranslationKey;
  const v = t(k);
  return v === k ? s : v;
};
const planet = (t: TFunction, p: string) => {
  const k = `planets.${p}` as TranslationKey;
  const v = t(k);
  return v === k ? p : v;
};

function why(t: TFunction, locale: Locale, term: GlossaryTermId, chart: NatalChartData | null, extra?: string): LessonStep {
  const profile = useAppStore.getState().birthProfile;
  const mine = personalLine(term, t, locale, chart, profile);
  return {
    key: "why",
    kind: "why",
    title: t("skypath.lesson.why"),
    body: [termText(t, term, "short"), mine, extra].filter(Boolean).join("\n\n"),
    term,
  };
}

function echo(t: TFunction): LessonStep {
  return { key: "echo", kind: "echo", title: t("skypath.lesson.echoQuestion"), body: "" };
}

interface LessonData {
  chart: NatalChartData | null;
  bigThree: BigThreeReading | null;
  overview: ChartOverview | null;
  context: ChartContext | null;
  placements: PlacementInterpretation[] | null;
  aspects: AspectInterpretation[] | null;
  nodes: NodeAnalysis | null;
  houses: HouseInterpretation[] | null;
  unknownTime: boolean;
}

/** The pages of one chapter, from whatever data it needs. Pure: no fetching. */
export function buildLesson(key: SkyLessonKey, d: LessonData, t: TFunction, locale: Locale): LessonStep[] {
  const c = d.chart;
  if (!c) return [];
  const placementText = (name: string) => d.placements?.find((p) => p.planet === name)?.text ?? "";
  const planetStep = (name: string): LessonStep | null => {
    const p = c.planets.find((x) => x.name === name);
    if (!p) return null;
    return {
      key: name,
      kind: "read",
      title: d.unknownTime
        ? t("skypath.lesson.planetTitle", { planet: planet(t, name), sign: sign(t, p.sign) })
        : t("skypath.lesson.planetHouse", { planet: planet(t, name), sign: sign(t, p.sign), house: p.house }),
      body: placementText(name),
      glyph: name,
    };
  };

  switch (key) {
    case "bigThree": {
      const parts = chunks(d.bigThree?.text ?? "", 3);
      const steps: LessonStep[] = [
        why(t, locale, "bigThree", c),
        {
          key: "sun",
          kind: "read",
          title: t("skypath.lesson.sunTitle", { sign: sign(t, c.summary.sunSign) }),
          body: parts[0] ?? termText(t, "sun", "short"),
          glyph: "Sun",
          term: "sun",
        },
        {
          key: "moon",
          kind: "read",
          title: t("skypath.lesson.moonTitle", { sign: sign(t, c.summary.moonSign) }),
          body: parts[1] ?? termText(t, "moon", "short"),
          glyph: "Moon",
          term: "moon",
        },
        {
          key: "rising",
          kind: "read",
          title: t("skypath.lesson.risingTitle", { sign: sign(t, c.summary.risingSign) }),
          body: d.unknownTime ? t("skypath.lesson.risingUnknown") : (parts[2] ?? termText(t, "rising", "short")),
          glyph: "Ascendant",
          term: "rising",
        },
      ];
      return [...steps, echo(t)];
    }
    case "chartMood": {
      const parts = chunks(d.overview?.text ?? "", 2);
      return [
        why(t, locale, "natalChart", c),
        {
          key: "element",
          kind: "read",
          title: t("skypath.lesson.elementTitle", {
            element: t(`elements.${c.summary.dominantElement}` as TranslationKey),
          }),
          body: parts[0] ?? "",
          chips: [planet(t, c.summary.dominantPlanet)],
        },
        {
          key: "modality",
          kind: "read",
          title: t("skypath.lesson.modalityTitle", {
            modality: t(`skypath.modalities.${c.summary.dominantModality}` as TranslationKey),
          }),
          body: parts[1] ?? parts[0] ?? "",
        },
        {
          key: "sect",
          kind: "read",
          title: c.sect === "day" ? t("skypath.lesson.sectDay") : t("skypath.lesson.sectNight"),
          body: chunks(d.context?.text ?? "", 2)[0] ?? termText(t, "dayNightChart", "short"),
          glyph: c.sect === "day" ? "Sun" : "Moon",
          term: "dayNightChart",
        },
        echo(t),
      ];
    }
    case "personal":
      return [
        why(t, locale, "planet", c),
        ...(["Mercury", "Venus", "Mars"].map(planetStep).filter(Boolean) as LessonStep[]),
        echo(t),
      ];
    case "housesSelf":
    case "housesWorld": {
      const range = key === "housesSelf" ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
      return [
        why(t, locale, "house", c),
        ...range.map((n) => {
          const h = c.houses.find((x) => x.house === n);
          const reading = d.houses?.find((x) => x.house === n);
          return {
            key: `h${n}`,
            kind: "read" as const,
            title: t("skypath.lesson.houseTitle", { n, sign: sign(t, h?.sign ?? "") }),
            body: chunks(reading?.text ?? "", 2)[0] ?? "",
            chips: (h?.planetsInHouse ?? []).map((p) => planet(t, p)),
            term: n === 1 ? ("house" as const) : undefined,
          };
        }),
        echo(t),
      ];
    }
    case "aspects": {
      const top = [...(d.aspects ?? [])].sort((a, b) => a.orb - b.orb).slice(0, 4);
      return [
        why(t, locale, "aspect", c),
        ...top.map((a) => ({
          key: `${a.planet1}-${a.aspect}-${a.planet2}`,
          kind: "read" as const,
          title: t("skypath.lesson.aspectTitle", {
            a: planet(t, a.planet1),
            aspect: aspectName(t, a.aspect).toLocaleLowerCase(locale),
            b: planet(t, a.planet2),
          }),
          body: chunks(a.text, 2)[0] ?? "",
          glyph: a.planet1,
          chips: [`${a.orb.toFixed(1)}°`],
          term: "orb" as const,
        })),
        echo(t),
      ];
    }
    case "jupiterSaturn":
      return [
        why(t, locale, "saturnReturn", c),
        ...([planetStep("Jupiter"), planetStep("Saturn")].filter(Boolean) as LessonStep[]),
        {
          key: "saturnReturn",
          kind: "read",
          title: t("skypath.lesson.saturnReturn", { age: d.context?.saturnReturnAge ?? c.saturn.returnAge }),
          body: chunks(d.context?.text ?? "", 2)[1] ?? chunks(d.context?.text ?? "", 2)[0] ?? "",
          glyph: "Saturn",
          term: "saturnReturn",
        },
        echo(t),
      ];
    case "nodes": {
      const parts = chunks(d.nodes?.text ?? "", 2);
      return [
        why(t, locale, "northNode", c),
        {
          key: "north",
          kind: "read",
          title: t("skypath.lesson.nodeNorth", { sign: sign(t, c.nodes.north.sign) }),
          body: parts[0] ?? "",
          glyph: "NorthNode",
          chips: d.unknownTime ? [] : [t("skypath.lesson.houseChip", { n: c.nodes.north.house })],
        },
        {
          key: "south",
          kind: "read",
          title: t("skypath.lesson.nodeSouth", { sign: sign(t, c.nodes.south.sign) }),
          body: parts[1] ?? parts[0] ?? "",
          glyph: "SouthNode",
        },
        echo(t),
      ];
    }
  }
}

/** Which readings a chapter needs. */
const NEEDS: Record<SkyLessonKey, (keyof LessonData)[]> = {
  bigThree: ["bigThree"],
  chartMood: ["overview", "context"],
  personal: ["placements"],
  housesSelf: ["houses"],
  housesWorld: ["houses"],
  aspects: ["aspects"],
  jupiterSaturn: ["placements", "context"],
  nodes: ["nodes"],
};

/**
 * Loads exactly what one chapter needs (sharing the reading cache with the
 * rest of the app, so a chapter read once opens instantly) and builds its
 * pages. Pages appear as soon as the chart is in; a reading still on its way
 * shows a shimmer inside its page.
 */
export function useLesson(key: SkyLessonKey, t: TFunction, locale: Locale) {
  const dto = useBirthDto();
  const unknownTime = useAppStore((s) => s.birthProfile?.unknownTime ?? false);
  const k = dto ? dtoKey(dto) : null;
  const need = NEEDS[key];
  const want = (name: keyof LessonData) => (k && need.includes(name) ? k : null);

  const chart = useCachedAsync<NatalChartData>(k && `chart|${k}`, () => astrologyApi.getNatalChart(dto!));
  const bigThree = useCachedAsync<BigThreeReading>(want("bigThree") && `bigThree|${k}|${locale}`, () =>
    astrologyApi.getBigThree(dto!, locale),
  );
  const overview = useCachedAsync<ChartOverview>(want("overview") && `overview|${k}|${locale}`, () =>
    astrologyApi.getChartOverview(dto!, locale),
  );
  const context = useCachedAsync<ChartContext>(want("context") && `context|${k}|${locale}`, () =>
    astrologyApi.getChartContext(dto!, locale),
  );
  const placements = useCachedAsync<PlacementInterpretation[]>(
    want("placements") && `placements|${k}|${locale}`,
    () => astrologyApi.getPlacementInterpretations(dto!, locale),
  );
  const aspects = useCachedAsync<AspectInterpretation[]>(want("aspects") && `aspects|${k}|${locale}`, () =>
    astrologyApi.getAspectInterpretations(dto!, locale),
  );
  const nodes = useCachedAsync<NodeAnalysis>(want("nodes") && `nodes|${k}|${locale}`, () =>
    astrologyApi.getNodes(dto!, locale),
  );

  const [houses, setHouses] = useState<HouseInterpretation[] | null>(null);
  const [housesError, setHousesError] = useState(false);
  const [housesNonce, setHousesNonce] = useState(0);
  const houseRange = key === "housesSelf" ? [1, 2, 3, 4, 5, 6] : key === "housesWorld" ? [7, 8, 9, 10, 11, 12] : [];
  useEffect(() => {
    if (!dto || houseRange.length === 0) return;
    let active = true;
    setHousesError(false);
    Promise.all(
      houseRange.map((n) => cachedCall(houseKey(dto, n, locale), () => astrologyApi.getHouseInterpretation(dto, n, locale))),
    )
      .then((rows) => active && setHouses(rows))
      .catch(() => active && setHousesError(true));
    return () => {
      active = false;
    };
    // houseRange is derived from key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dto, key, locale, housesNonce]);

  const parts = { bigThree, overview, context, placements, aspects, nodes };
  const pending = need.some((n) => (n === "houses" ? houses === null && !housesError : parts[n as keyof typeof parts]?.loading));
  const failed =
    !!chart.error ||
    need.some((n) => (n === "houses" ? housesError : !!parts[n as keyof typeof parts]?.error && !parts[n as keyof typeof parts]?.data));

  const steps = useMemo(
    () =>
      buildLesson(
        key,
        {
          chart: chart.data,
          bigThree: bigThree.data,
          overview: overview.data,
          context: context.data,
          placements: placements.data,
          aspects: aspects.data,
          nodes: nodes.data,
          houses,
          unknownTime,
        },
        t,
        locale,
      ),
    [key, chart.data, bigThree.data, overview.data, context.data, placements.data, aspects.data, nodes.data, houses, unknownTime, t, locale],
  );

  const reload = () => {
    chart.reload();
    for (const n of need) {
      if (n === "houses") setHousesNonce((x) => x + 1);
      else parts[n as keyof typeof parts]?.reload();
    }
  };

  return { steps, chartLoading: chart.loading && !chart.data, pending, failed, reload };
}
