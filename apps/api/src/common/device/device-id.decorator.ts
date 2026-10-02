import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * The calling device, as proven by its signed device token (set on the request
 * by the global DeviceAuthGuard). There is no header or body fallback any more:
 * a device id the client merely asserts is never trusted.
 */
export const DeviceId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<{ deviceId?: string }>();
  if (!req.deviceId) throw new UnauthorizedException('Device token required');
  return req.deviceId;
});
