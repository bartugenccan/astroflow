import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        REDIS_URL: Joi.string().default('redis://localhost:6379'),
        ENABLE_WORKERS: Joi.boolean().default(false),
        DEEPSEEK_API_KEY: Joi.string().allow('').optional(),
        DEEPSEEK_API_URL: Joi.string().default('https://api.deepseek.com/v1'),
      }),
    }),
  ],
})
export class AppConfigModule {}
