import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DeviceId } from '../../common/device/device-id.decorator';
import { AiRoute } from '../../common/auth/route-tags';
import type { Locale } from '../astrology/interpretation.types';
import { PlanService } from './plan.service';
import { JourneyService } from './journey.service';
import { MoodService } from './mood.service';
import { MoodCheckInDto } from './dto/plan.dto';

const locale = (v?: string): Locale => (v === 'tr' ? 'tr' : 'en');

@ApiTags('Plan')
@ApiBearerAuth()
@Controller('plan')
export class PlanController {
  constructor(private readonly plan: PlanService) {}

  @Get('today')
  @ApiOperation({ summary: "Today's personal sky plan from the natal chart and today's transits (no AI)" })
  today(@DeviceId() deviceId: string) {
    return this.plan.today(deviceId);
  }
}

/** Aster's sky-facing actions; they live here because they read the user's chart. */
@ApiTags('Mascot')
@ApiBearerAuth()
@Controller('mascot')
export class SkyController {
  constructor(
    private readonly journeys: JourneyService,
    private readonly moods: MoodService,
  ) {}

  @AiRoute()
  @Post('journey/launch')
  @ApiOperation({ summary: 'Send Aster on today’s journey (energy ≥ threshold, once a day)' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  launch(@DeviceId() deviceId: string, @Query('locale') loc?: string) {
    return this.journeys.launch(deviceId, locale(loc));
  }

  @Post('journey/claim')
  @ApiOperation({ summary: 'Open what Aster brought back: a transit discovery + a constellation' })
  claim(@DeviceId() deviceId: string) {
    return this.journeys.claim(deviceId);
  }

  @Post('mood')
  @ApiOperation({ summary: 'Morning sky check-in (label + 1–5 energy only)' })
  mood(@Body() dto: MoodCheckInDto, @DeviceId() deviceId: string) {
    return this.moods.checkIn(deviceId, dto.sky, dto.energy);
  }
}
