import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { AstrologyModule } from '../astrology/astrology.module';
import { CompanionModule } from '../companion/companion.module';
import { IntentionsController } from './intentions.controller';
import { IntentionsService } from './intentions.service';
import { IntentionStreakService } from './intention-streak.service';

@Module({
  imports: [AIModule, AstrologyModule, CompanionModule],
  controllers: [IntentionsController],
  providers: [IntentionsService, IntentionStreakService],
})
export class IntentionsModule {}
