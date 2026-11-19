import { ExecutionContext, SetMetadata, applyDecorators } from '@nestjs/common';

const AI_ROUTE = 'route:ai';
const AUTH_ROUTE = 'route:auth';

/** The route may call the AI provider → per-device AI rate limit applies. */
export const AiRoute = () => applyDecorators(SetMetadata(AI_ROUTE, true));

const OTP_ROUTE = 'route:otp';
const DEVICE_MINT_ROUTE = 'route:device-mint';

/** Sign-up / sign-in style route → strict per-IP rate limit applies. */
export const AuthRoute = () => applyDecorators(SetMetadata(AUTH_ROUTE, true));

/** Sends a sign-in code by email → hourly per-IP cap on top of AuthRoute. */
export const OtpRoute = () => applyDecorators(SetMetadata(OTP_ROUTE, true));

/** Mints a new device identity → hourly per-IP cap, so fresh devices can't be farmed. */
export const DeviceMintRoute = () => applyDecorators(SetMetadata(DEVICE_MINT_ROUTE, true));

function tagged(ctx: ExecutionContext, key: string): boolean {
  return (
    Reflect.getMetadata(key, ctx.getHandler()) === true ||
    Reflect.getMetadata(key, ctx.getClass()) === true
  );
}

export const isAiRoute = (ctx: ExecutionContext) => tagged(ctx, AI_ROUTE);
export const isAuthRoute = (ctx: ExecutionContext) => tagged(ctx, AUTH_ROUTE);
export const isOtpRoute = (ctx: ExecutionContext) => tagged(ctx, OTP_ROUTE);
export const isDeviceMintRoute = (ctx: ExecutionContext) => tagged(ctx, DEVICE_MINT_ROUTE);
