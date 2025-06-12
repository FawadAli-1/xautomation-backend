import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(
      {
        message,
        status,
        code,
        details,
        timestamp: new Date().toISOString(),
      },
      status
    );
  }
} 