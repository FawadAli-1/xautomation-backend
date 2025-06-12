import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = exception.message;
    let code = 'INTERNAL_SERVER_ERROR';
    let details = null;

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      status = exception.getStatus();
      
      if (typeof response === 'object') {
        const errorResponse = response as any;
        message = errorResponse.message || message;
        code = errorResponse.code || code;
        details = errorResponse.details || null;
      }
    }

    // Log the error for debugging
    console.error('Exception caught:', {
      path: request.url,
      timestamp: new Date().toISOString(),
      exception: exception.stack,
    });

    response.status(status).json({
      statusCode: status,
      message,
      code,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
} 