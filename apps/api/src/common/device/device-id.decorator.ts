import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * The calling subject — whose data this is — as proven by its signed device
 * token (set on the request by the global DeviceAuthGuard). There is no header
 * or body fallback: a device id the client merely asserts is never trusted.
 */
export const DeviceId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<{ deviceId?: string }>();
  if (!req.deviceId) throw new UnauthorizedException('Device token required');
  return req.deviceId;
});

/** The calling install (token `did`): what logout revokes and sign-in re-points. */
export const InstallId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<{ installId?: string }>();
  if (!req.installId) throw new UnauthorizedException('Device token required');
  return req.installId;
});
