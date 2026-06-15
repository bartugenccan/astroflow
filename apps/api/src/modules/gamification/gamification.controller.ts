import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GamificationService } from './gamification.service';
import { RitualType, FeatureType } from '../../../generated/prisma/client';

class CompleteRitualDto {
  ritualType: RitualType;
  durationMinutes?: number;
  notes?: string;
}

class UnlockFeatureDto {
  featureType: FeatureType;
}

@ApiTags('Gamification')
@ApiBearerAuth()
@Controller('gamification')
@UseGuards(AuthGuard('jwt'))
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get full gamification status' })
  async getStatus(@Req() req: any) {
    return this.gamificationService.getStatus(req.user.userId);
  }

  @Post('routines/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a daily ritual - awards star points with streak multipliers' })
  async completeRitual(@Req() req: any, @Body() dto: CompleteRitualDto) {
    return this.gamificationService.completeRitual(
      req.user.userId,
      dto.ritualType,
      dto.durationMinutes,
      dto.notes,
    );
  }

  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock premium feature using star points (transactional)' })
  async unlockFeature(@Req() req: any, @Body() dto: UnlockFeatureDto) {
    return this.gamificationService.unlockFeature(req.user.userId, dto.featureType);
  }
}
