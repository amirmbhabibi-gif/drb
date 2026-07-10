import { PageResult } from '../../../common/dto/pagination.dto';
import { ListingEntity } from './listing.entity';
import { ListingStatus } from './listing-status.enum';
import { ListingType } from './listing-type.enum';
import { DeliveryMethod } from './delivery-method.enum';

/**
 * Port (interface) for the Listing repository.
 */
export interface ListingQueryFilters {
  type?: ListingType;
  status?: ListingStatus;
  pharmacyId?: string;
  /** Free-text search across rawText (Phase 1: ILIKE; Phase 2: pg_trgm / vector) */
  q?: string;
}

export abstract class ListingRepository {
  abstract create(data: {
    pharmacyId: string;
    type: ListingType;
    rawText: string;
    metadata: Record<string, unknown>;
    deliveryMethods: DeliveryMethod[];
    offeredMedicationIds: string[];
    acceptedMedicationIds: string[];
  }): Promise<ListingEntity>;

  abstract findById(id: string): Promise<ListingEntity | null>;

  abstract findMany(
    filters: ListingQueryFilters,
    page: number,
    limit: number,
  ): Promise<PageResult<ListingEntity>>;

  abstract softDelete(id: string): Promise<void>;
}

/** DI injection token for the repository port */
export const LISTING_REPOSITORY = Symbol('LISTING_REPOSITORY');
