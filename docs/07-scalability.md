# DaruGard – Scalability Strategy

## Phase 1: Single Server

Target: 1,000 pharmacies, ~10,000 listings. A single $50/mo VPS handles this comfortably.

Stack:
- 1x NestJS process (Node.js)
- 1x PostgreSQL instance
- 1x Redis instance
- Docker Compose or a basic managed service (Railway, Render, DigitalOcean App Platform)

No horizontal scaling needed. Focus is on correctness and product-market fit.

## Phase 2: Vertical Scale + Read Replicas

Target: 10,000 pharmacies, ~500,000 listings, ~50,000 daily active users.

Changes:
- **PostgreSQL read replica**: route all GET queries to replica, writes to primary. NestJS uses two Prisma clients (primary + replica). Typical setup: managed PostgreSQL on AWS RDS or Supabase.
- **Redis Cluster**: add Redis for caching search results (TTL: 60s), session storage, and BullMQ job queues.
- **Horizontal NestJS scaling**: 2-4 instances behind a load balancer (Nginx or AWS ALB). Requires session-less auth (JWT, no sticky sessions).
- **CDN**: Cloudflare in front of the API for DDoS protection and edge caching of public GET endpoints.

Database indexing additions:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_listings_raw_text_trgm ON listings USING GIN (raw_text gin_trgm_ops);
```

## Phase 3: Horizontal Scale + Caching

Target: 100,000 pharmacies, 5M listings, national-scale traffic.

Changes:
- **Redis cache layer**: cache `GET /listings` responses by filter hash (60s TTL). Cache invalidation on any listing mutation.
- **Search extraction**: Elasticsearch or Typesense for full-text search, relieving PostgreSQL.
- **Background job scaling**: BullMQ with dedicated worker processes for matching, notifications, reputation recalculation.
- **Object storage**: S3-compatible (AWS S3, MinIO) for listing images with CDN distribution.
- **Database sharding consideration**: listings partitioned by `created_at` month (PostgreSQL table partitioning). Keeps index sizes manageable.

```sql
-- Partition listings table by month (Phase 3)
CREATE TABLE listings (...)
PARTITION BY RANGE (created_at);

CREATE TABLE listings_2025_01 PARTITION OF listings
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

## Phase 4: Microservices (Selective)

Target: >500,000 pharmacies, multi-country deployment.

Selective extraction (not a full microservices rewrite—only where the scale justifies it):

1. **MatchingEngine service**: CPU/memory intensive. Scale independently. Own database (read-only replica of listings + vector index).
2. **Notification service**: IO-intensive, independent retry logic. Redis Streams consumer.
3. **Identity/Auth service**: security boundary, independent deploy cadence.

Keep Marketplace, Exchange, and Reputation as a monolith until there's a concrete bottleneck that justifies the operational cost.

## Performance Targets

| Metric | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| p50 latency (GET /listings) | <100ms | <50ms | <30ms |
| p99 latency (GET /listings) | <500ms | <200ms | <100ms |
| POST /listings throughput | 50 rps | 500 rps | 5,000 rps |
| DB connection pool | 5 | 20 | 100 (PgBouncer) |
| Max active listings | 10K | 500K | 10M |

## Connection Pooling

Phase 1: Prisma's built-in connection pool (5 connections by default). Sufficient for development.

Phase 2: Increase Prisma pool size. Add `?connection_limit=20` to `DATABASE_URL`.

Phase 3: Add PgBouncer in front of PostgreSQL in transaction mode. Prisma connects to PgBouncer; PgBouncer multiplexes to PostgreSQL. This is critical for serverless or heavily concurrent workloads.

## Observability

Phase 2 must add:
- Structured JSON logging (already using NestJS Logger; route to stdout, collect with Loki/Datadog).
- Metrics: `prom-client` for Prometheus-compatible metrics (request count, latency histograms, error rates).
- Tracing: OpenTelemetry SDK with Jaeger or Tempo for distributed trace correlation.
- Alerting: p99 latency >500ms, error rate >1%, DB pool saturation >80%.
