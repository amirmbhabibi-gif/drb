import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Refresh token to revoke on logout (optional)' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class RefreshTokenRequiredDto {
  @ApiProperty({ description: 'Refresh token issued on login or previous refresh' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string = '';
}
