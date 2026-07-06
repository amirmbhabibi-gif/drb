import { HttpException, HttpStatus } from '@nestjs/common';

export class SmsDeliveryException extends HttpException {
  constructor() {
    super(
      {
        error: 'SMS_DELIVERY_FAILED',
        message: 'Unable to deliver SMS at this time. Please try again later.',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
