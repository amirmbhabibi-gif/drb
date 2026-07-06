/**
 * Lifecycle state machine for a Listing.
 *
 * PENDING → ACTIVE  : listing passes moderation / auto-approval (Phase 2 flag)
 * ACTIVE  → CLOSED  : listing is fulfilled, expired, or manually closed by pharmacy
 * ACTIVE  → PENDING : listing is flagged for re-moderation (fraud detection, Phase 2)
 *
 * Phase 1: all listings are created as ACTIVE (no moderation queue).
 * PENDING is reserved as a structural hook for Phase 2 trust/moderation pipeline.
 */
export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  CLOSED = 'CLOSED',
}
