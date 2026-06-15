import { Module } from '@nestjs/common';
import { StreakService } from './streak.service';
import { ScoreService } from './score.service';
import { UnlockService } from './unlock.service';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';

@Module({
  controllers: [GamificationController],
  providers: [StreakService, ScoreService, UnlockService, GamificationService],
  exports: [StreakService, ScoreService, UnlockService, GamificationService],
})
export class GamificationModule {}
