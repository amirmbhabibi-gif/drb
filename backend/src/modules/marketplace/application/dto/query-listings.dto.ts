import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { ListingStatus } from '../../domain/listing-status.enum';
import { ListingType } from '../../domain/listing-type.enum';

export class QueryListingsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ListingType, description: 'Filter by listing type' })
  @IsOptional()
  @IsEnum(ListingType)
  type?: ListingType;

  @ApiPropertyOptional({ enum: ListingStatus, description: 'Filter by status (default: ACTIVE)' })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({ description: 'Filter by pharmacy UUID' })
  @IsOptional()
  @IsUUID()
  pharmacyId?: string;

  @ApiPropertyOptional({
    description:
      'Free-text search across listing descriptions. ' +
      'Phase 1: case-insensitive substring match. Phase 2: pg_trgm full-text.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
