import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DeviceId } from '../../common/device/device-id.decorator';
import { AstrologyAdapterService } from '../astrology/astrology-adapter.service';
import { InterpretationService } from '../astrology/interpretation.service';
import { BirthInputDto } from '../astrology/dto/birth-input.dto';
import { Locale } from '../astrology/interpretation.types';
import { CompanionService } from './companion.service';
import { MemoryService } from './memory.service';
import { CompanionMessageDto } from './dto/companion-message.dto';
import { AiRoute } from '../../common/auth/route-tags';

@ApiTags('Companion')
@ApiBearerAuth()
@AiRoute()
@Controller('companion')
export class CompanionController {
  constructor(
    private readonly companion: CompanionService,
    private readonly interpretation: InterpretationService,
    private readonly adapter: AstrologyAdapterService,
    private readonly memory: MemoryService,
  ) {}

  @Post('message')
  @ApiOperation({ summary: 'Send a message to the companion (chart + transit + memory grounded)' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async message(
    @Body() dto: CompanionMessageDto,
    @DeviceId() deviceId: string,
    @Query('locale') locale?: string,
  ) {
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    return this.companion.sendMessage(
      deviceId,
      { birthDate: dto.birthDate, birthTime: time, latitude: dto.latitude, longitude: dto.longitude },
      dto.message,
      this.locale(locale),
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Recent companion conversation for the device' })
  async history(@DeviceId() deviceId: string) {
    return this.companion.getHistory(deviceId);
  }

  @Post('guidance')
  @ApiOperation({ summary: 'Question-first guidance for a home chip (cached per device+topic+day)' })
  @ApiQuery({ name: 'topic', example: 'love', required: true })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  async guidance(
    @Body() dto: BirthInputDto,
    @DeviceId() deviceId: string,
    @Query('topic') topic?: string,
    @Query('locale') locale?: string,
  ) {
    const time = dto.unknownTime ? '12:00' : dto.birthTime;
    const chart = this.adapter.getNatalChart(dto.birthDate, time, dto.latitude, dto.longitude);
    const report = this.adapter.getTransitReport(dto.birthDate, time, dto.latitude, dto.longitude);
    const transits = report.movements
      .flatMap((m) => m.aspects.slice(0, 1).map((a) => `${m.planet} ${a.aspect} natal ${a.natalPlanet}`))
      .slice(0, 6);
    const memory = await this.memory.getDigest(deviceId);
    const date = new Date().toISOString().slice(0, 10);
    return this.interpretation.getGuidance(
      {
        topic: this.topic(topic),
        sun: chart.summary.sunSign,
        moon: chart.summary.moonSign,
        transits,
        memory,
      },
      deviceId,
      date,
      this.locale(locale),
    );
  }

  private locale(v?: string): Locale {
    return v === 'tr' ? 'tr' : 'en';
  }

  private topic(v?: string): string {
    const allowed = ['love', 'work', 'money', 'decision', 'person', 'mood', 'general'];
    return allowed.includes(v ?? '') ? (v as string) : 'general';
  }
}
