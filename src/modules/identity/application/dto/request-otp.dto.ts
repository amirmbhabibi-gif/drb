import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsIranianMobile } from '../../../../common/phone/is-iranian-mobile.decorator';

export class RequestOtpDto {
  @ApiProperty({ example: '09121234567', description: 'Iranian mobile number' })
  @IsString()
  @IsIranianMobile()
  phone: string = '';
}
