import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    status: HttpStatus,
    message: string,
  ) {
    super({ error: code, message }, status);
  }
}
