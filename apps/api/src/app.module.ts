import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './common/config/app-config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { QueueModule } from './common/queue/queue.module';
import { isAiRoute, isAuthRoute } from './common/auth/route-tags';
import { RequestContextInterceptor } from './common/context/request-context';
import { AuthModule } from './modules/auth/auth.module';
import { DeviceAuthGuard } from './modules/auth/device-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { AstrologyModule } from './modules/astrology/astrology.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { AIModule } from './modules/ai/ai.module';
import { CompanionModule } from './modules/companion/companion.module';
import { IntentionsModule } from './modules/intentions/intentions.module';
import { TarotModule } from './modules/tarot/tarot.module';
import { ElectionModule } from './modules/election/election.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WorkersModule } from './workers/workers.module';
import { HealthController } from './common/health/health.controller';

// The streak worker + its BullMQ queue require Redis. Off by default so the API
// boots on Postgres alone; set ENABLE_WORKERS=true to run the streak scheduler.
const workerModules =
  process.env.ENABLE_WORKERS === 'true' ? [QueueModule, WorkersModule] : [];

const MINUTE = 60_000;

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    /**
     * Rate limits (in-memory; per instance):
     *  - default: 60 requests/min per client IP, every route;
     *  - ai:      20 requests/min per device on routes tagged @AiRoute;
     *  - auth:    5 requests/min per IP on routes tagged @AuthRoute (sign-up, login).
     * The daily AI caps live in AiBudgetService.
     */
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'default', ttl: MINUTE, limit: 60 },
        {
          name: 'ai',
          ttl: MINUTE,
          limit: 20,
          skipIf: (ctx) => !isAiRoute(ctx),
          getTracker: (req) => (req.deviceId as string | undefined) ?? (req.ip as string),
        },
        { name: 'auth', ttl: MINUTE, limit: 5, skipIf: (ctx) => !isAuthRoute(ctx) },
      ],
    }),
    AuthModule,
    UsersModule,
    AstrologyModule,
    GamificationModule,
    AIModule,
    CompanionModule,
    IntentionsModule,
    TarotModule,
    ElectionModule,
    PrivacyModule,
    ReportsModule,
    ...workerModules,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: the device guard resolves req.deviceId, which the AI throttler keys on.
    { provide: APP_GUARD, useClass: DeviceAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}
