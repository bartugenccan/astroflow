import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        // Signing keys. No in-code fallbacks: a missing secret must stop the boot.
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_DEVICE_SECRET: Joi.string().min(32).required(),
        REDIS_URL: Joi.string().default('redis://localhost:6379'),
        ENABLE_WORKERS: Joi.boolean().default(false),
        DEEPSEEK_API_KEY: Joi.string().allow('').optional(),
        DEEPSEEK_API_URL: Joi.string().default('https://api.deepseek.com/v1'),
        // Edge / transport.
        CORS_ORIGINS: Joi.string().allow('').default(''),
        TRUST_PROXY: Joi.alternatives(Joi.boolean(), Joi.number()).default(false),
        // Dev-only bridge for builds that still send the raw x-device-id header.
        ALLOW_LEGACY_DEVICE_HEADER: Joi.boolean().default(false),
        // Cost guards (see AiBudgetService / DeepSeekBalanceService).
        AI_DAILY_PER_DEVICE: Joi.number().integer().min(1).default(300),
        AI_DAILY_GLOBAL: Joi.number().integer().min(1).default(20000),
        DEEPSEEK_MIN_BALANCE: Joi.number().min(0).default(0.2),
        REPORTS_DAILY_PER_DEVICE: Joi.number().integer().min(1).default(3),
        // Everyone gets Premium until real payments ship.
        PREMIUM_BETA: Joi.boolean().default(true),
      }),
    }),
  ],
})
export class AppConfigModule {}
