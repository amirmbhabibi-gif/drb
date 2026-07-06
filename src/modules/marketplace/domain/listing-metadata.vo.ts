/**
 * Value Object describing the flexible JSONB metadata stored alongside a Listing.
 *
 * Design rationale:
 *   - All fields are optional to maximise liquidity: a listing with only rawText
 *     is valid. Pharmacies incrementally add structure over time.
 *   - No drug master-data references (no GTIN, no IRC code) in Phase 1.
 *   - Phase 2 will layer normalisation on top of this data (AI extraction,
 *     voluntary GTIN linkage) without requiring a schema migration.
 *   - urgencyLevel drives future matching-score weighting and boost logic.
 *
 * Extension pattern: add new optional fields here; DB schema doesn't change.
 */
export interface ListingMetadata {
  /** Estimated or exact expiry date (ISO-8601) */
  expiryDate?: string;

  /** Human-readable condition notes, e.g. "unopened, cool-chain maintained" */
  condition?: string;

  /** Urgency signal used by the matching engine (1 = low, 5 = critical) */
  urgencyLevel?: 1 | 2 | 3 | 4 | 5;

  /** Approximate geographic location for proximity-based matching */
  location?: {
    city?: string;
    province?: string;
    country?: string;
    /** ISO 6709 or simple lat/lng for Phase 2 geospatial indexing */
    lat?: number;
    lng?: number;
  };

  /** Quantity the pharmacy wants to offer or receive */
  quantity?: {
    value: number;
    unit: string; // e.g. "boxes", "vials", "units"
  };

  /** Public-facing image URLs (CDN, Phase 2) */
  images?: string[];

  /** Preferred exchange mechanism */
  preferredExchangeType?: 'sale' | 'trade' | 'donation';

  /**
   * Phase 2 hooks – reserved keys, do not write to in Phase 1 application code.
   * Listed here for documentation purposes.
   */
  // _gtin?: string;
  // _ircCode?: string;
  // _inn?: string;   // International Nonproprietary Name
  // _atcCode?: string;
}

/**
 * Narrows an unknown JSON value (from Prisma) to ListingMetadata.
 * Returns an empty object if the value is null or not an object.
 */
export function parseListingMetadata(raw: unknown): ListingMetadata {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as ListingMetadata;
}
