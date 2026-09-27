import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { AstrologyModule } from '../astrology/astrology.module';
import { CompanionModule } from '../companion/companion.module';
import { TarotController } from './tarot.controller';
import { TarotService } from './tarot.service';

@Module({
  imports: [AIModule, AstrologyModule, CompanionModule],
  controllers: [TarotController],
  providers: [TarotService],
})
export class TarotModule {}
