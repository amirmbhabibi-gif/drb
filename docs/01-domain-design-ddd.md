# DaruGard – Domain Design (DDD)

## Bounded Contexts

```
┌──────────────────────┐   ┌───────────────────┐   ┌─────────────────────┐
│   Identity &         │   │   Marketplace     │   │   Offer &           │
│   Organisation       │   │   (Phase 1 ✓)     │   │   Negotiation       │
│                      │   │                   │   │   (Phase 2)         │
│  Pharmacy            │   │  Listing          │   │  Offer              │
│  User                │   │  ListingSearch    │   │  Conversation       │
│  Organisation        │   │  MatchingEngine   │   │  CounterOffer       │
└──────────────────────┘   └───────────────────┘   └─────────────────────┘
         │                          │                          │
         ▼                          ▼                          ▼
┌──────────────────────┐   ┌───────────────────┐   ┌─────────────────────┐
│   Exchange           │   │   Trust &         │   │   Notifications &   │
│   (Phase 2)          │   │   Reputation      │   │   Messaging         │
│                      │   │   (Phase 2)       │   │   (Phase 2)         │
│  Exchange            │   │                   │   │                     │
│  ExchangeDocument    │   │  Review           │   │  Notification       │
│  AuditLog            │   │  ReputationScore  │   │  Channel            │
└──────────────────────┘   └───────────────────┘   └─────────────────────┘
```

## Phase 1: Marketplace Bounded Context

### Aggregate Root: Listing

The `Listing` aggregate is the core of Phase 1. It is intentionally simple—a declaration of intent to exchange inventory.

```
Listing (Aggregate Root)
├── id: UUID
├── pharmacyId: UUID         ← reference to Identity context (opaque in Phase 1)
├── type: ListingType        ← OFFER | NEED | SWAP
├── rawText: string          ← free-text drug description (no catalog dependency)
├── metadata: JSONB          ← expiry, condition, urgency, location, quantity, images
├── status: ListingStatus    ← ACTIVE | PENDING | CLOSED
└── audit fields             ← createdAt, updatedAt, deletedAt
```

**Invariants:**
- `rawText` must be non-empty (minimum viable description).
- A closed listing cannot be re-opened without explicit business justification.
- Soft-deleted listings are excluded from all queries by default.

### Value Objects

**ListingMetadata** – Encapsulates the flexible JSONB structure. No enforcement at DB level; validation at DTO/application layer.

```typescript
interface ListingMetadata {
  expiryDate?: string;         // ISO-8601
  condition?: string;          // free text
  urgencyLevel?: 1 | 2 | 3 | 4 | 5;
  location?: { city, province, country, lat, lng };
  quantity?: { value: number, unit: string };
  images?: string[];
  preferredExchangeType?: 'sale' | 'trade' | 'donation';
}
```

### Domain Events (Phase 2)

Events enable the event-driven architecture needed for decoupled modules:

| Event | Producer | Consumer |
|---|---|---|
| `ListingCreated` | Marketplace | Notifications, MatchingEngine |
| `ListingClosed` | Marketplace | Exchange, Reputation |
| `OfferReceived` | Negotiation | Notifications, Marketplace |
| `ExchangeCompleted` | Exchange | Reputation, Audit |
| `ExchangeFailed` | Exchange | Reputation, Notifications |

## Phase 2: Identity & Organisation Context

```
Organisation (Aggregate Root)
├── id: UUID
├── name: string
├── licenseNumber: string     ← verified pharmacy license
├── verificationStatus: enum  ← UNVERIFIED | PENDING | VERIFIED | SUSPENDED
├── tier: SubscriptionTier   ← FREE | STANDARD | PREMIUM (monetization)
└── Users: User[]

User (Entity)
├── id: UUID
├── organisationId: UUID
├── email: string
├── role: UserRole            ← OWNER | MANAGER | STAFF
└── lastLoginAt: Date
```

## Phase 2: Trust & Reputation Context

```
ReputationScore (Aggregate Root)
├── pharmacyId: UUID
├── successfulExchanges: int
├── failedExchanges: int
├── averageResponseTime: Duration
├── score: Decimal            ← computed, 0-100
└── Reviews: Review[]

Review (Entity)
├── id: UUID
├── exchangeId: UUID          ← invariant: one review per exchange side
├── reviewerId: UUID
├── subjectId: UUID
├── rating: 1 | 2 | 3 | 4 | 5
└── comment: string
```

## Phase 2: Exchange Context

```
Exchange (Aggregate Root)
├── id: UUID
├── listingId: UUID
├── offerId: UUID
├── offerorId: UUID           ← pharmacy making the offer
├── listingOwnerId: UUID      ← pharmacy that posted the listing
├── status: ExchangeStatus    ← AGREED | IN_PROGRESS | COMPLETED | FAILED | DISPUTED
├── agreedTerms: JSONB        ← price, logistics, delivery date
└── Documents: ExchangeDocument[]

ExchangeDocument (Entity)
├── id: UUID
├── type: string              ← INVOICE | TRANSFER_NOTE | PHOTO
└── url: string
```
