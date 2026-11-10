import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { AstrologyModule } from '../astrology/astrology.module';
import { CompanionModule } from '../companion/companion.module';
import { MascotModule } from '../mascot/mascot.module';
import { TarotController } from './tarot.controller';
import { TarotService } from './tarot.service';

@Module({
  imports: [AIModule, AstrologyModule, CompanionModule, MascotModule],
  controllers: [TarotController],
  providers: [TarotService],
})
export class TarotModule {}
