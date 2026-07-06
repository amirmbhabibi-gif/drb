import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ListingType } from '../../domain/listing-type.enum';

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
    description:
      'Free-text description of the drug/item. No structured schema required. ' +
      'Minimum viable listing; all other fields are optional.',
    example: 'Amoxicillin 500mg capsules, 3 boxes, expiry Jun 2025, good condition',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rawText: string = '';

  @ApiPropertyOptional({ type: ListingMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ListingMetadataDto)
  metadata?: ListingMetadataDto;
}
