import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PharmacyVerificationStatus } from '../../../pharmacy/domain/pharmacy-verification-status.enum';
import { UserEntity } from '../../domain/user.entity';
import { UserRole } from '../../domain/user-role.enum';
import { UserStatus } from '../../domain/user-status.enum';

export class UserResponseDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty({ example: '09121234567' })
  phone: string = '';

  @ApiPropertyOptional({ example: 'Dr. Ali Rezaei' })
  fullName: string | null = null;

  @ApiProperty({ enum: UserRole })
  role: UserRole = UserRole.OWNER;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus = UserStatus.PENDING_PROFILE;

  @ApiPropertyOptional()
  pharmacyId: string | null = null;

  @ApiPropertyOptional()
  pharmacyName: string | null = null;

  @ApiPropertyOptional({ enum: PharmacyVerificationStatus })
  pharmacyVerificationStatus: PharmacyVerificationStatus | null = null;

  @ApiPropertyOptional()
  rejectionReason: string | null = null;

  @ApiProperty()
  createdAt: string = '';

  static fromEntity(entity: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.phone = entity.phone;
    dto.fullName = entity.fullName;
    dto.role = entity.role;
    dto.status = entity.status;
    dto.pharmacyId = entity.pharmacyId;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}

export class OtpRequestResponseDto {
  @ApiProperty({ example: 120, description: 'OTP validity in seconds' })
  expiresIn: number = 120;
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken: string = '';

  @ApiProperty()
  refreshToken: string = '';

  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
  expiresIn: number = 900;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto = new UserResponseDto();
}
