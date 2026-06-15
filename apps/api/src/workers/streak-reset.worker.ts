import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StreakService } from '../modules/gamification/streak.service';

@Injectable()
export class StreakResetWorker {
  private readonly logger = new Logger(StreakResetWorker.name);

  constructor(private readonly streakService: StreakService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'streak-reset',
    timeZone: 'Europe/Istanbul',
  })
  async handleStreakReset() {
    this.logger.log('Starting daily streak reset job...');

    try {
      const result = await this.streakService.resetExpiredStreaks();
      this.logger.log(
        `Streak reset complete: ${result.resetCount} streaks reset to 0`,
      );
    } catch (error) {
      this.logger.error('Streak reset job failed', error instanceof Error ? error.stack : error);
    }
  }

  async runManually(): Promise<{ resetCount: number }> {
    this.logger.log('Running streak reset manually...');
    return this.streakService.resetExpiredStreaks();
  }
}
