import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StreakResetWorker } from './streak-reset.worker';
import { GamificationModule } from '../modules/gamification/gamification.module';

@Module({
  imports: [ScheduleModule.forRoot(), GamificationModule],
  providers: [StreakResetWorker],
})
export class WorkersModule {}
