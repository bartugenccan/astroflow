/**
 * Sentry bootstrap. Must be the first import in main.ts so its OpenTelemetry
 * instrumentation patches http/express/nest before they load.
 *
 * Off unless SENTRY_DSN is set. Request bodies are never captured (they carry
 * birth data and whatever the user typed to Aster), and the Authorization
 * header, cookies, user and IP are stripped before an event is sent. Only 5xx
 * errors are reported — see AllExceptionsFilter.
 */
import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/nestjs';
import { scrubMessage } from './common/logging/safe-error';

// ConfigModule loads .env later; Sentry needs the DSN now.
dotenv.config();

const dsn = (process.env.SENTRY_DSN ?? '').trim();

Sentry.init({
  dsn,
  enabled: dsn.length > 0,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  // v11 collects almost everything by default; collect only what diagnoses a fault.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: { allow: ['user-agent', 'content-type', 'content-length'] }, response: false },
    httpBodies: [],
    urlQueryParams: true, // only ?locale= / ?feature= — no personal data in query strings
    databaseQueryData: false,
    genAI: { inputs: false, outputs: false },
    queues: false,
    stackFrameVariables: false,
  },
  beforeSend(event) {
    delete event.user;
    // Prisma and upstream messages can echo query arguments (ids, user text).
    for (const ex of event.exception?.values ?? []) {
      if (ex.value) ex.value = scrubMessage(ex.value);
    }
    if (event.message) event.message = scrubMessage(event.message);
    for (const crumb of event.breadcrumbs ?? []) {
      if (crumb.message) crumb.message = scrubMessage(crumb.message);
      delete crumb.data;
    }
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.Authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-device-id'];
      }
    }
    return event;
  },
});
