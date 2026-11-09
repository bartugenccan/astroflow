import { AsyncLocalStorage } from 'async_hooks';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Who a piece of work is for, available anywhere below the controller without
 * threading it through every service signature. The AI budget reads it to
 * charge the right device; background jobs set it themselves via `runAsDevice`.
 */
interface RequestContext {
  deviceId?: string;
  /** The client's IANA time zone (`x-tz` header), when it sent a valid one. */
  timeZone?: string;
}

const store = new AsyncLocalStorage<RequestContext>();

export function currentDeviceId(): string | undefined {
  return store.getStore()?.deviceId;
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
    const ctx: RequestContext = { deviceId: req?.deviceId, timeZone: validTimeZone(req?.headers?.['x-tz']) };
    return new Observable((subscriber) => store.run(ctx, () => next.handle().subscribe(subscriber)));
  }
}
