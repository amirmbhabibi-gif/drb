import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingMetadata } from '../../domain/listing-metadata.vo';
import { ListingStatus } from '../../domain/listing-status.enum';
import { ListingType } from '../../domain/listing-type.enum';
import { ListingEntity } from '../../domain/listing.entity';

export class ListingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() pharmacyId: string;
  @ApiProperty({ enum: ListingType }) type: ListingType;
  @ApiProperty() rawText: string;
  @ApiProperty({ description: 'Flexible JSONB metadata' }) metadata: ListingMetadata;
  @ApiProperty({ enum: ListingStatus }) status: ListingStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional() deletedAt: Date | null;

  constructor(props: {
    id: string;
    pharmacyId: string;
    type: ListingType;
    rawText: string;
    metadata: ListingMetadata;
    status: ListingStatus;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    this.id = props.id;
    this.pharmacyId = props.pharmacyId;
    this.type = props.type;
    this.rawText = props.rawText;
    this.metadata = props.metadata;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  static fromEntity(entity: ListingEntity): ListingResponseDto {
    return new ListingResponseDto({
      id: entity.id,
      pharmacyId: entity.pharmacyId,
      type: entity.type,
      rawText: entity.rawText,
      metadata: entity.metadata,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }
}
