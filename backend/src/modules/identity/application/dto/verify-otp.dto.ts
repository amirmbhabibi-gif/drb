import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import { IsIranianMobile } from '../../../../common/phone/is-iranian-mobile.decorator';
import { toWesternDigits } from '../../../../common/phone/iranian-phone';

export class VerifyOtpDto {
  @ApiProperty({ example: '09121234567' })
  @IsString()
  @IsIranianMobile()
  phone: string = '';

  @ApiProperty({ example: '482913', description: 'OTP code received via SMS' })
  @Transform(({ value }) => (typeof value === 'string' ? toWesternDigits(value) : value))
  @IsString()
  @Matches(/^\d+$/, { message: 'code must contain only digits' })
  @Length(4, 8)
  code: string = '';
}
