import { Body, Controller, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DeviceId } from '../../common/device/device-id.decorator';
import { Locale } from '../astrology/interpretation.types';
import { TarotCardDto, TarotSpreadDto } from './dto/tarot-spread.dto';
import { TarotService } from './tarot.service';
import { AiRoute } from '../../common/auth/route-tags';

@ApiTags('Tarot')
@ApiBearerAuth()
@AiRoute()
@Controller('tarot')
export class TarotController {
  constructor(private readonly tarot: TarotService) {}

  @Post('card')
  @ApiOperation({ summary: 'Detailed reading of one card in a three-card spread' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  card(@Body() dto: TarotCardDto, @DeviceId() deviceId: string, @Query('locale') locale?: string) {
    return this.tarot.card(deviceId, dto, this.locale(locale));
  }

  @Post('synthesis')
  @ApiOperation({ summary: 'The three-card spread read as a whole' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  synthesis(@Body() dto: TarotSpreadDto, @DeviceId() deviceId: string, @Query('locale') locale?: string) {
    return this.tarot.synthesis(deviceId, dto, this.locale(locale));
  }

  private locale(v?: string): Locale {
    return v === 'tr' ? 'tr' : 'en';
  }
}
