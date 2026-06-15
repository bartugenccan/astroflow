import { Module } from '@nestjs/common';
import { AstrologyController } from './astrology.controller';
import { AstrologyService } from './astrology.service';
import { AstrologyEngine } from './astrology-engine.service';
import { AIInsightEngine } from './ai-insight-engine.service';

@Module({
  controllers: [AstrologyController],
  providers: [AstrologyService, AstrologyEngine, AIInsightEngine],
  exports: [AstrologyService, AstrologyEngine, AIInsightEngine],
})
export class AstrologyModule {}
