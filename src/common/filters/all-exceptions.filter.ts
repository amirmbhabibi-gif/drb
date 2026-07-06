import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, errorCode } = this.resolveException(exception);

    const errorResponse: ErrorResponse = {
      statusCode,
      error: errorCode ?? HttpStatus[statusCode] ?? 'INTERNAL_SERVER_ERROR',
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} → ${statusCode}: ${JSON.stringify(message)}`,
      );
    }

    response.status(statusCode).json(errorResponse);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
    errorCode?: string;
  } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const body = res as { message?: string | string[]; error?: string };
        const message = body.message ?? exception.message;
        const errorCode = typeof body.error === 'string' ? body.error : undefined;
        return { statusCode: exception.getStatus(), message, errorCode };
      }
      return { statusCode: exception.getStatus(), message: exception.message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid data provided' };
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }

  private resolvePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists' };
      case 'P2025':
        return { statusCode: HttpStatus.NOT_FOUND, message: 'Resource not found' };
      case 'P2003':
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid reference' };
      default:
        return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error' };
    }
  }
}
