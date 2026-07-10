import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingMetadata } from '../../domain/listing-metadata.vo';
import { ListingStatus } from '../../domain/listing-status.enum';
import { ListingType } from '../../domain/listing-type.enum';
import { DeliveryMethod } from '../../domain/delivery-method.enum';
import { MedicationSummary } from '../../domain/medication-summary.vo';
import { ListingEntity } from '../../domain/listing.entity';

class MedicationSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() genericName: string | null;
  @ApiPropertyOptional() form: string | null;
  @ApiPropertyOptional() strength: string | null;

  constructor(summary: MedicationSummary) {
    this.id = summary.id;
    this.name = summary.name;
    this.genericName = summary.genericName;
    this.form = summary.form;
    this.strength = summary.strength;
  }
}

export class ListingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() pharmacyId: string;
  @ApiProperty({ enum: ListingType }) type: ListingType;
  @ApiProperty() rawText: string;
  @ApiProperty({ description: 'Flexible JSONB metadata' }) metadata: ListingMetadata;
  @ApiProperty({ enum: ListingStatus }) status: ListingStatus;
  @ApiProperty({ enum: DeliveryMethod, isArray: true }) deliveryMethods: DeliveryMethod[];
  @ApiProperty({ type: [MedicationSummaryDto] }) offeredMedications: MedicationSummaryDto[];
  @ApiProperty({ type: [MedicationSummaryDto] }) acceptedMedications: MedicationSummaryDto[];
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
    deliveryMethods: DeliveryMethod[];
    offeredMedications: MedicationSummary[];
    wantedMedications: MedicationSummary[];
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
    this.deliveryMethods = props.deliveryMethods;
    this.offeredMedications = props.offeredMedications.map((m) => new MedicationSummaryDto(m));
    this.acceptedMedications = props.wantedMedications.map((m) => new MedicationSummaryDto(m));
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
      deliveryMethods: entity.deliveryMethods,
      offeredMedications: entity.offeredMedications,
      wantedMedications: entity.wantedMedications,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }
}
