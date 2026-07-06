# DaruGard – Matching Engine Design

## Philosophy

The matching engine is the core intelligence asset of DaruGard. Phase 1 uses simple text search. Phase 2 builds a scoring engine. Phase 3 integrates vector embeddings and ML. The architecture must support all three without major rewrites.

## Phase 1: ILIKE Search

Current implementation: `WHERE raw_text ILIKE '%{query}%'`.

Limitations:
- No ranking by relevance.
- No stemming or synonyms (e.g., "amox" won't match "amoxicillin").
- Performance degrades beyond ~100k rows without pg_trgm.

## Phase 2: Scoring Engine

### Score Components

```typescript
interface ListingScore {
  textSimilarity: number;     // 0-1: how well does rawText match the query?
  geographicProximity: number; // 0-1: how close is the listing pharmacy?
  expiryCompatibility: number; // 0-1: does the expiry date allow enough time?
  urgencyWeight: number;       // 0-1: normalized urgencyLevel (1-5 → 0.2-1.0)
  reputationScore: number;     // 0-1: normalized pharmacy reputation (0-100 → 0-1)
  boostMultiplier: number;     // 1.0-2.0: paid boost (default 1.0)
}

function computeScore(s: ListingScore): number {
  const organic =
    s.textSimilarity    * 0.35 +
    s.geographicProximity * 0.25 +
    s.expiryCompatibility * 0.20 +
    s.urgencyWeight       * 0.10 +
    s.reputationScore     * 0.10;

  return organic * s.boostMultiplier;
}
```

Weights are configurable via feature flags. The matching engine reads them at runtime, not compile time.

### Text Similarity (Phase 2)

Replace ILIKE with `pg_trgm` trigram similarity:

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast trigram matching
CREATE INDEX idx_listings_raw_text_trgm ON listings USING GIN (raw_text gin_trgm_ops);

-- Query with similarity ranking
SELECT *, similarity(raw_text, $1) AS score
FROM listings
WHERE raw_text % $1   -- pg_trgm similarity threshold (default: 0.3)
  AND deleted_at IS NULL
  AND status = 'ACTIVE'
ORDER BY score DESC;
```

### Geographic Proximity (Phase 2)

Requires lat/lng in `metadata.location`. Use PostgreSQL's built-in point distance or PostGIS for accurate geodesic distance:

```sql
-- PostGIS approach (Phase 2)
SELECT *, ST_Distance(
  ST_MakePoint(metadata->>'location'->>'lng', metadata->>'location'->>'lat')::geography,
  ST_MakePoint($lon, $lat)::geography
) AS distance_m
FROM listings
ORDER BY distance_m ASC;
```

### Expiry Compatibility

For a NEED posting today (`now()`), score OFFER listings by expiry:

```
daysUntilExpiry = (listing.metadata.expiryDate - now()) / 86400
if daysUntilExpiry < 0:       score = 0    (already expired)
if daysUntilExpiry < 30:      score = 0.2  (urgent but usable)
if daysUntilExpiry < 90:      score = 0.7  (good)
if daysUntilExpiry >= 90:     score = 1.0  (excellent)
```

## Phase 3: AI/Vector Matching

Replace pg_trgm text similarity with vector embeddings:

1. On listing creation, compute a vector embedding of `rawText` using a multilingual embedding model (e.g., OpenAI `text-embedding-3-small` or a self-hosted model for data privacy).
2. Store the embedding in a `pgvector` column.
3. Use cosine similarity for nearest-neighbor search.

```sql
-- Phase 3 schema addition
ALTER TABLE listings ADD COLUMN embedding VECTOR(1536);
CREATE INDEX idx_listings_embedding ON listings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Query
SELECT *, 1 - (embedding <=> $query_embedding) AS similarity
FROM listings
ORDER BY similarity DESC
LIMIT 20;
```

This enables:
- Language-agnostic matching (Persian drug name matches English description).
- Synonym matching ("paracetamol" matches "acetaminophen").
- Dosage tolerance (500mg query surfaces 250mg and 1000mg listings with lower scores).

## Matching Engine Interface

```typescript
// Domain port (abstract) – in matching bounded context
abstract class MatchingEngine {
  abstract findMatches(
    sourceListing: ListingEntity,
    options: MatchingOptions,
  ): Promise<MatchResult[]>;
}

interface MatchResult {
  listing: ListingEntity;
  score: number;            // 0-1
  scoreBreakdown: ListingScore;
}

interface MatchingOptions {
  limit: number;
  radiusKm?: number;
  minScore?: number;
  tier: SubscriptionTier;   // affects score computation and result limit
}
```

Phase 1: No-op implementation (returns empty array).
Phase 2: SQL-based scorer.
Phase 3: Vector + ML scorer.

The application layer never changes; only the implementation behind the port changes.
