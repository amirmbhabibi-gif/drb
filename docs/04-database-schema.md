# DaruGard – Full Phase 1 Database Schema

## Design Principles

1. **Soft delete everywhere**: `deleted_at TIMESTAMPTZ NULL` on every table. Never hard-delete business data.
2. **Audit fields everywhere**: `created_at`, `updated_at` on every table. Non-negotiable.
3. **UUID primary keys**: portable, non-sequential (prevents enumeration attacks), works across future microservice boundaries.
4. **JSONB for flexible attributes**: avoids premature normalization. Structure can be extracted to columns later without data loss.
5. **Avoid over-normalization**: Phase 1 schema is intentionally lean. Add columns, don't prematurely normalize.
6. **All timestamps use TIMESTAMPTZ**: timezone-aware, essential for a multi-region future.

---

## Phase 1 Tables

### `listings`

Core table. One row per inventory exchange intent.

```sql
CREATE TABLE listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id     UUID NOT NULL,
    type            listing_type NOT NULL,  -- OFFER | NEED | SWAP
    raw_text        TEXT NOT NULL DEFAULT '', -- optional notes (structured meds via join tables)
    metadata        JSONB NOT NULL DEFAULT '{}',
    status          listing_status NOT NULL DEFAULT 'ACTIVE',
    delivery_methods delivery_method[] NOT NULL DEFAULT '{}',

    -- Monetization hooks (reserved, not enforced yet)
    -- boost_score     NUMERIC(5,2),
    -- featured_until  TIMESTAMPTZ,
    -- subscription_tier VARCHAR(50),

    -- Audit
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TYPE listing_type   AS ENUM ('OFFER', 'NEED', 'SWAP');
CREATE TYPE listing_status AS ENUM ('ACTIVE', 'PENDING', 'CLOSED');
CREATE TYPE delivery_method AS ENUM ('PICKUP', 'COURIER', 'POST', 'INTERCITY_FREIGHT');

-- Indexes
CREATE INDEX idx_listings_type_status   ON listings (type, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_pharmacy_id   ON listings (pharmacy_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_created_at    ON listings (status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_deleted_at    ON listings (deleted_at);

-- Phase 2: Full-text search index
-- CREATE INDEX idx_listings_raw_text_gin ON listings USING GIN (to_tsvector('simple', raw_text));
-- CREATE INDEX idx_listings_raw_text_trgm ON listings USING GIN (raw_text gin_trgm_ops);

-- Phase 2: JSONB index for metadata queries
-- CREATE INDEX idx_listings_metadata ON listings USING GIN (metadata);
```

**Purpose**: Stores all inventory exchange listings. Structured medications are linked via join tables. The `metadata` JSONB column absorbs semi-structured attributes. `raw_text` holds optional free-form notes.

**Soft delete strategy**: `deleted_at IS NULL` is part of every query's `WHERE` clause. All indexes include this partial filter for efficiency.

---

### `medications`

Master catalog of medications available for selection in listings.

```sql
CREATE TABLE medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    generic_name    VARCHAR(255),
    form            VARCHAR(100),
    strength        VARCHAR(100),
    atc_code        VARCHAR(20),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_medications_name ON medications (name) WHERE deleted_at IS NULL;
```

**Purpose**: Searchable medication catalog. Seed with sample data; full import later.

---

### `listing_offered_medications`

Join table linking listings to medications the pharmacy is offering.

```sql
CREATE TABLE listing_offered_medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    medication_id   UUID NOT NULL REFERENCES medications(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, medication_id)
);

CREATE INDEX idx_lom_listing ON listing_offered_medications (listing_id);
CREATE INDEX idx_lom_medication ON listing_offered_medications (medication_id);
```

**Invariant**: At least one offered medication per listing (enforced at application layer).

---

### `listing_wanted_medications`

Join table linking listings to medications the pharmacy will accept in exchange.

```sql
CREATE TABLE listing_wanted_medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    medication_id   UUID NOT NULL REFERENCES medications(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, medication_id)
);

CREATE INDEX idx_lwm_listing ON listing_wanted_medications (listing_id);
CREATE INDEX idx_lwm_medication ON listing_wanted_medications (medication_id);
```

**Invariant**: Required for SWAP listings (at least one accepted medication).

---

### `pharmacies` (implemented)

```sql
CREATE TABLE pharmacies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    license_number      VARCHAR(100),
    verified            BOOLEAN NOT NULL DEFAULT false,
    verification_status pharmacy_verification_status NOT NULL DEFAULT 'PENDING',
    license_document_path VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE TYPE pharmacy_verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
```

---

### `users` (implemented)

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(11) NOT NULL UNIQUE,
    full_name       VARCHAR(255),
    role            user_role NOT NULL DEFAULT 'OWNER',
    status          user_status NOT NULL DEFAULT 'PENDING_PROFILE',
    pharmacy_id     UUID REFERENCES pharmacies(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'ADMIN');
CREATE TYPE user_status AS ENUM ('PENDING_PROFILE', 'PENDING_VERIFICATION', 'ACTIVE', 'REJECTED', 'SUSPENDED');
```

**Staff management**: Pharmacy owners create STAFF/MANAGER users linked to their `pharmacy_id`. Staff log in via phone OTP.

---

## Phase 2 Tables (blueprint)

### `organisations`

```sql
CREATE TABLE organisations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    license_number      VARCHAR(100) UNIQUE NOT NULL,
    verification_status org_verification_status NOT NULL DEFAULT 'UNVERIFIED',
    subscription_tier   subscription_tier NOT NULL DEFAULT 'FREE',
    metadata            JSONB NOT NULL DEFAULT '{}',  -- address, contact, etc.
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE TYPE org_verification_status AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'SUSPENDED');
CREATE TYPE subscription_tier       AS ENUM ('FREE', 'STANDARD', 'PREMIUM');

CREATE UNIQUE INDEX idx_organisations_license ON organisations (license_number) WHERE deleted_at IS NULL;
```

### `users`

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'STAFF',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'STAFF');
CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_org ON users (organisation_id);
```

### `offers`

```sql
CREATE TABLE offers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES listings(id),
    offeror_id      UUID NOT NULL,              -- pharmacy making the offer
    message         TEXT,
    proposed_terms  JSONB NOT NULL DEFAULT '{}',
    status          offer_status NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TYPE offer_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');
CREATE INDEX idx_offers_listing ON offers (listing_id);
CREATE INDEX idx_offers_offeror ON offers (offeror_id);
```

### `exchanges`

```sql
CREATE TABLE exchanges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES listings(id),
    offer_id        UUID NOT NULL REFERENCES offers(id),
    initiator_id    UUID NOT NULL,
    counterpart_id  UUID NOT NULL,
    agreed_terms    JSONB NOT NULL DEFAULT '{}',
    status          exchange_status NOT NULL DEFAULT 'AGREED',
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TYPE exchange_status AS ENUM ('AGREED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'DISPUTED');
```

### `reviews`

```sql
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id     UUID NOT NULL REFERENCES exchanges(id),
    reviewer_id     UUID NOT NULL,
    subject_id      UUID NOT NULL,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (exchange_id, reviewer_id)   -- one review per exchange side per reviewer
);
```

### `audit_logs`

```sql
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,    -- high-volume, use BIGSERIAL not UUID
    actor_id        UUID,
    actor_type      VARCHAR(50),             -- 'user' | 'system' | 'admin'
    action          VARCHAR(100) NOT NULL,   -- 'listing.created', 'offer.accepted'
    resource_type   VARCHAR(100) NOT NULL,
    resource_id     UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_actor    ON audit_logs (actor_id);
CREATE INDEX idx_audit_time     ON audit_logs (occurred_at DESC);
```

**Note**: Audit logs are append-only. No `deleted_at`. Never delete audit records.
