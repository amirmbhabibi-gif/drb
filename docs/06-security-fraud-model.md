# DaruGard – Security & Fraud Model

## Threat Model

DaruGard is a trust network. Its value depends entirely on the integrity of the listings and the pharmacies behind them. A single high-profile fraud incident can destroy the network effect. Security is not a Phase 2 feature.

## Identity & Authentication

### Phase 1 (Bootstrap)
- Pharmacy UUID is passed explicitly in the request body (no auth).
- This is acceptable for internal testing only. Must NOT be exposed publicly.

### Phase 2 (Required before public launch)
- JWT-based authentication (short-lived access tokens, refresh tokens via Redis).
- `pharmacyId` extracted from the verified JWT claim, never from the request body.
- Role-based access control (RBAC): OWNER, MANAGER, STAFF.
- All tokens are stateless JWTs. Revocation via Redis blocklist (on logout or security incident).

### Phase 3
- OAuth2/OIDC for enterprise pharmacy group SSO.
- API keys for programmatic access (Premium tier).

## Input Validation

**Already implemented in Phase 1:**
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` strips and rejects unknown fields.
- `class-validator` decorators enforce types, lengths, and format on all DTOs.
- `ParseUUIDPipe` on all ID path parameters prevents SQL injection via malformed UUIDs.
- Prisma parameterizes all queries automatically (no raw SQL interpolation in Phase 1).

## Fraud Attack Vectors & Mitigations

### 1. Fake Pharmacies (Identity Spoofing)
**Attack**: A malicious actor creates accounts claiming to be real pharmacies.
**Phase 1 mitigation**: None (no public auth).
**Phase 2 mitigation**: 
- Pharmacy license number required at registration.
- Document upload (license scan) for verification queue.
- Verification badge visible on listings only after manual or automated verification.
- Unverified pharmacies limited to 3 listings (free tier quota also acts as fraud deterrent).

### 2. Fake / Misrepresented Listings
**Attack**: A pharmacy posts listings for drugs they don't have, or misrepresent condition/expiry.
**Mitigations**:
- Image upload of actual stock (Phase 2).
- Exchange completion requires photo proof of handoff.
- Reputation score penalized for failed exchanges.
- Repeated failed exchanges trigger account review.
- AI duplicate detection: listings with identical rawText + pharmacyId within 24h are flagged.

### 3. Spam / Listing Flooding
**Attack**: A single pharmacy floods the listing feed with low-quality or irrelevant listings.
**Mitigations**:
- Per-tier listing quotas (3/20/unlimited).
- Rate limiting at API gateway level (100 req/min per IP, 20 create/hour per pharmacy).
- Listing velocity check: >10 listings in 1 hour triggers PENDING moderation state.

### 4. Reputation Manipulation
**Attack**: Coordinated fake exchanges to artificially inflate reputation scores.
**Mitigations**:
- Reviews require completed exchange (enforced by FK constraint).
- Self-review impossible (reviewer_id ≠ subject_id, enforced at application layer).
- Outlier detection: statistically improbable rating patterns flagged for review.
- Review time window: reviews only accepted within 30 days of exchange completion.

### 5. Duplicate Listings
**Attack**: Same item posted multiple times to dominate search results.
**Detection**:
- Similarity check on new listing creation: if a listing with >80% similar rawText exists from the same pharmacyId in the last 7 days, flag as potential duplicate.
- Phase 2: background job using pg_trgm similarity.

### 6. Data Exfiltration
**Attack**: Scraping all listing data to build a competing marketplace.
**Mitigations**:
- Rate limiting on GET /listings (see above).
- Authenticated-only access for contact details (contact info never in listing response).
- Pagination enforced (max 100 items per request).
- Bot detection (user-agent analysis, behavioral fingerprinting) – Phase 3.

## API Security Hardening (Phase 2)

```typescript
// Helmet: sets security headers
app.use(helmet());

// Rate limiting per IP
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// Rate limiting per authenticated pharmacy
// @UseGuards(PharmacyRateLimitGuard) on create endpoints
```

## Audit Trail

Every mutation in Phase 2 writes to `audit_logs`:

```typescript
// AuditInterceptor (NestJS) fires on every mutating request
{
  actor_id: req.user.id,
  actor_type: 'user',
  action: 'listing.created',
  resource_type: 'listing',
  resource_id: listing.id,
  old_values: null,
  new_values: { type, rawText, status },
  ip_address: req.ip,
  occurred_at: NOW()
}
```

Audit logs are write-only (no UPDATE, no DELETE permitted at DB level via role grants).

## OWASP Top 10 Coverage

| Risk | Status |
|---|---|
| A01 Broken Access Control | Phase 2: JWT + RBAC |
| A02 Cryptographic Failures | Phase 2: bcrypt for passwords, HTTPS enforced |
| A03 Injection | Covered: Prisma parameterized queries, ValidationPipe |
| A04 Insecure Design | Covered: DDD boundaries, audit trail, rate limiting |
| A05 Security Misconfiguration | Phase 2: Helmet, env validation, no dev defaults in prod |
| A06 Vulnerable Components | Covered: pinned dependencies, Dependabot alerts |
| A07 Auth & Session Failures | Phase 2: JWT + Redis token blocklist |
| A08 Software Integrity Failures | CI/CD: npm audit, SAST scanning |
| A09 Logging & Monitoring Failures | Phase 2: structured logs → Datadog/Grafana |
| A10 SSRF | Phase 2: image URL validation, outbound request allowlist |
