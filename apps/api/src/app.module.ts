import { Module } from '@nestjs/common';
import { AppConfigModule } from './common/config/app-config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { QueueModule } from './common/queue/queue.module';
import { UsersModule } from './modules/users/users.module';
import { AstrologyModule } from './modules/astrology/astrology.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    QueueModule,
    UsersModule,
    AstrologyModule,
    GamificationModule,
    WorkersModule,
  ],
})
export class AppModule {}
