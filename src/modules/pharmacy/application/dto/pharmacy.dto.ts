import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PharmacyEntity } from '../../domain/pharmacy.entity';
import { PharmacyVerificationStatus } from '../../domain/pharmacy-verification-status.enum';

export class SubmitLicenseDto {
  @ApiProperty({ example: 'داروخانه سلامت' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string = '';

  @ApiProperty({ example: '1234567890', description: 'شماره پروانه' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  licenseNumber: string = '';
}

export class RejectPharmacyDto {
  @ApiProperty({ example: 'تصویر پروانه ناخوانا است' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string = '';
}

export class PharmacyResponseDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  name: string = '';

  @ApiPropertyOptional()
  licenseNumber: string | null = null;

  @ApiProperty({ enum: PharmacyVerificationStatus })
  verificationStatus: PharmacyVerificationStatus = PharmacyVerificationStatus.PENDING;

  @ApiProperty()
  verified: boolean = false;

  @ApiPropertyOptional()
  licenseDocumentName: string | null = null;

  @ApiPropertyOptional()
  licenseSubmittedAt: string | null = null;

  @ApiPropertyOptional()
  rejectionReason: string | null = null;

  static fromEntity(entity: PharmacyEntity): PharmacyResponseDto {
    const dto = new PharmacyResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.licenseNumber = entity.licenseNumber;
    dto.verificationStatus = entity.verificationStatus;
    dto.verified = entity.verified;
    dto.licenseDocumentName = entity.licenseDocumentName;
    dto.licenseSubmittedAt = entity.licenseSubmittedAt?.toISOString() ?? null;
    dto.rejectionReason = entity.rejectionReason;
    return dto;
  }
}

export class AdminPharmacyResponseDto extends PharmacyResponseDto {
  @ApiPropertyOptional({ example: '09121234567' })
  ownerPhone: string | null = null;

  static fromEntityWithOwner(
    entity: PharmacyEntity,
    ownerPhone: string | null,
  ): AdminPharmacyResponseDto {
    const dto = new AdminPharmacyResponseDto();
    const base = PharmacyResponseDto.fromEntity(entity);
    Object.assign(dto, base);
    dto.ownerPhone = ownerPhone;
    return dto;
  }
}
