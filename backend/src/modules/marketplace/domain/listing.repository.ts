import { PageResult } from '../../../common/dto/pagination.dto';
import { ListingEntity } from './listing.entity';
import { ListingStatus } from './listing-status.enum';
import { ListingType } from './listing-type.enum';

/**
 * Port (interface) for the Listing repository.
 *
 * Defined in the domain layer so that the application layer depends on this
 * abstraction, not on any specific database or ORM. The infrastructure layer
 * provides the concrete implementation (PrismaListingRepository).
 *
 * This is the classic Ports & Adapters / Hexagonal Architecture pattern.
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
