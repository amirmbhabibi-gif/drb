/**
 * Describes the direction of the inventory exchange intent.
 *
 * OFFER – pharmacy has surplus stock and wants to give/sell it.
 * NEED  – pharmacy has a shortage and is looking to receive/buy stock.
 * SWAP  – bidirectional: pharmacy wants to exchange one item for another.
 *
 * Phase 1: OFFER and NEED cover >95% of use-cases.
 * SWAP adds bi-directional matching in Phase 2.
 */
export enum ListingType {
  OFFER = 'OFFER',
  NEED = 'NEED',
  SWAP = 'SWAP',
}
