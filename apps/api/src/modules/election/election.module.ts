import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { AstrologyModule } from '../astrology/astrology.module';
import { ElectionController } from './election.controller';
import { ElectionScoringService } from './election-scoring.service';
import { ElectionService } from './election.service';

@Module({
  imports: [AIModule, AstrologyModule],
  controllers: [ElectionController],
  providers: [ElectionService, ElectionScoringService],
})
export class ElectionModule {}
