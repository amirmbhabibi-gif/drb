# DaruGard – Engineering Roadmap

## Phase 1: Core Exchange (Now)

**Goal**: Prove the liquidity hypothesis. Get pharmacies posting and discovering listings.

**Duration**: 6-8 weeks.

**Deliverables**:
- [x] NestJS backend with DDD modular monolith structure
- [x] PostgreSQL + Prisma + Redis infrastructure
- [x] `listings` table with JSONB metadata
- [x] POST/GET/DELETE /api/v1/listings
- [x] Free-text search (ILIKE)
- [x] Soft delete + audit fields
- [x] Global error handling + request validation
- [x] Swagger documentation
- [x] Health check endpoint
- [ ] Frontend: pharmacy listing form + search feed (separate repo)
- [ ] Staging deployment (Docker Compose on VPS or Railway)
- [ ] Basic monitoring (UptimeRobot)

**Success metric**: 50 pharmacies, 200 active listings, at least 1 successful match (verbal confirmation).

---

## Phase 2: Trust & Matching (Months 2-4)

**Goal**: Convert discovered listings into completed exchanges. Build the trust layer.

**Deliverables**:
- [x] `Identity & Auth` bounded context (partial): phone OTP login, JWT access/refresh, User/Pharmacy Prisma models, Redis token revocation
- [ ] `Offer & Negotiation` bounded context: offer flow, counter-offers
- [ ] `Exchange` bounded context: exchange record, completion flow, document upload
- [ ] `Trust & Reputation` bounded context: post-exchange reviews, reputation score
- [ ] `Notification` system: in-app, email, WhatsApp (for the Iranian market)
- [ ] pg_trgm full-text search (GIN index)
- [ ] Scoring-based matching engine (Phase 2 algorithm in docs/05)
- [ ] Rate limiting (per-IP + per-pharmacy)
- [ ] Helmet + security headers
- [ ] Audit log table + interceptor
- [ ] Read replica for GET queries
- [ ] Redis caching for search results
- [ ] Subscription tier enforcement (Free quota: 3 listings)
- [ ] Staging → Production deployment pipeline (GitHub Actions → Docker)

**Success metric**: 500 pharmacies, 50 completed exchanges, NPS > 40.

---

## Phase 3: Intelligence & Monetization (Months 5-8)

**Goal**: Generate revenue. Make the matching engine the core differentiator.

**Deliverables**:
- [ ] Subscription billing (Stripe or local payment gateway)
- [ ] Boosted listings (paid visibility)
- [ ] Vector embedding matching (pgvector + embedding model)
- [ ] Geographic matching (PostGIS)
- [ ] Analytics dashboard for pharmacies
- [ ] Shortage alerts (notify when a NEED matches a new OFFER)
- [ ] Image upload (S3 + CDN)
- [ ] API access for Premium tier (API keys)
- [ ] BullMQ background job system
- [ ] Prometheus + Grafana observability stack
- [ ] PgBouncer connection pooling
- [ ] Multi-language support (Persian/Farsi UI)

**Success metric**: First $10K MRR, 2,000 pharmacies, 500 exchanges/month.

---

## Phase 4: Scale & Platform (Months 9-18)

**Goal**: National pharmaceutical exchange network. Data products.

**Deliverables**:
- [ ] National shortage map (aggregated, anonymized)
- [ ] AI copilot: "You have X boxes expiring in 30 days. 3 pharmacies are looking for this drug within 50km."
- [ ] Regulatory reporting API (for MOHME or equivalent authority)
- [ ] Logistics integration (third-party cold-chain delivery)
- [ ] MatchingEngine microservice extraction
- [ ] Multi-country expansion (schema: country_code on Organisation)
- [ ] Data intelligence subscription (sell to distributors/manufacturers)
- [ ] Mobile app (React Native)

**Success metric**: Market leader in 2+ countries, $100K MRR, regulatory partnership.

---

## Technical Debt Register

Track these explicitly. Do not let them become invisible.

| Item | Priority | Phase |
|---|---|---|
| Pharmacy auth (JWT) blocking production launch | CRITICAL | 2 |
| ILIKE search → pg_trgm (performance at scale) | HIGH | 2 |
| Hardcoded pharmacyId in request body | CRITICAL | 2 |
| No rate limiting | HIGH | 2 |
| No audit log on listing mutations | MEDIUM | 2 |
| Redis caching not implemented | MEDIUM | 2-3 |
| Boost/rank fields commented out in schema | LOW | 3 |
| No image upload for listings | MEDIUM | 3 |
| No automated subscription enforcement | MEDIUM | 3 |
