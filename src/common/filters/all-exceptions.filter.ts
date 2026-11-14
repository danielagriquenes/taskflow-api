import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { STATUS_CODES } from 'node:http';
import { type ErrorResponseDto } from '../dto/error-response.dto';

type ResolvedError = Pick<ErrorResponseDto, 'statusCode' | 'error' | 'message'>;

const INTERNAL_ERROR_MESSAGE = 'An unexpected error occurred';
const FIRST_SERVER_ERROR_STATUS = 500;

const isServerError = (statusCode: number): boolean => statusCode >= FIRST_SERVER_ERROR_STATUS;

/**
 * Centralised error handling:
 * - `HttpException`s (validation, not found, ...) keep their status and message.
 * - Anything else (Prisma/driver errors, bugs) becomes a generic 500 so that
 *   SQL, stack traces and configuration details never reach API clients.
 *   The full error is logged server-side instead.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request: unknown = ctx.getRequest();
    const resolved = this.resolve(exception);

    if (isServerError(resolved.statusCode)) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Non-error exception thrown',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseDto = {
      ...resolved,
      path: String(httpAdapter.getRequestUrl(request)),
      timestamp: new Date().toISOString(),
    };

    httpAdapter.reply(ctx.getResponse(), body, resolved.statusCode);
  }

  private resolve(exception: unknown): ResolvedError {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: this.reasonPhrase(HttpStatus.INTERNAL_SERVER_ERROR),
        message: INTERNAL_ERROR_MESSAGE,
      };
    }

    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    const error = this.reasonPhrase(statusCode);

    if (isServerError(statusCode)) {
      return { statusCode, error, message: INTERNAL_ERROR_MESSAGE };
    }
    if (typeof response === 'string') {
      return { statusCode, error, message: response };
    }

    const { message } = response as { message?: unknown };
    return { statusCode, error, message: this.normaliseMessage(message, exception.message) };
  }

  private normaliseMessage(message: unknown, fallback: string): string | string[] {
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message;
    }
    return fallback;
  }

  private reasonPhrase(statusCode: number): string {
    return STATUS_CODES[statusCode] ?? 'Error';
  }
}
