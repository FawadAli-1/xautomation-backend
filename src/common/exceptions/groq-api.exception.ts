import { HttpStatus } from '@nestjs/common';
import { ApiException } from './api.exception';

export class GroqApiException extends ApiException {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.BAD_GATEWAY,
      'GROQ_API_ERROR',
      details
    );
  }
} 