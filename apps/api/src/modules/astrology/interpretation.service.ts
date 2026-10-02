import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AI_TEXT_PROVIDER, AiTextProvider } from '../ai/ai-text-provider';
import {
  NatalChartData,
  TransitData,
  TransitReport,
  TransitMovement,
} from './astrology-adapter.service';
import { ASPECT_NATURE } from './astrology.constants';
import {
  AspectInterpretation,
  BigThreeReading,
  ChartContext,
  ChartOverview,
  CompatibilityReading,
  DailyInsight,
  EnergyState,
  Forecast,
  ForecastPeriod,
  ForecastTheme,
  GuidanceAnswer,
  HouseInterpretation,
  Locale,
  NodeAnalysis,
  PlacementInterpretation,
  TransitDetail,
  TransitOverview,
  YearAhead,
} from './interpretation.types';
import { CompatibilityScore } from './synastry.service';
import {
  systemPrompt,
  placementPrompt,
  bigThreePrompt,
  aspectPrompt,
  overviewPrompt,
  dailyInsightPrompt,
  housePrompt,
  nodesPrompt,
  chartContextPrompt,
  transitDetailPrompt,
  transitOverviewPrompt,
  compatibilityPrompt,
  forecastPrompt,
  yearAheadPrompt,
  guidancePrompt,
  affirmationPrompt,
} from './prompts/interpretation.prompts';
import {
  placementStub,
  bigThreeStub,
  aspectStub,
  overviewStub,
  dailyInsightStub,
  houseStub,
  nodesStub,
  chartContextStub,
  transitDetailStub,
  transitOverviewStub,
  compatibilityStub,
  forecastStub,
  yearAheadStub,
  guidanceStub,
  affirmationStub,
} from './prompts/interpretation.stubs';
import { safeError } from '../../common/logging/safe-error';
import { trackAiCalls } from '../../common/ai/ai-call-tracker';
import { currentDeviceId } from '../../common/context/request-context';

/** Bump when prompts/persona change so caches invalidate. */
const CACHE_VERSION = 'v10';

type InterpretationKind =
  | 'PLACEMENT'
  | 'BIG_THREE'
  | 'ASPECT'
  | 'OVERVIEW'
  | 'DAILY_INSIGHT'
  | 'HOUSE'
  | 'NODES'
  | 'CHART_CONTEXT'
  | 'TRANSIT'
  | 'TRANSIT_OVERVIEW'
  | 'COMPATIBILITY'
  | 'FORECAST_WEEKLY'
  | 'FORECAST_MONTHLY'
  | 'GUIDANCE'
  | 'INTENTION_AFFIRMATION'
  | 'YEAR_AHEAD'
  | 'REPORT_NATAL_EXTRAS'
  | 'TRANSIT_SPOTLIGHT'
  | 'TRANSIT_QUARTER';

/** Kinds another module (reports) may store through `cachedReading`. */
export type ExternalReadingKind = 'REPORT_NATAL_EXTRAS' | 'TRANSIT_SPOTLIGHT' | 'TRANSIT_QUARTER';

@Injectable()
export class InterpretationService {
  private readonly logger = new Logger(InterpretationService.name);

  constructor(
    @Inject(AI_TEXT_PROVIDER) private readonly ai: AiTextProvider,
    private readonly prisma: PrismaService,
  ) {}

  async getPlacements(
    chart: NatalChartData,
    locale: Locale,
  ): Promise<PlacementInterpretation[]> {
    const points = [
      ...chart.planets.map((p) => ({
        planet: p.name,
        sign: p.sign,
        house: p.house,
        retrograde: p.retrograde,
      })),
      {
        planet: 'Ascendant',
        sign: chart.angles.ascendant.sign,
        house: 1,
        retrograde: false,
      },
    ];

    return Promise.all(
      points.map((pt) =>
        this.cached<PlacementInterpretation>(
          'PLACEMENT',
          locale,
          `placement|${pt.planet}|${pt.sign}|${pt.house}|${pt.retrograde}`,
          async () => {
            const text = await this.text(
              locale,
              placementPrompt(locale, pt.planet, pt.sign, pt.house, pt.retrograde),
              () => placementStub(locale, pt.planet, pt.sign, pt.house, pt.retrograde),
            );
            return { ...pt, text };
          },
        ),
      ),
    );
  }

  async getBigThree(chart: NatalChartData, locale: Locale): Promise<BigThreeReading> {
    const { sunSign, moonSign, risingSign } = chart.summary;
    return this.cached<BigThreeReading>(
      'BIG_THREE',
      locale,
      `bigthree|${sunSign}|${moonSign}|${risingSign}`,
      async () => {
        const text = await this.text(
          locale,
          bigThreePrompt(locale, sunSign, moonSign, risingSign),
          () => bigThreeStub(locale, sunSign, moonSign, risingSign),
        );
        return { sunSign, moonSign, risingSign, text };
      },
    );
  }

  async getAspects(
    chart: NatalChartData,
    locale: Locale,
    limit = 8,
  ): Promise<AspectInterpretation[]> {
    const top = [...chart.aspects].sort((a, b) => a.orb - b.orb).slice(0, limit);
    return Promise.all(
      top.map((a) =>
        this.cached<AspectInterpretation>(
          'ASPECT',
          locale,
          `aspect|${a.planet1}|${a.planet2}|${a.aspect}|${Math.round(a.orb)}`,
          async () => {
            const text = await this.text(
              locale,
              aspectPrompt(locale, a.planet1, a.planet2, a.aspect, a.type),
              () => aspectStub(locale, a.planet1, a.planet2, a.aspect, a.type),
            );
            return {
              planet1: a.planet1,
              planet2: a.planet2,
              aspect: a.aspect,
              type: a.type,
              orb: a.orb,
              text,
            };
          },
        ),
      ),
    );
  }

  async getOverview(chart: NatalChartData, locale: Locale): Promise<ChartOverview> {
    const { sunSign, moonSign, risingSign, dominantElement, dominantModality } = chart.summary;
    const chartHash = this.hash(
      `${sunSign}${moonSign}${risingSign}${dominantElement}${dominantModality}`,
    );
    return this.cached<ChartOverview>(
      'OVERVIEW',
      locale,
      `overview|${chartHash}`,
      async () => {
        const text = await this.text(
          locale,
          overviewPrompt(locale, sunSign, moonSign, risingSign, dominantElement, dominantModality),
          () => overviewStub(locale, sunSign, dominantElement, dominantModality),
        );
        return { text };
      },
    );
  }

  async getDailyInsight(
    chart: NatalChartData,
    transits: TransitData,
    deviceId: string,
    locale: Locale,
    date: string,
  ): Promise<DailyInsight> {
    const energyState = this.energyStateFromTransits(transits);
    return this.cached<DailyInsight>(
      'DAILY_INSIGHT',
      locale,
      `insight|${deviceId}|${date}`,
      async () => {
        if (!this.ai.available) {
          return dailyInsightStub(locale, energyState);
        }
        try {
          const lines = transits.transits
            .slice(0, 4)
            .map((t) => `${t.transitPlanet} ${t.aspect} ${t.natalPlanet}`);
          const { user, schemaHint } = dailyInsightPrompt(locale, chart.summary.sunSign, lines);
          const parsed = await this.ai.generateJson<{
            energyState?: string;
            title?: string;
            summary?: string;
          }>({ system: systemPrompt(locale), user, schemaHint, temperature: 0.8, maxTokens: 1400 });
          const state = this.coerceEnergyState(parsed.energyState) ?? energyState;
          const stub = dailyInsightStub(locale, state);
          return {
            energyState: state,
            // Generous caps only — a low cap (was 320) chopped longer Turkish
            // summaries mid-sentence. The prompt already bounds this to 2-3 sentences.
            title: (parsed.title ?? stub.title).slice(0, 120),
            summary: (parsed.summary ?? stub.summary).slice(0, 700),
          };
        } catch (err) {
          this.logger.warn(`daily insight AI failed: ${safeError(err)}`);
          return dailyInsightStub(locale, energyState);
        }
      },
    );
  }

  async getHouse(
    chart: NatalChartData,
    houseNumber: number,
    locale: Locale,
  ): Promise<HouseInterpretation> {
    const house = chart.houses.find((h) => h.house === houseNumber) ?? chart.houses[0];
    // Aspects involving planets that sit in this house.
    const inHouse = new Set(house.planetsInHouse);
    const planetAspects = chart.aspects
      .filter((a) => inHouse.has(a.planet1) || inHouse.has(a.planet2))
      .map((a) => `${a.planet1} ${a.aspect} ${a.planet2}`);

    return this.cached<HouseInterpretation>(
      'HOUSE',
      locale,
      `house|${house.house}|${house.sign}|${house.ruler}|${house.rulerSign}|${house.rulerHouse}|${house.planetsInHouse.join(',')}`,
      async () => {
        const text = await this.text(
          locale,
          housePrompt(locale, {
            house: house.house,
            sign: house.sign,
            ruler: house.ruler,
            rulerSign: house.rulerSign,
            rulerHouse: house.rulerHouse,
            planetsInHouse: house.planetsInHouse,
            planetAspects,
          }),
          () =>
            houseStub(
              locale,
              house.house,
              house.sign,
              house.ruler,
              house.rulerSign,
              house.rulerHouse,
              house.planetsInHouse,
            ),
        );
        return {
          house: house.house,
          sign: house.sign,
          ruler: house.ruler,
          rulerSign: house.rulerSign,
          rulerHouse: house.rulerHouse,
          planetsInHouse: house.planetsInHouse,
          text,
        };
      },
    );
  }

  async getNodes(chart: NatalChartData, locale: Locale): Promise<NodeAnalysis> {
    const { north, south } = chart.nodes;
    return this.cached<NodeAnalysis>(
      'NODES',
      locale,
      `nodes|${north.sign}|${north.house}|${south.sign}|${south.house}`,
      async () => {
        const text = await this.text(
          locale,
          nodesPrompt(locale, {
            northSign: north.sign,
            northHouse: north.house,
            southSign: south.sign,
            southHouse: south.house,
          }),
          () => nodesStub(locale, north.sign, north.house, south.sign, south.house),
        );
        return {
          northSign: north.sign,
          northHouse: north.house,
          southSign: south.sign,
          southHouse: south.house,
          text,
        };
      },
    );
  }

  async getChartContext(chart: NatalChartData, locale: Locale): Promise<ChartContext> {
    const { sect, saturn } = chart;
    return this.cached<ChartContext>(
      'CHART_CONTEXT',
      locale,
      `context|${sect}|${saturn.natalSign}|${saturn.natalHouse}`,
      async () => {
        const text = await this.text(
          locale,
          chartContextPrompt(locale, {
            sect,
            saturnSign: saturn.natalSign,
            saturnHouse: saturn.natalHouse,
            saturnReturnAge: saturn.returnAge,
          }),
          () =>
            chartContextStub(
              locale,
              sect,
              saturn.natalSign,
              saturn.natalHouse,
              saturn.returnAge,
            ),
        );
        return {
          sect,
          saturnReturnAge: saturn.returnAge,
          saturnSign: saturn.natalSign,
          saturnHouse: saturn.natalHouse,
          text,
        };
      },
    );
  }

  /** Deep interpretation of one transiting planet's effect on the natal chart. */
  async getTransitDetail(
    movement: TransitMovement,
    date: string,
    locale: Locale,
  ): Promise<TransitDetail> {
    const aspectSig = movement.aspects
      .map((a) => `${a.natalPlanet}${a.aspect}`)
      .join(',');
    return this.cached<TransitDetail>(
      'TRANSIT',
      locale,
      `transit|${date}|${movement.planet}|${movement.natalHouse}|${movement.sign}|${aspectSig}`,
      async () => {
        const text = await this.text(
          locale,
          transitDetailPrompt(locale, {
            planet: movement.planet,
            sign: movement.sign,
            natalHouse: movement.natalHouse,
            daysInHouse: movement.daysInHouse,
            retrograde: movement.retrograde,
            aspects: movement.aspects.map((a) => ({
              natalPlanet: a.natalPlanet,
              aspect: a.aspect,
              nature: a.nature,
            })),
          }),
          () =>
            transitDetailStub(
              locale,
              movement.planet,
              movement.sign,
              movement.natalHouse,
              movement.retrograde,
            ),
        );
        return {
          planet: movement.planet,
          sign: movement.sign,
          natalHouse: movement.natalHouse,
          daysInHouse: movement.daysInHouse,
          retrograde: movement.retrograde,
          aspects: movement.aspects,
          text,
        };
      },
    );
  }

  /** The day's overall sky weather (opportunities + cautions) for this chart. */
  async getTransitOverview(
    report: TransitReport,
    locale: Locale,
  ): Promise<TransitOverview> {
    const highlights = report.movements
      .flatMap((m) =>
        m.aspects.slice(0, 1).map((a) => `${m.planet} ${a.aspect} natal ${a.natalPlanet}`),
      )
      .slice(0, 6);
    const sig = this.hash(
      highlights.join('|') +
        report.skyAspects.map((a) => `${a.planet1}${a.aspect}${a.planet2}`).join('|'),
    );
    return this.cached<TransitOverview>(
      'TRANSIT_OVERVIEW',
      locale,
      `transitov|${report.date}|${sig}`,
      async () => {
        const text = await this.text(
          locale,
          transitOverviewPrompt(locale, {
            date: report.date,
            highlights,
            skyAspects: report.skyAspects.map((a) => ({
              planet1: a.planet1,
              planet2: a.planet2,
              aspect: a.aspect,
              nature: a.nature,
            })),
          }),
          () => transitOverviewStub(locale, report.date),
        );
        return { date: report.date, text };
      },
    );
  }

  /** AI reading of the synastry between two charts (order-preserving: A = owner). */
  async getCompatibility(
    args: {
      selfSun: string;
      selfMoon: string;
      otherSun: string;
      otherMoon: string;
      selfKey: string; // owner birth signature
      otherKey: string; // other person's birth signature
    },
    score: CompatibilityScore,
    locale: Locale,
  ): Promise<CompatibilityReading> {
    return this.cached<CompatibilityReading>(
      'COMPATIBILITY',
      locale,
      `synastry|${args.selfKey}|${args.otherKey}`,
      async () => {
        if (!this.ai.available) {
          return compatibilityStub(locale, score.overall, score.dimensions);
        }
        try {
          const { user, schemaHint } = compatibilityPrompt(locale, {
            selfSun: args.selfSun,
            selfMoon: args.selfMoon,
            otherSun: args.otherSun,
            otherMoon: args.otherMoon,
            overall: score.overall,
            dimensions: score.dimensions,
            topAspects: score.topAspects.map((a) => ({
              planetA: a.planetA,
              planetB: a.planetB,
              aspect: a.aspect,
              nature: a.nature,
            })),
          });
          const parsed = await this.ai.generateJson<{ text?: string; headline?: string }>({
            system: systemPrompt(locale),
            user,
            schemaHint,
            temperature: 0.75,
            maxTokens: 2000,
          });
          const stub = compatibilityStub(locale, score.overall, score.dimensions);
          const text = (parsed.text ?? '').trim();
          const headline = (parsed.headline ?? '').trim();
          return {
            text: text.length > 0 ? text.slice(0, 4000) : stub.text,
            headline: headline.length > 0 ? headline.slice(0, 80) : stub.headline,
          };
        } catch (err) {
          this.logger.warn(`compatibility AI failed: ${safeError(err)}`);
          return compatibilityStub(locale, score.overall, score.dimensions);
        }
      },
    );
  }

  /** Weekly/monthly AI forecast grounded in the window's real transits. */
  async getForecast(
    period: ForecastPeriod,
    args: {
      start: string;
      end: string;
      sun: string;
      transits: string[];
      ingresses: string[];
      stations: string[];
      keyDates: string[];
    },
    chartSig: string,
    periodKey: string,
    locale: Locale,
  ): Promise<Forecast> {
    const kind: InterpretationKind =
      period === 'weekly' ? 'FORECAST_WEEKLY' : 'FORECAST_MONTHLY';
    return this.cached<Forecast>(
      kind,
      locale,
      `forecast|${period}|${chartSig}|${periodKey}`,
      async () => {
        if (!this.ai.available) {
          return forecastStub(locale, period, args.start);
        }
        try {
          const { user, schemaHint } = forecastPrompt(locale, { period, ...args });
          const parsed = await this.ai.generateJson<{
            overview?: string;
            themes?: { area?: string; text?: string }[];
            keyDates?: { date?: string; label?: string }[];
          }>({
            system: systemPrompt(locale),
            user,
            schemaHint,
            temperature: 0.8,
            // Forecast prose is long across four life-areas — a generous cap
            // prevents starved/truncated output (billing is on actual tokens).
            maxTokens: period === 'weekly' ? 3000 : 3800,
          });
          const stub = forecastStub(locale, period, args.start);
          const themes = this.coerceThemes(parsed.themes) ?? stub.themes;
          const keyDates = Array.isArray(parsed.keyDates)
            ? parsed.keyDates
                .filter((k) => k && k.date && k.label)
                .map((k) => ({ date: String(k.date), label: String(k.label).slice(0, 80) }))
                .slice(0, 6)
            : stub.keyDates;
          return {
            period,
            start: args.start,
            overview: (parsed.overview ?? stub.overview).slice(0, 2000),
            themes,
            keyDates,
          };
        } catch (err) {
          this.logger.warn(`forecast AI failed: ${safeError(err)}`);
          return forecastStub(locale, period, args.start);
        }
      },
    );
  }

  /**
   * The Solar Return reading, in plain language. Cached per chart + cycle: the
   * window only rolls over on a birthday, so one entry serves the whole year.
   */
  async getYearAhead(
    args: {
      start: string;
      end: string;
      age: number;
      emphasis: string[];
      sunTheme: string;
      angular: string[];
      focusAreas: string[];
      turningPoints: { month: string; area: string }[];
    },
    chartSig: string,
    locale: Locale,
  ): Promise<YearAhead> {
    const stubArgs = {
      start: args.start,
      end: args.end,
      age: args.age,
      focusAreas: args.focusAreas,
      turningPoints: args.turningPoints,
    };
    return this.cached<YearAhead>(
      'YEAR_AHEAD',
      locale,
      `yearahead|${chartSig}|${args.start}`,
      async () => {
        if (!this.ai.available) return yearAheadStub(locale, stubArgs);
        try {
          const { user, schemaHint } = yearAheadPrompt(locale, {
            ...args,
            turningPoints: args.turningPoints.map((t) => `${t.month} (${t.area})`),
          });
          const parsed = await this.ai.generateJson<{
            headline?: string;
            overview?: string;
            strengths?: { area?: string; text?: string }[];
            tender?: { area?: string; text?: string }[];
            turningPoints?: { month?: string; label?: string }[];
            why?: string;
          }>({
            system: systemPrompt(locale),
            user,
            schemaHint,
            temperature: 0.8,
            // A full year across six fields — the same generous cap the
            // monthly forecast uses, for the same reason.
            maxTokens: 3200,
          });
          const stub = yearAheadStub(locale, stubArgs);
          // The model is asked for months we supplied; anything else is dropped
          // rather than surfaced, so a hallucinated date never reaches the UI.
          const allowed = new Set(args.turningPoints.map((t) => t.month));
          const turningPoints = Array.isArray(parsed.turningPoints)
            ? parsed.turningPoints
                .filter((k) => k && k.month && k.label && allowed.has(String(k.month)))
                .map((k) => ({
                  month: String(k.month),
                  label: String(k.label).slice(0, 120),
                }))
            : stub.turningPoints;
          return {
            start: args.start,
            end: args.end,
            age: args.age,
            headline: (parsed.headline ?? stub.headline).slice(0, 160),
            overview: (parsed.overview ?? stub.overview).slice(0, 2000),
            strengths: this.coerceThemes(parsed.strengths) ?? stub.strengths,
            tender: this.coerceThemes(parsed.tender) ?? stub.tender,
            turningPoints: turningPoints.length ? turningPoints : stub.turningPoints,
            why: (parsed.why ?? stub.why).slice(0, 1200),
          };
        } catch (err) {
          this.logger.warn(`year-ahead AI failed: ${safeError(err)}`);
          return yearAheadStub(locale, stubArgs);
        }
      },
    );
  }

  /** Question-first guidance answer for a home-screen chip, cached per device+topic+day. */
  async getGuidance(
    args: {
      topic: string;
      sun: string;
      moon: string;
      transits: string[];
      memory?: string;
    },
    deviceId: string,
    date: string,
    locale: Locale,
  ): Promise<GuidanceAnswer> {
    return this.cached<GuidanceAnswer>(
      'GUIDANCE',
      locale,
      `guidance|${deviceId}|${args.topic}|${date}`,
      async () => {
        if (!this.ai.available) return guidanceStub(locale, args.topic);
        try {
          const { user, schemaHint } = guidancePrompt(locale, args);
          const parsed = await this.ai.generateJson<{
            takeaway?: string;
            why?: string;
            actions?: string[];
          }>({ system: systemPrompt(locale), user, schemaHint, temperature: 0.8, maxTokens: 900 });
          const stub = guidanceStub(locale, args.topic);
          return {
            topic: args.topic,
            takeaway: (parsed.takeaway ?? stub.takeaway).slice(0, 240),
            why: (parsed.why ?? stub.why).slice(0, 600),
            actions: Array.isArray(parsed.actions) && parsed.actions.length
              ? parsed.actions.slice(0, 3).map((a) => String(a).slice(0, 160))
              : stub.actions,
          };
        } catch (err) {
          this.logger.warn(`guidance AI failed: ${safeError(err)}`);
          return guidanceStub(locale, args.topic);
        }
      },
    );
  }

  /** A believable, chart-framed affirmation for an intention. Cached per chart+goal. */
  async getAffirmation(
    args: { goalText: string; lifeArea: string; moonSign: string; sunSign: string },
    locale: Locale,
  ): Promise<string> {
    return this.cached<{ text: string }>(
      'INTENTION_AFFIRMATION',
      locale,
      `affirmation|${args.sunSign}|${args.moonSign}|${args.lifeArea}|${args.goalText}`,
      async () => {
        if (!this.ai.available) return { text: affirmationStub(locale, args.goalText) };
        try {
          const { user, schemaHint } = affirmationPrompt(locale, {
            goalText: args.goalText,
            lifeArea: args.lifeArea,
            moonSign: args.moonSign,
          });
          const parsed = await this.ai.generateJson<{ affirmation?: string }>({
            system: systemPrompt(locale),
            user,
            schemaHint,
            temperature: 0.85,
            maxTokens: 400,
          });
          const text = (parsed.affirmation ?? '').trim();
          return { text: text.length > 0 ? text.slice(0, 300) : affirmationStub(locale, args.goalText) };
        } catch (err) {
          this.logger.warn(`affirmation AI failed: ${safeError(err)}`);
          return { text: affirmationStub(locale, args.goalText) };
        }
      },
    ).then((r) => r.text);
  }

  private coerceThemes(
    raw?: { area?: string; text?: string }[],
  ): ForecastTheme[] | null {
    if (!Array.isArray(raw)) return null;
    const valid: ForecastTheme['area'][] = ['love', 'career', 'money', 'energy'];
    const themes = raw
      .filter((t) => t && t.text && valid.includes((t.area ?? '') as ForecastTheme['area']))
      .map((t) => ({ area: t.area as ForecastTheme['area'], text: String(t.text).slice(0, 700) }));
    return themes.length > 0 ? themes : null;
  }

  // ─── internals ───────────────────────────────────────────────────────────────

  /** Read-through cache: hit returns stored content; miss runs `build`, persists, returns. */
  /**
   * The same read-through cache (versioned key, stubs never stored, device-owned
   * rows tagged) for readings built outside this service — the PDF reports.
   */
  cachedReading<T>(
    kind: ExternalReadingKind,
    locale: Locale,
    rawKey: string,
    build: () => Promise<T>,
  ): Promise<T> {
    return this.cached(kind, locale, rawKey, build);
  }

  private async cached<T>(
    kind: InterpretationKind,
    locale: Locale,
    rawKey: string,
    build: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = this.hash(`${CACHE_VERSION}|${locale}|${rawKey}`);
    try {
      const hit = await this.prisma.interpretation.findUnique({ where: { cacheKey } });
      if (hit) return hit.content as T;
    } catch (err) {
      this.logger.warn(`cache read failed: ${safeError(err)}`);
    }

    // No key: the result is templated text — serve it, never store it.
    if (!this.ai.available) return build();
    const { value: content, failed } = await trackAiCalls(build);
    // An AI call failed while building, so (part of) this is stub text: serve, don't cache.
    if (failed) return content;

    try {
      await this.prisma.interpretation.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          kind,
          locale,
          content: content as object,
          model: this.ai.model,
          // Device-specific readings are tagged so the device's data deletion removes them.
          deviceId: this.ownerOf(rawKey),
        },
        update: {},
      });
    } catch (err) {
      this.logger.warn(`cache write failed: ${safeError(err)}`);
    }
    return content;
  }

  /** Generate a single `{text}` result via the provider, or the stub on failure/no-key. */
  private async text(
    locale: Locale,
    prompt: { user: string; schemaHint: string },
    stub: () => string,
  ): Promise<string> {
    if (!this.ai.available) return stub();
    try {
      const parsed = await this.ai.generateJson<{ text?: string }>({
        system: systemPrompt(locale),
        user: prompt.user,
        schemaHint: prompt.schemaHint,
        temperature: 0.75,
        // v4 models spend reasoning tokens before output; a generous cap is
        // free (billing is on actual completion) and prevents starved output
        // that would otherwise end mid-sentence.
        maxTokens: 2500,
      });
      const text = (parsed.text ?? '').trim();
      // No hard length cap here — the prompts bound the word count. `slice(4000)`
      // is only a runaway guard; a lower cap (e.g. 900) chopped readings
      // mid-sentence.
      return text.length > 0 ? text.slice(0, 4000) : stub();
    } catch (err) {
      this.logger.warn(`interpretation AI failed: ${safeError(err)}`);
      return stub();
    }
  }

  private energyStateFromTransits(transits: TransitData): EnergyState {
    const harmonic = transits.transits.filter((t) => ASPECT_NATURE[t.aspect] === 'harmonic').length;
    const challenging = transits.transits.filter((t) => ASPECT_NATURE[t.aspect] === 'challenging').length;
    if (challenging > harmonic + 2) return 'OVERLOAD';
    if (challenging > harmonic) return 'STRESS';
    if (harmonic > challenging + 2) return 'HARMONY';
    return 'MOMENTUM';
  }

  private coerceEnergyState(v?: string): EnergyState | null {
    const up = (v ?? '').toUpperCase();
    return up === 'HARMONY' || up === 'MOMENTUM' || up === 'STRESS' || up === 'OVERLOAD'
      ? (up as EnergyState)
      : null;
  }

  private hash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  /** The current device, if this cache key is specific to it. */
  private ownerOf(rawKey: string): string | null {
    const deviceId = currentDeviceId();
    return deviceId && rawKey.includes(deviceId) ? deviceId : null;
  }
}
