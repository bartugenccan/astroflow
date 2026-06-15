import { Module } from '@nestjs/common';
import { AppConfigModule } from './common/config/app-config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AstrologyModule } from './modules/astrology/astrology.module';
import { GamificationModule } from './modules/gamification/gamification.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    UsersModule,
    AstrologyModule,
    GamificationModule,
  ],
})
export class AppModule {}
