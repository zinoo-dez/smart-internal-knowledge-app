import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      this.logger.warn(
        `Exception occurred after headers were sent at ${request.method} ${request.url}: ${
          (exception as any)?.stack || (exception as any)?.message
        }`,
      );
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' ? res : { message: res };
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception at ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      // In production, do not leak raw system internals or DB error traces
      message =
        process.env.NODE_ENV === 'production'
          ? 'An unexpected internal server error occurred'
          : exception.message;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: typeof message === 'object' ? message : { message },
    });
  }
}
