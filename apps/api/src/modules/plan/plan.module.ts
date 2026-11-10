import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { AstrologyModule } from '../astrology/astrology.module';
import { MascotModule } from '../mascot/mascot.module';
import { DeviceSkyService } from './device-sky.service';
import { PlanService } from './plan.service';
import { JourneyService } from './journey.service';
import { MoodService } from './mood.service';
import { LetterService } from './letter.service';
import { PlanController, SkyController } from './plan.controller';

/**
 * Everything personal that reads the user's own sky: the daily plan, Aster's
 * journeys and the mood check-in. Separate from MascotModule because the
 * astrology module already depends on the mascot (SKY_READ awards).
 */
@Module({
  imports: [AIModule, AstrologyModule, MascotModule],
  controllers: [PlanController, SkyController],
  providers: [DeviceSkyService, PlanService, JourneyService, MoodService, LetterService],
  exports: [DeviceSkyService, PlanService, MoodService],
})
export class PlanModule {}
