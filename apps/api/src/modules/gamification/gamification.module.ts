import { Module } from '@nestjs/common';
import { StreakService } from './streak.service';
import { ScoreService } from './score.service';

@Module({
  providers: [StreakService, ScoreService],
  exports: [StreakService, ScoreService],
})
export class GamificationModule {}
