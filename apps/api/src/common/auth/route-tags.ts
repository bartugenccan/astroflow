import { ExecutionContext, SetMetadata, applyDecorators } from '@nestjs/common';

const AI_ROUTE = 'route:ai';
const AUTH_ROUTE = 'route:auth';

/** The route may call the AI provider → per-device AI rate limit applies. */
export const AiRoute = () => applyDecorators(SetMetadata(AI_ROUTE, true));

/** Sign-up / sign-in style route → strict per-IP rate limit applies. */
export const AuthRoute = () => applyDecorators(SetMetadata(AUTH_ROUTE, true));

function tagged(ctx: ExecutionContext, key: string): boolean {
  return (
    Reflect.getMetadata(key, ctx.getHandler()) === true ||
    Reflect.getMetadata(key, ctx.getClass()) === true
  );
}

export const isAiRoute = (ctx: ExecutionContext) => tagged(ctx, AI_ROUTE);
export const isAuthRoute = (ctx: ExecutionContext) => tagged(ctx, AUTH_ROUTE);
