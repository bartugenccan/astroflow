import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DeviceId } from '../../common/device/device-id.decorator';
import { BirthInputDto } from '../astrology/dto/birth-input.dto';
import { Locale } from '../astrology/interpretation.types';
import { IntentionsService } from './intentions.service';
import { AffirmationPreviewDto, CreateIntentionDto } from './dto/create-intention.dto';
import { CheckInDto, SignDto } from './dto/checkin.dto';
import { AiRoute } from '../../common/auth/route-tags';

@ApiTags('Intentions')
@ApiBearerAuth()
@Controller('intentions')
export class IntentionsController {
  constructor(private readonly intentions: IntentionsService) {}

  @AiRoute()
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
  @ApiOperation({ summary: 'List wishes (active by default, or the manifested shelf) with progress, streak and star' })
  @ApiQuery({ name: 'status', enum: ['active', 'manifested'], required: false })
  list(@DeviceId() deviceId: string, @Query('status') status?: string) {
    return this.intentions.list(deviceId, status === 'manifested' ? 'manifested' : 'active');
  }

  @Get('areas')
  @ApiOperation({ summary: "Where each life area lives in the user's natal chart (house, cusp, ruler, planets)" })
  areas(@DeviceId() deviceId: string) {
    return this.intentions.areas(deviceId);
  }

  @AiRoute()
  @Post('affirmation-preview')
  @ApiOperation({ summary: 'Generate the chart-framed affirmation for a wish before planting it' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  previewAffirmation(@Body() dto: AffirmationPreviewDto, @Query('locale') locale?: string) {
    return this.intentions.previewAffirmation(dto, this.locale(locale));
  }

  @AiRoute()
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
  get(@Param('id', ParseUUIDPipe) id: string, @DeviceId() deviceId: string) {
    return this.intentions.get(deviceId, id);
  }

  @AiRoute()
  @Post(':id/checkin')
  @ApiOperation({ summary: 'Submit a check-in → AI reply + conviction + streak update' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckInDto,
    @DeviceId() deviceId: string,
    @Query('locale') locale?: string,
  ) {
    return this.intentions.checkIn(deviceId, id, dto, this.locale(locale));
  }

  @Post(':id/manifest')
  @ApiOperation({ summary: 'Mark a wish as manifested → the shelf + a celebration' })
  manifest(@Param('id', ParseUUIDPipe) id: string, @DeviceId() deviceId: string) {
    return this.intentions.manifest(deviceId, id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Let a wish go (kept, but no longer active)' })
  archive(@Param('id', ParseUUIDPipe) id: string, @DeviceId() deviceId: string) {
    return this.intentions.archive(deviceId, id);
  }

  @Get(':id/power-days')
  @ApiOperation({ summary: "The wish's power days from the user's transits (locked past 3 until Glimmer)" })
  @ApiQuery({ name: 'days', required: false })
  powerDays(@Param('id', ParseUUIDPipe) id: string, @DeviceId() deviceId: string, @Query('days') days?: string) {
    return this.intentions.powerDays(deviceId, id, parseInt(days ?? '14', 10) || 14);
  }

  @Get(':id/signs')
  @ApiOperation({ summary: "The manifest's sign log (things the user noticed), newest first" })
  signs(@Param('id', ParseUUIDPipe) id: string, @DeviceId() deviceId: string) {
    return this.intentions.signs(deviceId, id);
  }

  @Post(':id/signs')
  @ApiOperation({ summary: 'Log a sign on a manifest → SIGN_LOG award (once a day)' })
  addSign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SignDto, @DeviceId() deviceId: string) {
    return this.intentions.addSign(deviceId, id, dto.text);
  }

  @Delete(':id/signs/:signId')
  @ApiOperation({ summary: 'Delete one sign' })
  removeSign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('signId', ParseUUIDPipe) signId: string,
    @DeviceId() deviceId: string,
  ) {
    return this.intentions.removeSign(deviceId, id, signId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Check-in history for an intention' })
  history(@Param('id', ParseUUIDPipe) id: string, @DeviceId() deviceId: string) {
    return this.intentions.history(deviceId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an intention' })
  remove(@Param('id', ParseUUIDPipe) id: string, @DeviceId() deviceId: string) {
    return this.intentions.remove(deviceId, id);
  }

  private locale(v?: string): Locale {
    return v === 'tr' ? 'tr' : 'en';
  }
}
