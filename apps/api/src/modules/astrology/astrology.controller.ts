import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import {
  AstrologyAdapterService,
  BirthInput,
  BestDaysResponse,
  NatalChartData,
  TransitReport,
} from './astrology-adapter.service';
import { InterpretationService } from './interpretation.service';
import { SynastryService } from './synastry.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DeviceId } from '../../common/device/device-id.decorator';
import { DeviceEntitlementService } from '../../common/device/device-entitlement.service';
import { FeatureType } from '../../../generated/prisma/client';
import { BirthInputDto } from './dto/birth-input.dto';
import { CompatibilityInputDto } from './dto/compatibility-input.dto';
import { SavePersonDto } from './dto/save-person.dto';
import { bestDayReason } from './best-days.reasons';
import { LifeArea } from './astrology.constants';
import { Locale } from './interpretation.types';

@ApiTags('Astrology')
@ApiHeader({ name: 'x-device-id', description: 'Anonymous device identifier', required: false })
@Controller('astrology')
export class AstrologyController {
  constructor(
    private readonly adapter: AstrologyAdapterService,
    private readonly interpretation: InterpretationService,
    private readonly synastry: SynastryService,
    private readonly entitlement: DeviceEntitlementService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('natal')
  @ApiOperation({ summary: 'Compute the natal chart and persist it for the device' })
  async getNatalChart(
    @Body() dto: BirthInputDto,
    @DeviceId() deviceId: string,
  ): Promise<NatalChartData> {
    const chart = this.compute(dto);
    await this.persist(deviceId, dto, chart);
    return chart;
  }

  @Post('transits')
  @ApiOperation({ summary: 'Current transits against the natal chart' })
  async getTransits(@Body() dto: BirthInputDto) {
    return this.adapter.getCurrentTransits(
      dto.birthDate,
      dto.birthTime,
      dto.latitude,
      dto.longitude,
    );
  }

  @Post('transits/report')
  @ApiOperation({ summary: 'Planet-centric transit report: house, duration, aspects' })
  async getTransitReport(@Body() dto: BirthInputDto): Promise<TransitReport> {
    return this.buildReport(dto);
  }

  @Post('interpretation/transit')
  @ApiOperation({ summary: 'AI reading of one transiting planet on the natal chart' })
  @ApiQuery({ name: 'planet', example: 'Jupiter', required: true })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getTransitDetail(
    @Body() dto: BirthInputDto,
    @Query('planet') planet: string,
    @Query('locale') locale?: string,
  ) {
    const report = this.buildReport(dto);
    const movement =
      report.movements.find(
        (m) => m.planet.toLowerCase() === (planet ?? '').toLowerCase(),
      ) ?? report.movements[0];
    return this.interpretation.getTransitDetail(movement, report.date, this.locale(locale));
  }

  @Post('interpretation/transit-overview')
  @ApiOperation({ summary: "AI overview of today's sky (opportunities + cautions)" })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getTransitOverview(@Body() dto: BirthInputDto, @Query('locale') locale?: string) {
    return this.interpretation.getTransitOverview(this.buildReport(dto), this.locale(locale));
  }

  @Post('interpretation/placements')
  @ApiOperation({ summary: 'AI interpretation of every placement (planets + Ascendant)' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getPlacements(@Body() dto: BirthInputDto, @Query('locale') locale?: string) {
    return this.interpretation.getPlacements(this.compute(dto), this.locale(locale));
  }

  @Post('interpretation/big-three')
  @ApiOperation({ summary: 'AI reading of the Sun/Moon/Rising trio' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getBigThree(@Body() dto: BirthInputDto, @Query('locale') locale?: string) {
    return this.interpretation.getBigThree(this.compute(dto), this.locale(locale));
  }

  @Post('interpretation/aspects')
  @ApiOperation({ summary: 'AI interpretation of the tightest key aspects' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getAspects(@Body() dto: BirthInputDto, @Query('locale') locale?: string) {
    return this.interpretation.getAspects(this.compute(dto), this.locale(locale));
  }

  @Post('interpretation/overview')
  @ApiOperation({ summary: 'AI synthesis of the whole chart' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getOverview(@Body() dto: BirthInputDto, @Query('locale') locale?: string) {
    return this.interpretation.getOverview(this.compute(dto), this.locale(locale));
  }

  @Post('interpretation/house')
  @ApiOperation({ summary: 'AI interpretation of a single house (1-12)' })
  @ApiQuery({ name: 'house', example: 7, required: true })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getHouse(
    @Body() dto: BirthInputDto,
    @Query('house') house: string,
    @Query('locale') locale?: string,
  ) {
    const n = Math.min(12, Math.max(1, parseInt(house ?? '1', 10) || 1));
    return this.interpretation.getHouse(this.compute(dto), n, this.locale(locale));
  }

  @Post('interpretation/nodes')
  @ApiOperation({ summary: 'AI analysis of the North & South lunar nodes' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getNodes(@Body() dto: BirthInputDto, @Query('locale') locale?: string) {
    return this.interpretation.getNodes(this.compute(dto), this.locale(locale));
  }

  @Post('interpretation/chart-context')
  @ApiOperation({ summary: 'Day/night sect + Saturn return analysis' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getChartContext(@Body() dto: BirthInputDto, @Query('locale') locale?: string) {
    return this.interpretation.getChartContext(this.compute(dto), this.locale(locale));
  }

  @Post('insight')
  @ApiOperation({ summary: 'Daily insight for the device, cached per day' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getDailyInsight(
    @Body() dto: BirthInputDto,
    @DeviceId() deviceId: string,
    @Query('locale') locale?: string,
  ) {
    const chart = this.compute(dto);
    const transits = this.adapter.getCurrentTransits(
      dto.birthDate,
      dto.birthTime,
      dto.latitude,
      dto.longitude,
    );
    const date = new Date().toISOString().slice(0, 10);
    return this.interpretation.getDailyInsight(chart, transits, deviceId, this.locale(locale), date);
  }

  // ─── Best days + forecast ─────────────────────────────────────────────────────

  @Post('best-days')
  @ApiOperation({ summary: 'Score the next N days per life-area (pure compute, no AI)' })
  @ApiQuery({ name: 'days', example: 30, required: false })
  @ApiQuery({ name: 'start', example: '2026-07-26', required: false })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getBestDays(
    @Body() dto: BirthInputDto,
    @Query('days') days?: string,
    @Query('start') start?: string,
    @Query('locale') locale?: string,
  ) {
    const n = Math.min(31, Math.max(1, parseInt(days ?? '30', 10) || 30));
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    const report = this.adapter.getBestDays(
      dto.birthDate,
      time,
      dto.latitude,
      dto.longitude,
      n,
      start,
    );
    return this.withReasons(report, this.locale(locale));
  }

  @Post('forecast/weekly')
  @ApiOperation({ summary: 'AI weekly forecast grounded in the week\'s transits' })
  @ApiQuery({ name: 'start', example: '2026-07-27', required: false })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getWeeklyForecast(
    @Body() dto: BirthInputDto,
    @Query('start') start?: string,
    @Query('locale') locale?: string,
  ) {
    return this.buildForecast(dto, 'weekly', start, this.locale(locale));
  }

  @Post('forecast/monthly')
  @ApiOperation({ summary: 'AI monthly forecast grounded in the month\'s transits' })
  @ApiQuery({ name: 'start', example: '2026-07-01', required: false })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getMonthlyForecast(
    @Body() dto: BirthInputDto,
    @Query('start') start?: string,
    @Query('locale') locale?: string,
  ) {
    return this.buildForecast(dto, 'monthly', start, this.locale(locale));
  }

  // ─── Compatibility / synastry ───────────────────────────────────────────────

  @Post('compatibility')
  @ApiOperation({ summary: 'Synastry score + categories (free preview; locked truncates aspects)' })
  async getCompatibility(
    @Body() dto: CompatibilityInputDto,
    @DeviceId() deviceId: string,
  ) {
    const self = this.birthInput(dto.self);
    const other = this.birthInput(dto.other);
    const score = this.synastry.compute(self, other);
    const unlocked = await this.entitlement.isFeatureUnlocked(
      deviceId,
      FeatureType.COMPATIBILITY,
    );
    return {
      overall: score.overall,
      dimensions: score.dimensions,
      aspectCount: score.aspectCount,
      // Free preview: only 2 teaser aspects until unlocked.
      topAspects: unlocked ? score.topAspects : score.topAspects.slice(0, 2),
      locked: !unlocked,
    };
  }

  @Post('compatibility/interpretation')
  @ApiOperation({ summary: 'AI synastry reading (gated: requires COMPATIBILITY unlock)' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async getCompatibilityReading(
    @Body() dto: CompatibilityInputDto,
    @DeviceId() deviceId: string,
    @Query('locale') locale?: string,
  ) {
    const unlocked = await this.entitlement.isFeatureUnlocked(
      deviceId,
      FeatureType.COMPATIBILITY,
    );
    if (!unlocked) {
      throw new ForbiddenException({ locked: true, feature: 'COMPATIBILITY' });
    }
    const self = this.birthInput(dto.self);
    const other = this.birthInput(dto.other);
    const score = this.synastry.compute(self, other);
    const selfChart = this.adapter.getNatalChart(self.birthDate, self.birthTime, self.latitude, self.longitude);
    const otherChart = this.adapter.getNatalChart(other.birthDate, other.birthTime, other.latitude, other.longitude);
    return this.interpretation.getCompatibility(
      {
        selfSun: selfChart.summary.sunSign,
        selfMoon: selfChart.summary.moonSign,
        otherSun: otherChart.summary.sunSign,
        otherMoon: otherChart.summary.moonSign,
        selfKey: this.birthKey(self),
        otherKey: this.birthKey(other),
      },
      score,
      this.locale(locale),
    );
  }

  @Post('unlock')
  @ApiOperation({
    summary:
      'STUB: grant a device-scoped feature unlock. Replace with real IAP receipt validation before shipping.',
  })
  @ApiQuery({ name: 'feature', enum: Object.values(FeatureType), required: true })
  async unlockFeature(
    @DeviceId() deviceId: string,
    @Query('feature') feature?: string,
  ) {
    const ft = (Object.values(FeatureType) as string[]).includes(feature ?? '')
      ? (feature as FeatureType)
      : FeatureType.COMPATIBILITY;
    await this.entitlement.unlock(deviceId, ft);
    return { unlocked: true, feature: ft };
  }

  @Get('entitlements')
  @ApiOperation({ summary: 'List device-scoped unlocked features' })
  async getEntitlements(@DeviceId() deviceId: string) {
    return { features: await this.entitlement.listUnlocked(deviceId) };
  }

  @Post('people')
  @ApiOperation({ summary: 'Save a second person for compatibility checks' })
  async savePerson(@Body() dto: SavePersonDto, @DeviceId() deviceId: string) {
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    const chart = this.adapter.getNatalChart(dto.birthDate, time, dto.latitude, dto.longitude);
    return this.prisma.savedPerson.create({
      data: {
        deviceId,
        label: dto.label,
        relationship: dto.relationship ?? null,
        birthDate: dto.birthDate,
        birthTime: dto.birthTime,
        latitude: dto.latitude,
        longitude: dto.longitude,
        unknownTime: dto.unknownTime ?? false,
        placeName: dto.placeName ?? null,
        sunSign: chart.summary.sunSign,
        moonSign: chart.summary.moonSign,
        risingSign: chart.summary.risingSign,
      },
    });
  }

  @Get('people')
  @ApiOperation({ summary: 'List saved people for the device' })
  async listPeople(@DeviceId() deviceId: string) {
    return this.prisma.savedPerson.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete('people/:id')
  @ApiOperation({ summary: 'Delete a saved person' })
  async deletePerson(@Param('id') id: string, @DeviceId() deviceId: string) {
    await this.prisma.savedPerson.deleteMany({ where: { id, deviceId } });
    return { deleted: true };
  }

  // ─── helpers ─────────────────────────────────────────────────────────────────

  private withReasons(report: BestDaysResponse, locale: Locale) {
    const areas: LifeArea[] = ['love', 'career', 'money', 'energy'];
    const top: Record<string, { date: string; score: number; reason: string }[]> = {};
    for (const area of areas) {
      top[area] = report.top[area].map((d) => ({
        date: d.date,
        score: d.score,
        reason: bestDayReason(locale, d, area),
      }));
    }
    return { start: report.start, days: report.days, scores: report.scores, top };
  }

  private async buildForecast(
    dto: BirthInputDto,
    period: 'weekly' | 'monthly',
    start: string | undefined,
    locale: Locale,
  ) {
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    const startISO = start ?? this.forecastStart(period);
    const window = this.adapter.getForecastWindow(
      dto.birthDate,
      time,
      dto.latitude,
      dto.longitude,
      period,
      startISO,
    );
    const chartSig = this.hash(`${dto.birthDate}|${time}|${dto.latitude}|${dto.longitude}`);
    const periodKey = period === 'weekly' ? window.start : window.start.slice(0, 7);
    return this.interpretation.getForecast(period, window, chartSig, periodKey, locale);
  }

  /** Default forecast start: today's ISO-week Monday (weekly) or month-1st (monthly). */
  private forecastStart(period: 'weekly' | 'monthly'): string {
    const now = new Date();
    if (period === 'monthly') {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    const day = now.getDay(); // 0 Sun..6 Sat
    const diff = (day + 6) % 7; // days since Monday
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  }

  private birthInput(dto: BirthInputDto): BirthInput {
    return {
      birthDate: dto.birthDate,
      birthTime: dto.unknownTime ? '12:00' : dto.birthTime,
      latitude: dto.latitude,
      longitude: dto.longitude,
    };
  }

  private birthKey(b: BirthInput): string {
    return `${b.birthDate}|${b.birthTime}|${b.latitude}|${b.longitude}`;
  }

  private hash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private compute(dto: BirthInputDto): NatalChartData {
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    return this.adapter.getNatalChart(dto.birthDate, time, dto.latitude, dto.longitude);
  }

  private buildReport(dto: BirthInputDto): TransitReport {
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    return this.adapter.getTransitReport(dto.birthDate, time, dto.latitude, dto.longitude);
  }

  private async persist(deviceId: string, dto: BirthInputDto, chart: NatalChartData) {
    const base = {
      birthDate: dto.birthDate,
      birthTime: dto.birthTime,
      latitude: dto.latitude,
      longitude: dto.longitude,
      utcOffsetMin: dto.utcOffsetMin ?? null,
      unknownTime: dto.unknownTime ?? false,
      sunSign: chart.summary.sunSign,
      moonSign: chart.summary.moonSign,
      risingSign: chart.summary.risingSign,
      chartData: chart as object,
    };
    await this.prisma.deviceChart.upsert({
      where: { deviceId },
      create: { deviceId, ...base },
      update: base,
    });
  }

  private locale(v?: string): Locale {
    return v === 'tr' ? 'tr' : 'en';
  }
}
