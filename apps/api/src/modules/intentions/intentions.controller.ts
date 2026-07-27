import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { DeviceId } from '../../common/device/device-id.decorator';
import { BirthInputDto } from '../astrology/dto/birth-input.dto';
import { Locale } from '../astrology/interpretation.types';
import { IntentionsService } from './intentions.service';
import { CreateIntentionDto } from './dto/create-intention.dto';
import { CheckInDto } from './dto/checkin.dto';

@ApiTags('Intentions')
@ApiHeader({ name: 'x-device-id', description: 'Anonymous device identifier', required: false })
@Controller('intentions')
export class IntentionsController {
  constructor(private readonly intentions: IntentionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an intention (generates a chart-framed affirmation)' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  create(
    @Body() dto: CreateIntentionDto,
    @DeviceId() deviceId: string,
    @Query('locale') locale?: string,
  ) {
    return this.intentions.create(deviceId, dto, this.locale(locale));
  }

  @Get()
  @ApiOperation({ summary: 'List active intentions with progress + streak' })
  list(@DeviceId() deviceId: string) {
    return this.intentions.list(deviceId);
  }

  @Post('suggestions')
  @ApiOperation({ summary: 'Transit-derived intention suggestions (what the user faces now)' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  suggestions(
    @Body() dto: BirthInputDto,
    @DeviceId() deviceId: string,
    @Query('locale') locale?: string,
  ) {
    return this.intentions.suggestions(deviceId, dto, this.locale(locale));
  }

  @Get(':id')
  @ApiOperation({ summary: 'One intention with progress + streak' })
  get(@Param('id') id: string, @DeviceId() deviceId: string) {
    return this.intentions.get(deviceId, id);
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: 'Submit a check-in → AI reply + conviction + streak update' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInDto,
    @DeviceId() deviceId: string,
    @Query('locale') locale?: string,
  ) {
    return this.intentions.checkIn(deviceId, id, dto, this.locale(locale));
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Check-in history for an intention' })
  history(@Param('id') id: string, @DeviceId() deviceId: string) {
    return this.intentions.history(deviceId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an intention' })
  remove(@Param('id') id: string, @DeviceId() deviceId: string) {
    return this.intentions.remove(deviceId, id);
  }

  private locale(v?: string): Locale {
    return v === 'tr' ? 'tr' : 'en';
  }
}
