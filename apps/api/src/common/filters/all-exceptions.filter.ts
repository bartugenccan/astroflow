import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { safeError } from '../logging/safe-error';

/** Prisma error codes that are really the client's fault. */
const PRISMA_CLIENT_ERRORS: Record<string, { status: number; message: string }> = {
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Not found' }, // record to update/delete not found
  P2023: { status: HttpStatus.BAD_REQUEST, message: 'Invalid id' }, // malformed id (e.g. not a uuid)
  P2002: { status: HttpStatus.CONFLICT, message: 'Already exists' }, // unique constraint
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Invalid reference' }, // foreign key
};

/**
 * Last line of defence for responses: HttpExceptions pass through as thrown;
 * known Prisma errors become clean 4xx; everything else is a bare 500. Internal
 * messages and stack traces only ever reach the (scrubbed) server log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const code = (exception as { code?: unknown })?.code;
    const known = typeof code === 'string' ? PRISMA_CLIENT_ERRORS[code] : undefined;
    if (known) {
      res.status(known.status).json({ statusCode: known.status, message: known.message });
      return;
    }

    this.logger.error(safeError(exception));
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' });
  }
}
