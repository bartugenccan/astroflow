import { createHash } from 'crypto';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { runAsDevice } from '../../common/context/request-context';
import { safeError } from '../../common/logging/safe-error';
import { AI_TEXT_PROVIDER, AiTextProvider } from '../ai/ai-text-provider';
import { DeepSeekBalanceService } from '../ai/deepseek-balance.service';
import { AstrologyAdapterService, NatalChartData } from '../astrology/astrology-adapter.service';
import {
  ELEMENT_BY_SIGN,
  MODALITY_BY_SIGN,
  Sign,
  TRADITIONAL_SIGN_RULER,
} from '../astrology/astrology.constants';
import { InterpretationService } from '../astrology/interpretation.service';
import { Locale } from '../astrology/interpretation.types';
import { systemPrompt } from '../astrology/prompts/interpretation.prompts';
import { addDays } from '../astrology/sky-scan';
import { TimelineEvent, TransitTimelineService } from '../astrology/transit-timeline.service';
import { CreateReportDto } from './dto/create-report.dto';
import { natalExtrasPrompt, quarterPrompt, spotlightPrompt } from './prompts/report.prompts';
import { natalExtrasStub, quarterStub, spotlightStub } from './prompts/report.stubs';
import { describeEvent } from './report.labels';
import {
  NatalBalance,
  NatalExtras,
  NatalReportData,
  ReportBirth,
  ReportMeta,
  TransitQuarter,
  TransitReportData,
  TransitSpotlight,
} from './reports.types';

/** Parallel AI sections per report — quick, without flooding the provider. */
const CONCURRENCY = 4;
/** Progress is written at most this often (plus the final step). */
const PROGRESS_WRITE_MS = 700;
/** A job still "running" this long after its last update was interrupted (restart). */
const STALE_MS = 15 * 60_000;
const SPOTLIGHTS = 8;
const QUARTERS = 8;
/** Steps per kind, for the progress bar. */
const NATAL_STEPS = 19; // big three, overview, context, placements, aspects, nodes, extras + 12 houses
const TRANSIT_STEPS = 1 + 10 + 1 + SPOTLIGHTS + QUARTERS; // overview, 10 planets, timeline, spotlights, quarters

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Long PDF reports. A report is a background job: the request returns at once
 * with an id, the sections are generated (reusing every cached reading) with
 * progress written as they land, and the finished data is stored for the app
 * to turn into a PDF. A section whose AI call fails falls back to its stub, so
 * a slow provider degrades a report instead of failing it.
 */
@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name);
  private readonly dailyLimit: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: AstrologyAdapterService,
    private readonly interpretation: InterpretationService,
    private readonly timeline: TransitTimelineService,
    private readonly balance: DeepSeekBalanceService,
    @Inject(AI_TEXT_PROVIDER) private readonly ai: AiTextProvider,
    config: ConfigService,
  ) {
    this.dailyLimit = config.get<number>('REPORTS_DAILY_PER_DEVICE') ?? 3;
  }

  /** Jobs that were mid-flight when the process stopped will never finish — say so. */
  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.report.updateMany({
        where: { status: { in: ['queued', 'running'] }, updatedAt: { lt: new Date(Date.now() - STALE_MS) } },
        data: { status: 'failed', error: 'interrupted' },
      });
    } catch (err) {
      this.logger.warn(`stale report sweep failed: ${safeError(err)}`);
    }
  }

  async create(deviceId: string, dto: CreateReportDto, locale: Locale): Promise<ReportMeta> {
    const dayStart = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const today = await this.prisma.report.count({ where: { deviceId, createdAt: { gte: dayStart } } });
    if (today >= this.dailyLimit) {
      throw new HttpException({ statusCode: 429, message: 'daily_report_limit', limit: this.dailyLimit }, HttpStatus.TOO_MANY_REQUESTS);
    }
    // A report is ~60 generations; don't start one the balance can't finish.
    if (this.ai.available && !(await this.balance.hasBalance())) {
      throw new ServiceUnavailableException('ai_paused');
    }

    const row = await this.prisma.report.create({
      data: {
        deviceId,
        kind: dto.kind,
        locale,
        name: dto.name.trim() || '—',
        total: dto.kind === 'natal' ? NATAL_STEPS : TRANSIT_STEPS,
      },
    });
    // Fire and forget: the client polls GET /reports/:id.
    void runAsDevice(deviceId, () => this.run(row.id, dto, locale));
    return this.meta(row);
  }

  async list(deviceId: string): Promise<ReportMeta[]> {
    const rows = await this.prisma.report.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      omit: { data: true },
    });
    return rows.map((r) => this.meta(r));
  }

  async get(deviceId: string, id: string) {
    const row = await this.prisma.report.findFirst({ where: { id, deviceId } });
    if (!row) throw new NotFoundException('Report not found');
    return { ...this.meta(row), data: row.status === 'ready' ? row.data : null };
  }

  async remove(deviceId: string, id: string) {
    await this.prisma.report.deleteMany({ where: { id, deviceId } });
    return { deleted: true };
  }

  // ── The job ─────────────────────────────────────────────────────────────────

  private async run(id: string, dto: CreateReportDto, locale: Locale): Promise<void> {
    try {
      await this.prisma.report.update({ where: { id }, data: { status: 'running' } });
      const tick = this.ticker(id);
      const data =
        dto.kind === 'natal' ? await this.buildNatal(dto, locale, tick) : await this.buildTransit(dto, locale, tick);
      await this.prisma.report.update({
        where: { id },
        data: { status: 'ready', data: data as object, progress: dto.kind === 'natal' ? NATAL_STEPS : TRANSIT_STEPS, stage: null },
      });
    } catch (err) {
      this.logger.warn(`report ${id} failed: ${safeError(err)}`);
      await this.prisma.report
        .update({ where: { id }, data: { status: 'failed', error: 'generation_failed' } })
        .catch(() => undefined);
    }
  }

  private async buildNatal(
    dto: CreateReportDto,
    locale: Locale,
    tick: (stage: string) => void,
  ): Promise<NatalReportData> {
    const birth = this.birth(dto);
    const chart = this.chart(dto);
    const balance = this.balanceOf(chart, birth.unknownTime);
    const step = <T>(stage: string, fn: () => Promise<T>) => async () => {
      const v = await fn();
      tick(stage);
      return v;
    };

    const [bigThree, overview, context, placements, aspects, nodes, extras, ...houses] = await limit(CONCURRENCY, [
      step('bigThree', () => this.interpretation.getBigThree(chart, locale)),
      step('overview', () => this.interpretation.getOverview(chart, locale)),
      step('context', () => this.interpretation.getChartContext(chart, locale)),
      step('placements', () => this.interpretation.getPlacements(chart, locale)),
      step('aspects', () => this.interpretation.getAspects(chart, locale)),
      step('nodes', () => this.interpretation.getNodes(chart, locale)),
      step('extras', () => this.natalExtras(chart, balance, birth, locale)),
      ...Array.from({ length: 12 }, (_, i) => step('houses', () => this.interpretation.getHouse(chart, i + 1, locale))),
    ] as (() => Promise<unknown>)[]);

    return {
      kind: 'natal',
      name: dto.name,
      birth,
      generatedAt: new Date().toISOString(),
      chart,
      bigThree,
      overview,
      context,
      placements,
      aspects,
      nodes,
      balance,
      extras,
      houses,
    } as NatalReportData;
  }

  private async buildTransit(
    dto: CreateReportDto,
    locale: Locale,
    tick: (stage: string) => void,
  ): Promise<TransitReportData> {
    const birth = this.birth(dto);
    const chart = this.chart(dto);
    const time = birth.unknownTime ? '12:00' : birth.birthTime;
    const report = this.adapter.getTransitReport(birth.birthDate, time, birth.latitude, birth.longitude);

    const from = new Date().toISOString().slice(0, 10);
    const to = addDays(addMonths(firstOfMonth(from), 24), -1);
    const built = this.timeline.build({ ...birth, birthTime: time }, from, to);
    const timeline = { ...built, events: built.events.map((e) => ({ ...e, label: describeEvent(e, locale) })) };
    tick('timeline');

    const step = <T>(stage: string, fn: () => Promise<T>) => async () => {
      const v = await fn();
      tick(stage);
      return v;
    };
    const picks = this.spotlightEvents(timeline.events);
    const windows = Array.from({ length: QUARTERS }, (_, i) => {
      const start = addMonths(firstOfMonth(from), i * 3);
      return { from: i === 0 ? from : start, to: addDays(addMonths(start, 3), -1) };
    });

    const results = await limit(CONCURRENCY, [
      step('today', () => this.interpretation.getTransitOverview(report, locale)),
      ...report.movements.map((m) => step('details', () => this.interpretation.getTransitDetail(m, report.date, locale))),
      ...picks.map((e) => step('spotlights', () => this.spotlight(e, chart, birth, locale))),
      ...windows.map((w) =>
        step('quarters', () => this.quarter(w.from, w.to, this.eventsIn(timeline.events, w.from, w.to), chart, birth, locale)),
      ),
    ] as (() => Promise<unknown>)[]);

    const overview = results[0];
    const details = results.slice(1, 1 + report.movements.length);
    const spotlights = results.slice(1 + report.movements.length, 1 + report.movements.length + picks.length);
    const quarters = results.slice(1 + report.movements.length + picks.length);

    return {
      kind: 'transit',
      name: dto.name,
      birth,
      generatedAt: new Date().toISOString(),
      chart,
      today: { report, overview, details },
      timeline,
      spotlights,
      quarters,
    } as TransitReportData;
  }

  // ── Report-only AI sections ─────────────────────────────────────────────────

  private natalExtras(chart: NatalChartData, balance: NatalBalance, birth: ReportBirth, locale: Locale): Promise<NatalExtras> {
    return this.interpretation.cachedReading('REPORT_NATAL_EXTRAS', locale, `natal-extras|${this.chartKey(birth)}`, async () => {
      const stub = natalExtrasStub(locale, balance);
      try {
        const { user, schemaHint } = natalExtrasPrompt(locale, { chart, balance, unknownTime: birth.unknownTime });
        const p = await this.ai.generateJson<Record<string, unknown>>({
          system: systemPrompt(locale),
          user,
          schemaHint,
          temperature: 0.75,
          maxTokens: 4000,
        });
        const t = (p.themes ?? {}) as Record<string, unknown>;
        return {
          balance: str(p.balance, 2200) || stub.balance,
          chartRuler: str(p.chartRuler, 2400) || stub.chartRuler,
          themes: {
            love: str(t.love, 1800) || stub.themes.love,
            career: str(t.career, 1800) || stub.themes.career,
            money: str(t.money, 1800) || stub.themes.money,
            growth: str(t.growth, 1800) || stub.themes.growth,
          },
          closing: str(p.closing, 1200) || stub.closing,
        };
      } catch (err) {
        this.logger.warn(`natal extras AI failed: ${safeError(err)}`);
        return stub;
      }
    });
  }

  private spotlight(e: TimelineEvent, chart: NatalChartData, birth: ReportBirth, locale: Locale): Promise<TransitSpotlight> {
    return this.interpretation.cachedReading('TRANSIT_SPOTLIGHT', locale, `spotlight|${this.chartKey(birth)}|${e.id}`, async () => {
      const stub = { eventId: e.id, ...spotlightStub(locale, e) };
      try {
        const { user, schemaHint } = spotlightPrompt(locale, { event: e, chart, unknownTime: birth.unknownTime });
        const p = await this.ai.generateJson<Record<string, unknown>>({
          system: systemPrompt(locale),
          user,
          schemaHint,
          temperature: 0.75,
          maxTokens: 2200,
        });
        return {
          eventId: e.id,
          title: str(p.title, 90) || stub.title,
          text: str(p.text, 2400) || stub.text,
          howToUse: str(p.howToUse, 1000) || stub.howToUse,
        };
      } catch (err) {
        this.logger.warn(`spotlight AI failed: ${safeError(err)}`);
        return stub;
      }
    });
  }

  private quarter(
    from: string,
    to: string,
    events: TimelineEvent[],
    chart: NatalChartData,
    birth: ReportBirth,
    locale: Locale,
  ): Promise<TransitQuarter> {
    const ids = createHash('sha256').update(events.map((e) => e.id).join(',')).digest('hex').slice(0, 16);
    return this.interpretation.cachedReading('TRANSIT_QUARTER', locale, `quarter|${this.chartKey(birth)}|${from}|${to}|${ids}`, async () => {
      const stub = quarterStub(locale, from, to, events);
      try {
        const { user, schemaHint } = quarterPrompt(locale, { from, to, events, chart, unknownTime: birth.unknownTime });
        const p = await this.ai.generateJson<Record<string, unknown>>({
          system: systemPrompt(locale),
          user,
          schemaHint,
          temperature: 0.75,
          maxTokens: 2200,
        });
        const focus = Array.isArray(p.focus) ? p.focus.map((f) => str(f, 220)).filter(Boolean).slice(0, 3) : [];
        return {
          from,
          to,
          title: str(p.title, 90) || stub.title,
          text: str(p.text, 2400) || stub.text,
          focus: focus.length === 3 ? focus : stub.focus,
        };
      } catch (err) {
        this.logger.warn(`quarter AI failed: ${safeError(err)}`);
        return stub;
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** The heaviest distinct events: aspects, house ingresses and eclipses (not stations). */
  private spotlightEvents(events: TimelineEvent[]): TimelineEvent[] {
    const seen = new Set<string>();
    const picked: TimelineEvent[] = [];
    for (const e of [...events].sort((a, b) => b.weight - a.weight)) {
      if (e.kind === 'station' || e.kind === 'sign_ingress') continue;
      const key = e.kind === 'aspect' ? `${e.planet}|${e.target}` : e.id;
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(e);
      if (picked.length === SPOTLIGHTS) break;
    }
    return picked.sort((a, b) => a.start.localeCompare(b.start));
  }

  /** Events touching a window, heaviest first (at most 10 — what a quarter reading can weigh). */
  private eventsIn(events: TimelineEvent[], from: string, to: string): TimelineEvent[] {
    return events
      .filter((e) => e.start <= to && e.end >= from)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
  }

  private balanceOf(chart: NatalChartData, unknownTime: boolean): NatalBalance {
    const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    const modalities = { Cardinal: 0, Fixed: 0, Mutable: 0 };
    for (const p of chart.planets) {
      elements[ELEMENT_BY_SIGN[p.sign as Sign]]++;
      modalities[MODALITY_BY_SIGN[p.sign as Sign]]++;
    }
    let chartRuler: NatalBalance['chartRuler'] = null;
    if (!unknownTime) {
      const ruler = TRADITIONAL_SIGN_RULER[chart.summary.risingSign as Sign];
      const placement = chart.planets.find((p) => p.name === ruler);
      if (placement) chartRuler = { planet: ruler, sign: placement.sign, house: placement.house };
    }
    return {
      elements,
      modalities,
      dominantElement: chart.summary.dominantElement,
      dominantModality: chart.summary.dominantModality,
      chartRuler,
    };
  }

  private birth(dto: CreateReportDto): ReportBirth {
    return {
      birthDate: dto.birthDate,
      birthTime: dto.birthTime,
      unknownTime: !!dto.unknownTime,
      latitude: dto.latitude,
      longitude: dto.longitude,
      placeName: dto.placeName,
    };
  }

  private chart(dto: CreateReportDto): NatalChartData {
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    return this.adapter.getNatalChart(dto.birthDate, time, dto.latitude, dto.longitude);
  }

  private chartKey(b: ReportBirth): string {
    return createHash('sha256')
      .update(`${b.birthDate}|${b.unknownTime ? '12:00' : b.birthTime}|${b.latitude}|${b.longitude}`)
      .digest('hex')
      .slice(0, 24);
  }

  /** Counts finished steps; writes progress at most every PROGRESS_WRITE_MS. */
  private ticker(id: string): (stage: string) => void {
    let done = 0;
    let lastWrite = 0;
    return (stage: string) => {
      done++;
      const now = Date.now();
      if (now - lastWrite < PROGRESS_WRITE_MS) return;
      lastWrite = now;
      void this.prisma.report
        .update({ where: { id }, data: { progress: done, stage } })
        .catch(() => undefined);
    };
  }

  private meta(r: {
    id: string;
    kind: string;
    status: string;
    progress: number;
    total: number;
    stage: string | null;
    name: string;
    locale: string;
    createdAt: Date;
    error: string | null;
  }): ReportMeta {
    return {
      id: r.id,
      kind: r.kind as ReportMeta['kind'],
      status: r.status as ReportMeta['status'],
      progress: r.progress,
      total: r.total,
      stage: r.stage,
      name: r.name,
      locale: r.locale,
      createdAt: r.createdAt.toISOString(),
      error: r.error,
    };
  }
}

/** Run tasks with at most `n` in flight; results keep the input order. */
async function limit<T>(n: number, tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, worker));
  return results;
}

function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10);
}
