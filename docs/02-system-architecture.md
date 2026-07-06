# DaruGard – System Architecture

## Phase 1: Modular Monolith

A single deployable unit with clear module boundaries. Each bounded context is a NestJS module with its own domain, application, infrastructure, and presentation layers. Modules communicate via service injection (DI), not HTTP—this is the key difference from microservices while maintaining the separation needed for future extraction.

```
┌────────────────────────────────────────────────────────────┐
│                   DaruGard Monolith                        │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  API Gateway Layer                  │  │
│  │  NestJS + Express · Global ValidationPipe ·         │  │
│  │  AllExceptionsFilter · Swagger (/docs)              │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                  │
│  ┌──────────┐  ┌────────┴───────┐  ┌────────────────────┐ │
│  │ Identity │  │  Marketplace   │  │  Future modules    │ │
│  │ (Phase 2)│  │  (Phase 1 ✓)   │  │  Offers, Exchange  │ │
│  └──────────┘  └────────────────┘  └────────────────────┘ │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Infrastructure Layer                   │  │
│  │  PrismaService (PostgreSQL) · RedisService (ioredis)│  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
          │                    │
    PostgreSQL 16          Redis 7
    (Primary DB)         (Cache / Queues)
```

## Directory Layout (per module)

```
modules/<context>/
  domain/              Pure TypeScript: entities, VOs, enums, repository ports
  application/         Use-case services, DTOs. No ORM imports.
  infrastructure/      Prisma/Redis adapters implementing domain ports.
  presentation/        NestJS controllers (HTTP layer only).
  <context>.module.ts  DI wiring: port token → infra adapter.
```

The rule: **imports only flow inward**. Presentation → Application → Domain. Infrastructure → Domain (implements ports). No layer imports from a layer further out.

## Caching Strategy

| Data | Cache Key | TTL | Invalidation |
|---|---|---|---|
| Listing search results (by filter hash) | `listings:search:{hash}` | 60s | On any ACTIVE listing create/delete |
| Individual listing | `listings:id:{uuid}` | 5min | On listing update/close |
| Health check results | N/A | N/A | N/A |

Phase 1: Caching is not implemented. Redis is wired and ready. TTL policy above is the implementation contract for Phase 2.

## Background Jobs (Phase 2 – BullMQ on Redis)

| Queue | Trigger | Handler |
|---|---|---|
| `listing.expiry-check` | Cron: daily at 02:00 | Auto-close listings past expiry date |
| `matching.run` | Event: `ListingCreated` | Run matching algorithm, publish suggestions |
| `notification.send` | Event: multiple | Dispatch push/email/SMS notifications |
| `reputation.recalculate` | Event: `ExchangeCompleted` | Recompute pharmacy reputation score |

## Event System (Phase 2)

Phase 1 uses direct in-process service calls. Phase 2 introduces:

1. **Internal events**: NestJS `EventEmitter2` module for in-process fan-out (low latency, no infrastructure overhead for same-process handlers).
2. **External events**: Redis Streams (or a message broker like RabbitMQ/NATS) for cross-service events when specific modules are extracted to microservices.

Event envelope:

```typescript
interface DomainEvent<T> {
  eventId: string;       // UUID
  eventType: string;     // e.g. 'listing.created'
  aggregateId: string;   // e.g. listing UUID
  occurredAt: string;    // ISO-8601
  payload: T;
  version: number;       // schema version for backward compat
}
```

## Microservices Migration Path (Phase 3+)

Because each module uses the repository port pattern and communicates via interfaces (not concrete dependencies), extracting a module to a microservice requires:

1. Replace the DI provider from `PrismaXxxRepository` to `GrpcXxxRepository` or `HttpXxxRepository`.
2. Extract the module to its own NestJS process with its own database schema.
3. Route cross-module calls through a message broker or gRPC.

No other files change. The domain and application layers remain identical.

Likely extraction order (based on scale pressure):
1. MatchingEngine (CPU-intensive, independent scale)
2. Notifications (IO-intensive, needs independent retry logic)
3. Identity/Auth (security boundary justifies separation)
4. Exchange (financial logic, audit requirements)
