import { Global, Module } from '@nestjs/common';
import { IranPayamakClient } from './iranpayamak.client';

@Global()
@Module({
  providers: [IranPayamakClient],
  exports: [IranPayamakClient],
})
export class SmsModule {}
