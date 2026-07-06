import { ListingMetadata } from './listing-metadata.vo';
import { ListingStatus } from './listing-status.enum';
import { ListingType } from './listing-type.enum';

/**
 * Listing – the core aggregate root of the Marketplace bounded context.
 *
 * This is a pure domain entity: no Prisma imports, no NestJS decorators.
 * It models the business concept and invariants. The infrastructure layer
 * maps to/from this entity via the repository port.
 *
 * Invariants enforced at this layer:
 *   - A closed listing cannot be re-opened (enforced in service layer).
 *   - rawText must be non-empty (enforced in DTO validation).
 *   - pharmacyId is trusted (validated by auth context, Phase 2).
 */
export class ListingEntity {
  readonly id: string;
  readonly pharmacyId: string;
  readonly type: ListingType;
  readonly rawText: string;
  readonly metadata: ListingMetadata;
  readonly status: ListingStatus;
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
