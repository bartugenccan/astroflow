import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AstrologyService } from './astrology.service';

class BirthChartDto {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
}

@ApiTags('Astrology')
@Controller('astrology')
export class AstrologyController {
  constructor(private astrologyService: AstrologyService) {}

  @Post('chart')
  @ApiOperation({ summary: 'Calculate birth chart' })
  async calculateChart(@Body() dto: BirthChartDto) {
    return this.astrologyService.getBirthChart(
      'demo-user',
      dto.birthDate,
      dto.birthTime,
      dto.latitude,
      dto.longitude,
    );
  }

  @Get('transits')
  @ApiOperation({ summary: 'Get current transits with action translations' })
  async getTransits() {
    return this.astrologyService.getCurrentTransits('demo-user');
  }

  @Get('insight')
  @ApiOperation({ summary: 'Get AI-powered daily insight with actions' })
  async getDailyInsight() {
    return this.astrologyService.getDailyInsight('demo-user');
  }

  @Get('affirmations')
  @ApiOperation({ summary: 'Get personalized affirmations based on transits' })
  async getAffirmations() {
    return this.astrologyService.getAffirmations('demo-user');
  }
}
