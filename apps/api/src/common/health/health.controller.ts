import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/** Health probes for the container HEALTHCHECK / load balancer. No data, no auth. */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up and serving HTTP. */
  @Public()
  @Get()
  check() {
    return { ok: true };
  }

  /**
   * Readiness: the database answers. A 503 here takes the instance out of
   * rotation instead of letting it serve 500s. AllExceptionsFilter doesn't
   * report 503s to Sentry (probes fire every 30s); platform health alerts do.
   */
  @Public()
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: 'up' };
    } catch {
      throw new ServiceUnavailableException({ ok: false, db: 'down' });
    }
  }
}
