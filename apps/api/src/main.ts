import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const production = config.get<string>('NODE_ENV') === 'production';

  // Transport hardening: security headers, no framework fingerprint, small bodies.
  app.use(helmet());
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { limit: '100kb', extended: false });
  // Behind a load balancer the client IP (used by rate limits) comes from X-Forwarded-For.
  app.set('trust proxy', config.get('TRUST_PROXY'));

  // The mobile app doesn't need CORS at all; only listed web origins get it.
  const origins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (origins.length) app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api/v1');

  // API docs are a development aid — never publish the full route map in production.
  if (!production) {
    const docConfig = new DocumentBuilder()
      .setTitle('AstroFlow API')
      .setDescription('Premium astrology-powered biohacking platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, docConfig));
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`AstroFlow API running on port ${port}${production ? '' : ' (docs at /api/docs)'}`);
}

bootstrap();
