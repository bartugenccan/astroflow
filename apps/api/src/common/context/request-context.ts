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
}

const store = new AsyncLocalStorage<RequestContext>();

export function currentDeviceId(): string | undefined {
  return store.getStore()?.deviceId;
}

/** Run work (e.g. a background report job) on behalf of a device. */
export function runAsDevice<T>(deviceId: string, fn: () => Promise<T>): Promise<T> {
  return store.run({ deviceId }, fn);
}

/** Opens the context for every HTTP request once the auth guard has resolved the device. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ deviceId?: string }>();
    return new Observable((subscriber) =>
      store.run({ deviceId: req?.deviceId }, () => next.handle().subscribe(subscriber)),
    );
  }
}
