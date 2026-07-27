import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

/**
 * Extracts the anonymous device identifier from the `x-device-id` header
 * (falling back to a `deviceId` body field). Throws 400 when absent.
 */
export const DeviceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const fromHeader = req.headers['x-device-id'];
    const header = Array.isArray(fromHeader) ? fromHeader[0] : fromHeader;
    const deviceId = (header || req.body?.deviceId || '').toString().trim();
    if (!deviceId) {
      throw new BadRequestException('Missing device id (x-device-id header).');
    }
    return deviceId;
  },
);
