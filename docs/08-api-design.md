# DaruGard – API Design

## Conventions

- **Base URL**: `https://api.darugard.com/api/v1`
- **Versioning**: URI path versioning (`/api/v1`, `/api/v2`). New versions introduced alongside old; old versions deprecated with 6-month sunset notice.
- **Authentication**: Bearer JWT in `Authorization` header (Phase 2). Phase 1: no auth.
- **Content-Type**: `application/json` for all requests and responses.
- **Response envelope**: `{ "data": <payload> }` for success. `{ "statusCode", "error", "message", "timestamp", "path" }` for errors.
- **Pagination**: `?page=1&limit=20`. Response includes `{ items, total, page, limit, totalPages }`.
- **Idempotency**: POST requests are NOT idempotent by default. Phase 2: `Idempotency-Key` header for listing creation.

## Phase 1 Endpoints

### Health

```
GET /health
Response: { status: "ok"|"degraded", timestamp, services: { database, redis } }
```

### Listings

```
POST   /api/v1/listings         Create listing        201 + ListingDto
GET    /api/v1/listings         Search/list           200 + PageResult<ListingDto>
GET    /api/v1/listings/:id     Get single listing    200 + ListingDto
DELETE /api/v1/listings/:id     Soft-delete listing   204
```

#### POST /api/v1/listings

Request:
```json
{
  "pharmacyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "type": "OFFER",
  "rawText": "Amoxicillin 500mg capsules, 3 boxes, expiry Jun 2025",
  "metadata": {
    "expiryDate": "2025-06-30",
    "condition": "Unopened",
    "urgencyLevel": 3,
    "quantity": { "value": 3, "unit": "boxes" },
    "location": { "city": "Tehran", "province": "Tehran", "country": "IR" }
  }
}
```

Response 201:
```json
{
  "data": {
    "id": "uuid",
    "pharmacyId": "uuid",
    "type": "OFFER",
    "rawText": "Amoxicillin 500mg capsules, 3 boxes, expiry Jun 2025",
    "metadata": { ... },
    "status": "ACTIVE",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "deletedAt": null
  }
}
```

#### GET /api/v1/listings

Query parameters:
| Param | Type | Default | Description |
|---|---|---|---|
| `type` | enum | - | OFFER \| NEED \| SWAP |
| `status` | enum | ACTIVE | ACTIVE \| PENDING \| CLOSED |
| `pharmacyId` | UUID | - | Filter by pharmacy |
| `q` | string | - | Free-text search |
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |

Response 200:
```json
{
  "data": {
    "items": [ { ...ListingDto }, ... ],
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

## Phase 2 Endpoints (blueprint)

### Identity & Auth
```
POST   /api/v1/auth/register           Register pharmacy
POST   /api/v1/auth/login              Obtain JWT
POST   /api/v1/auth/refresh            Refresh access token
POST   /api/v1/auth/logout             Revoke refresh token
GET    /api/v1/organisations/me        Current org profile
PATCH  /api/v1/organisations/me        Update profile
```

### Offers & Negotiation
```
POST   /api/v1/listings/:id/offers     Make an offer on a listing
GET    /api/v1/listings/:id/offers     List offers on a listing
PATCH  /api/v1/offers/:id              Accept/reject/withdraw an offer
```

### Exchanges
```
GET    /api/v1/exchanges               List exchanges for current pharmacy
GET    /api/v1/exchanges/:id           Get exchange details
POST   /api/v1/exchanges/:id/complete  Mark exchange as completed
POST   /api/v1/exchanges/:id/dispute   Raise a dispute
```

### Reputation
```
POST   /api/v1/exchanges/:id/reviews   Submit review for an exchange
GET    /api/v1/organisations/:id/reputation  Get reputation profile
```

### Matching
```
GET    /api/v1/listings/:id/matches    Get AI-powered matches for a listing
```

## Error Responses

All errors follow the same envelope:

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": ["rawText must be longer than or equal to 1 characters"],
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/listings"
}
```

Standard HTTP status codes used correctly:
- `400` – Validation failure
- `401` – Missing/invalid auth (Phase 2)
- `403` – Insufficient permissions (Phase 2)
- `404` – Resource not found
- `409` – Conflict (duplicate resource)
- `429` – Rate limit exceeded
- `500` – Internal server error (never expose details)
