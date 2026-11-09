import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        // Required: a missing NODE_ENV must not silently fall back to development
        // (Swagger, dev sign-in code logging and the legacy header bridge key off it).
        NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        // Signing key. No in-code fallback: a missing secret must stop the boot.
        JWT_DEVICE_SECRET: Joi.string().min(32).required(),
        DEEPSEEK_API_KEY: Joi.string().allow('').optional(),
        DEEPSEEK_API_URL: Joi.string().default('https://api.deepseek.com/v1'),
        // Which vendor serves AI text (see AIModule). Claude needs ANTHROPIC_API_KEY.
        AI_PROVIDER: Joi.string().valid('anthropic', 'deepseek').default('anthropic'),
        ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
        ANTHROPIC_MODEL: Joi.string().default('claude-opus-5-5'),
        ANTHROPIC_EFFORT: Joi.string().valid('low', 'medium', 'high', 'xhigh', 'max').default('low'),
        // Edge / transport.
        CORS_ORIGINS: Joi.string().allow('').default(''),
        // Hop count of trusted proxies in front of the API (1 behind Railway/Render/Fly).
        // A number only: `true` would trust any client-supplied X-Forwarded-For.
        TRUST_PROXY: Joi.number().integer().min(0).max(5).default(0),
        // Dev-only bridge for builds that still send the raw x-device-id header.
        ALLOW_LEGACY_DEVICE_HEADER: Joi.boolean().default(false),
        // Dev-only free unlock (POST /astrology/unlock). Never on a reachable deploy.
        ENABLE_STUB_UNLOCK: Joi.boolean().default(false),
        // Cost guards (see AiBudgetService / DeepSeekBalanceService).
        AI_DAILY_PER_DEVICE: Joi.number().integer().min(1).default(300),
        AI_DAILY_GLOBAL: Joi.number().integer().min(1).default(20000),
        DEEPSEEK_MIN_BALANCE: Joi.number().min(0).default(0.2),
        REPORTS_DAILY_PER_DEVICE: Joi.number().integer().min(1).default(3),
        // Beta switch: true = everyone Premium. Defaults to false so a production
        // deploy that forgets the variable never gives Premium away.
        PREMIUM_BETA: Joi.boolean().default(false),
        // Dev/test only: shortens Aster's journey (minutes). Ignored in production.
        JOURNEY_MINUTES: Joi.number().integer().min(1).max(600).optional(),
        // Error reporting (read early by src/instrument.ts; validated here).
        SENTRY_DSN: Joi.string().uri().allow('').optional(),
        SENTRY_ENVIRONMENT: Joi.string().allow('').optional(),
        SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.1),
        // Accounts (optional). A missing provider config turns that route into a 503.
        APPLE_BUNDLE_ID: Joi.string().default('com.astroflow.app'),
        APPLE_TEAM_ID: Joi.string().allow('').optional(),
        APPLE_KEY_ID: Joi.string().allow('').optional(),
        APPLE_PRIVATE_KEY: Joi.string().allow('').optional(),
        GOOGLE_CLIENT_IDS: Joi.string().allow('').default(''),
        RESEND_API_KEY: Joi.string().allow('').optional(),
        AUTH_EMAIL_FROM: Joi.string().allow('').optional(),
        // Required once the SIWA key is set: without it Apple refresh tokens are neither
        // stored nor revoked on account deletion.
        AUTH_ENCRYPTION_KEY: Joi.when('APPLE_PRIVATE_KEY', {
          // `is` matches undefined unless required: only a non-empty key triggers this.
          is: Joi.string().min(1).required(),
          then: Joi.string().min(32).required(),
          otherwise: Joi.string().min(32).allow('').optional(),
        }),
        AUTH_EMAIL_DEV_LOG: Joi.boolean().default(false),
      }),
    }),
  ],
})
export class AppConfigModule {}
