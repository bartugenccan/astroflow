import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DeepSeekIntegrationService } from './deepseek-integration.service';

class ResonanceDto {
  affirmationText: string;
}

@ApiTags('AI')
@Controller('ai')
export class AIController {
  constructor(private readonly deepseek: DeepSeekIntegrationService) {}

  @Get('daily-action')
  @ApiOperation({ summary: 'Get AI-generated daily action based on current astrology' })
  async getDailyAction() {
    const astrologySummary = 'Gunes Ikizler burcunda, Ay Boga burcuna gecis yapiyor. Mars 3. evde aktif. Venus uyumlu aci yapiyor.';
    return this.deepseek.generateDailyAction(astrologySummary);
  }

  @Post('resonance-analysis')
  @ApiOperation({ summary: 'Analyze affirmation resonance score (0-100)' })
  async analyzeResonance(@Body() dto: ResonanceDto) {
    return this.deepseek.analyzeResonance(dto.affirmationText);
  }
}
