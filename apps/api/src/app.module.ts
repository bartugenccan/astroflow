import { Module } from '@nestjs/common';
import { AppConfigModule } from './common/config/app-config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { QueueModule } from './common/queue/queue.module';
import { UsersModule } from './modules/users/users.module';
import { AstrologyModule } from './modules/astrology/astrology.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { AIModule } from './modules/ai/ai.module';
import { CompanionModule } from './modules/companion/companion.module';
import { IntentionsModule } from './modules/intentions/intentions.module';
import { TarotModule } from './modules/tarot/tarot.module';
import { ElectionModule } from './modules/election/election.module';
import { WorkersModule } from './workers/workers.module';

// The streak worker + its BullMQ queue require Redis. Off by default so the API
// boots on Postgres alone; set ENABLE_WORKERS=true to run the streak scheduler.
const workerModules =
  process.env.ENABLE_WORKERS === 'true' ? [QueueModule, WorkersModule] : [];

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    UsersModule,
    AstrologyModule,
    GamificationModule,
    AIModule,
    CompanionModule,
    IntentionsModule,
    TarotModule,
    ElectionModule,
    ...workerModules,
  ],
})
export class AppModule {}
