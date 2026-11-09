import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/auth/public.decorator';
import { DeviceAuthService } from './device-auth.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface DeviceRequest {
  headers: Record<string, string | string[] | undefined>;
  /** The subject (data owner) — what every `deviceId` column holds. */
  deviceId?: string;
  /** This install (revocation, logout). */
  installId?: string;
}

/**
 * Global guard: every route needs a valid device token
 * (`Authorization: Bearer <token>`) unless marked `@Public()`. Sets
 * `req.deviceId` (the subject) for `@DeviceId()` and `req.installId` for
 * `@InstallId()`.
 */
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  private readonly allowLegacyHeader: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly auth: DeviceAuthService,
    config: ConfigService,
  ) {
    // Dev-only bridge for builds that predate device tokens. Never in production.
    this.allowLegacyHeader =
      config.get<boolean>('ALLOW_LEGACY_DEVICE_HEADER') === true &&
      config.get<string>('NODE_ENV') !== 'production';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<DeviceRequest>();
    const header = req.headers.authorization;
    const auth = Array.isArray(header) ? header[0] : header;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;

    if (token) {
      const principal = await this.auth.verify(token);
      if (!principal) throw new UnauthorizedException('Invalid or expired device token');
      req.deviceId = principal.subjectId;
      req.installId = principal.installId;
      return true;
    }

    if (this.allowLegacyHeader) {
      const raw = req.headers['x-device-id'];
      const legacy = (Array.isArray(raw) ? raw[0] : raw)?.trim();
      if (legacy && UUID.test(legacy)) {
        req.deviceId = legacy;
        req.installId = legacy;
        return true;
      }
    }
    throw new UnauthorizedException('Device token required');
  }
}
