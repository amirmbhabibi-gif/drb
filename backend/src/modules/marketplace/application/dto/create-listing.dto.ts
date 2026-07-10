import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ListingType } from '../../domain/listing-type.enum';
import { DeliveryMethod } from '../../domain/delivery-method.enum';

class LocationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) province?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsLongitude() lng?: number;
}

class QuantityDto {
  @ApiProperty({ example: 10 }) @IsNumber() @Min(0) value: number = 0;
  @ApiProperty({ example: 'boxes' }) @IsString() @IsNotEmpty() @MaxLength(50) unit: string = '';
}

class ListingMetadataDto {
  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'Unopened, stored at room temperature' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  condition?: string;

  @ApiPropertyOptional({ enum: [1, 2, 3, 4, 5], description: '1 = low urgency, 5 = critical' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  urgencyLevel?: 1 | 2 | 3 | 4 | 5;

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({ type: QuantityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuantityDto)
  quantity?: QuantityDto;

  @ApiPropertyOptional({ type: [String], description: 'Public image URLs' })
  @IsOptional()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiPropertyOptional({ enum: ['sale', 'trade', 'donation'] })
  @IsOptional()
  @IsEnum(['sale', 'trade', 'donation'])
  preferredExchangeType?: 'sale' | 'trade' | 'donation';
}

export class CreateListingDto {
  @ApiProperty({ enum: ListingType, example: ListingType.OFFER })
  @IsEnum(ListingType)
  type: ListingType = ListingType.OFFER;

  @ApiProperty({
    type: [String],
    description: 'Medication IDs the pharmacy is offering (at least one required)',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  offeredMedicationIds: string[] = [];

  @ApiPropertyOptional({
    type: [String],
    description: 'Medication IDs accepted in exchange (required when type is SWAP)',
    example: ['550e8400-e29b-41d4-a716-446655440001'],
  })
  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.SWAP)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  acceptedMedicationIds?: string[];

  @ApiProperty({
    enum: DeliveryMethod,
    isArray: true,
    description: 'Preferred delivery methods for this listing',
    example: [DeliveryMethod.PICKUP, DeliveryMethod.COURIER],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(DeliveryMethod, { each: true })
  deliveryMethods: DeliveryMethod[] = [];

  @ApiPropertyOptional({
    description: 'Optional free-text notes about the listing',
    example: 'Amoxicillin 500mg capsules, 3 boxes, expiry Jun 2025, good condition',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rawText?: string;

  @ApiPropertyOptional({ type: ListingMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ListingMetadataDto)
  metadata?: ListingMetadataDto;
}
