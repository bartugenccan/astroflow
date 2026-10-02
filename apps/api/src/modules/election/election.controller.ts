import { Body, Controller, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Locale } from '../astrology/interpretation.types';
import { ElectionCheckDto, ElectionSearchDto } from './dto/election.dto';
import { ElectionService } from './election.service';
import { AiRoute } from '../../common/auth/route-tags';

@ApiTags('Election')
@ApiBearerAuth()
@AiRoute()
@Controller('election')
export class ElectionController {
  constructor(private readonly election: ElectionService) {}

  @Post('check')
  @ApiOperation({ summary: 'Score one date for an event: factors, best hours, better nearby dates' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  check(@Body() dto: ElectionCheckDto, @Query('locale') locale?: string) {
    return this.election.check(dto, this.locale(locale));
  }

  @Post('check/reading')
  @ApiOperation({ summary: 'Plain-language reading of a date check (AI over the computed factors)' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  checkReading(@Body() dto: ElectionCheckDto, @Query('locale') locale?: string) {
    return this.election.checkReading(dto, this.locale(locale));
  }

  @Post('search')
  @ApiOperation({ summary: 'Best dates for an event within up to 12 months, with periods to avoid' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  search(@Body() dto: ElectionSearchDto, @Query('locale') locale?: string) {
    return this.election.search(dto, this.locale(locale));
  }

  @Post('search/reading')
  @ApiOperation({ summary: 'Plain-language summary of a date search (AI over the computed picks)' })
  @ApiQuery({ name: 'locale', enum: ['en', 'tr'], required: false })
  searchReading(@Body() dto: ElectionSearchDto, @Query('locale') locale?: string) {
    return this.election.searchReading(dto, this.locale(locale));
  }

  private locale(v?: string): Locale {
    return v === 'tr' ? 'tr' : 'en';
  }
}
