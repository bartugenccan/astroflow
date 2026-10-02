import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AiRoute } from '../../common/auth/route-tags';
import { DeviceId } from '../../common/device/device-id.decorator';
import { Locale } from '../astrology/interpretation.types';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @AiRoute()
  @Post()
  @ApiOperation({ summary: 'Start a long PDF report (natal, or transits now → 24 months); poll GET /reports/:id' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  create(@Body() dto: CreateReportDto, @DeviceId() deviceId: string, @Query('locale') locale?: string) {
    return this.reports.create(deviceId, dto, locale === 'tr' ? 'tr' : 'en');
  }

  @Get()
  @ApiOperation({ summary: "This device's reports (newest first, without data)" })
  list(@DeviceId() deviceId: string) {
    return this.reports.list(deviceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Report status/progress, and its data once ready' })
  get(@Param('id', ParseUUIDPipe) id: string, @DeviceId() deviceId: string) {
    return this.reports.get(deviceId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a report' })
  remove(@Param('id', ParseUUIDPipe) id: string, @DeviceId() deviceId: string) {
    return this.reports.remove(deviceId, id);
  }
}
