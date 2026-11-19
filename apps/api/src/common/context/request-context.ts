import { AsyncLocalStorage } from 'async_hooks';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Who a piece of work is for, available anywhere below the controller without
 * threading it through every service signature. The AI budget reads it to
 * charge the right device; background jobs set it themselves via `runAsDevice`.
 */
interface RequestContext {
  deviceId?: string;
  /** The client's IANA time zone (`x-tz` header), when it sent a valid one. */
  timeZone?: string;
  /** Which feature the request belongs to ("tarot", "companion"…), from the controller name. */
  feature?: string;
  /** Set when an AI call failed (or no provider ran) and the answer carries templated stub text. */
  aiFallback?: boolean;
}

/** Response header telling the app this answer is (partly) stub text: show it, never keep it. */
export const AI_FALLBACK_HEADER = 'x-ai-fallback';

/** Marks the current request's answer as stub text (see `AI_FALLBACK_HEADER`). */
export function noteAiFallback(): void {
  const ctx = store.getStore();
  if (ctx) ctx.aiFallback = true;
}

const store = new AsyncLocalStorage<RequestContext>();

export function currentDeviceId(): string | undefined {
  return store.getStore()?.deviceId;
}

/** The feature (controller) the current request belongs to, for analytics. */
export function currentFeature(): string | undefined {
  return store.getStore()?.feature;
}

/**
 * Today's date (`YYYY-MM-DD`) where the user is: in the request's `x-tz` zone,
 * or UTC when the client sent none. Daily things the app shows by local day
 * (intention check-ins) must use this, not the server's UTC day.
 */
export function localToday(now = new Date()): string {
  const timeZone = store.getStore()?.timeZone;
  if (!timeZone) return now.toISOString().slice(0, 10);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** A usable IANA zone name, or undefined (unknown zones would make Intl throw). */
function validTimeZone(raw: unknown): string | undefined {
  const tz = Array.isArray(raw) ? raw[0] : raw;
  if (typeof tz !== 'string' || tz.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(tz)) return undefined;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

/** Run work (e.g. a background report job) on behalf of a device. */
export function runAsDevice<T>(deviceId: string, fn: () => Promise<T>): Promise<T> {
  return store.run({ deviceId }, fn);
}

/** Opens the context for every HTTP request once the auth guard has resolved the device. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      deviceId?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const res = context.switchToHttp().getResponse<{
      headersSent?: boolean;
      setHeader?: (name: string, value: string) => void;
    }>();
    const ctx: RequestContext = {
      deviceId: req?.deviceId,
      timeZone: validTimeZone(req?.headers?.['x-tz']),
      feature: context.getClass()?.name?.replace(/Controller$/, '').toLowerCase() || undefined,
    };
    return new Observable((subscriber) =>
      store.run(ctx, () =>
        next
          .handle()
          .pipe(
            tap(() => {
              // Runs before Nest writes the body, so the header still goes out.
              if (ctx.aiFallback && res && !res.headersSent) res.setHeader?.(AI_FALLBACK_HEADER, '1');
            }),
          )
          .subscribe(subscriber),
      ),
    );
  }
}
