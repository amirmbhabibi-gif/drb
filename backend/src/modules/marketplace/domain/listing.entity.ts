import { ListingMetadata } from './listing-metadata.vo';
import { ListingStatus } from './listing-status.enum';
import { ListingType } from './listing-type.enum';
import { DeliveryMethod } from './delivery-method.enum';
import { MedicationSummary } from './medication-summary.vo';

/**
 * Listing – the core aggregate root of the Marketplace bounded context.
 */
export class ListingEntity {
  readonly id: string;
  readonly pharmacyId: string;
  readonly type: ListingType;
  readonly rawText: string;
  readonly metadata: ListingMetadata;
  readonly status: ListingStatus;
  readonly deliveryMethods: DeliveryMethod[];
  readonly offeredMedications: MedicationSummary[];
  readonly wantedMedications: MedicationSummary[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

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
    this.offeredMedications = props.offeredMedications;
    this.wantedMedications = props.wantedMedications;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  isActive(): boolean {
    return this.status === ListingStatus.ACTIVE;
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  canBeClosed(): boolean {
    return this.status !== ListingStatus.CLOSED && !this.isDeleted();
  }
}
