# DaruGard – IranPayamak (FarazSMS) SMS & OTP Integration

## Overview

DaruGard uses **[FarazSMS / IranPayamak](https://docs.iranpayamak.com/)** as the SMS transport provider for:

1. **OTP authentication** — phone-based login and verification (**implemented** in Identity module)
2. **Transactional notifications** — exchange updates, offer alerts, etc. (Phase 2 Notifications module)

FarazSMS is an **SMS delivery API**, not a full OTP platform. DaruGard owns OTP generation, storage, verification, and rate limiting. FarazSMS only delivers the message to the user's phone.

---

## Provider Documentation

| Resource | URL |
|----------|-----|
| API docs (main) | https://docs.iranpayamak.com/ |
| LLM-friendly index | https://docs.iranpayamak.com/llms.txt |
| Base URL (production) | `https://api.iranpayamak.com` |

---

## What FarazSMS Handles vs. What DaruGard Handles

| Responsibility | Owner |
|----------------|-------|
| Generate OTP code | **DaruGard** (backend) |
| Store OTP with TTL | **DaruGard** (Redis) |
| Verify user-submitted code | **DaruGard** (backend) |
| Rate limit / resend cooldown | **DaruGard** (backend) |
| Brute-force protection (max attempts) | **DaruGard** (backend) |
| Issue JWT after successful verify | **DaruGard** (backend) |
| Send SMS to Iranian mobile | **FarazSMS** |
| Pre-approved message templates (patterns) | **FarazSMS** (panel + API) |
| Sender line management | **FarazSMS** |
| SMS delivery request tracking | **FarazSMS** |
| Wallet / billing | **FarazSMS** |

> **Important:** FarazSMS Auth endpoints (`/auth/login`, `/auth/verify-2fa`) authenticate **your FarazSMS panel account**, not DaruGard end users. Do not confuse panel 2FA with user OTP login.

---

## Authentication

### Primary: API Key (required for all SMS sends)

Every request to the FarazSMS API must include:

```
Api-Key: <your-api-key>
Accept: application/json
Content-Type: application/json
```

Obtain the API key from the FarazSMS user panel.

### Secondary: Bearer token (optional, for some account endpoints)

Some account endpoints (e.g. listing accessible lines) require a Bearer token obtained via panel login:

```
POST /ws/v1/auth/login
Authorization: (none — only Api-Key header)
Body: { "username": "...", "password": "...", "method": null }
```

If 2FA is enabled on the panel account:

```
POST /ws/v1/auth/verify-2fa
Body: { "token": "...", "code": "...", "method": "sms" }
```

For day-to-day OTP and notification sending, **`Api-Key` alone is sufficient** once `line_number` and `pattern_code` are known from the panel.

---

## API Response Envelope

All FarazSMS endpoints return a consistent envelope:

```json
{
  "status": "success",
  "data": "<payload>",
  "messages": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"success"` \| `"error"` | Operation result |
| `data` | `number` \| `string` \| `object` \| `null` | Payload (send request ID on SMS success) |
| `messages` | `string` \| `array` \| `object` \| `null` | Error details or info messages |

On SMS send success, `data` is a **numeric send request ID** used for delivery tracking.

---

## OTP: Pattern-Based SMS (Recommended)

Iranian regulations require pre-approved templates for OTP messages. Use the **pattern-based** endpoint, not free-form text.

### Endpoint

```
POST /ws/v1/sms/pattern
```

**Docs:** https://docs.iranpayamak.com/send-pattern-based-sms-13925177e0.md

**Success HTTP status:** `201`

### Request Body

```json
{
  "code": "SJ3FgPrE0C",
  "recipient": "09120000000",
  "attributes": {
    "code": "482913"
  },
  "line_number": "50002178584000",
  "number_format": "english"
}
```

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `code` | Yes | `string` | Pattern UID from FarazSMS panel (after approval) |
| `recipient` | Yes | `string` | Iranian mobile: `09xxxxxxxxx` (11 digits) |
| `attributes` | No | `object` | Map of pattern variable names → string values |
| `line_number` | Yes | `string` | Sender line (digits only, regex: `^[0-9]+$`) |
| `number_format` | Yes | `string` | Digit style in message body |
| `schedule` | No | `string` (datetime) | Scheduled send time; use `null` for immediate OTP |

### `number_format` Values

The docs show inconsistent enum values across endpoints:

| Endpoint family | Documented values |
|-----------------|-------------------|
| Pattern SMS | `en`, `fa` |
| Simple SMS | `english`, `persian` |

**Action required during integration:** confirm the exact accepted value with a test call against the sandbox/production API. Store the working value in `IRANPAYAMAK_NUMBER_FORMAT`.

### Success Response

```json
{
  "status": "success",
  "data": 407328,
  "messages": null
}
```

`data` = send request ID → use for delivery status lookup.

---

## OTP Pattern Setup (One-Time)

Before sending OTP SMS, create and get approval for an OTP pattern.

### Create Pattern via API

```
POST /ws/v1/patterns
```

**Docs:** https://docs.iranpayamak.com/create-new-pattern-13925176e0.md

**Success HTTP status:** `201`

### Request Body

```json
{
  "text": "کد تایید داروگرد: %code%\nاعتبار: %expiry% دقیقه",
  "description": "DaruGard OTP verification code",
  "share": 1,
  "website": "darugard.com",
  "category": 1,
  "vars": [
    {
      "var": "code",
      "length": 6,
      "type": "int"
    },
    {
      "var": "expiry",
      "length": 3,
      "type": "int"
    }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `text` | Yes | Template text; variables wrapped in `%var_name%` |
| `description` | Yes | Human-readable description (nullable in examples) |
| `share` | Yes | Boolean (1 = shared) |
| `website` | Yes | Application domain |
| `category` | Yes | `1` = OTP, `2` = club, `3` = order, `255` = others |
| `vars` | Yes | Array of variable definitions |

### Variable Definition (`vars[]`)

| Field | Type | Description |
|-------|------|-------------|
| `var` | `string` | Variable name (used as `%var%` in text and as key in `attributes`) |
| `length` | `integer` | Max length of the variable value |
| `type` | `string` | `int`, `str`, or `date` |

### Pattern Categories

| Value | Category |
|-------|----------|
| `1` | OTP |
| `2` | Club / marketing |
| `3` | Order |
| `255` | Other |

**Always use `category: 1` for OTP messages.**

### After Creation

1. Pattern enters FarazSMS approval queue (can take hours to days).
2. Once approved, note the **pattern `code`** (UID) from the panel.
3. Store `code` as `IRANPAYAMAK_OTP_PATTERN_CODE` in environment config.
4. Optionally verify via `GET /ws/v1/patterns/{code}`.

**Docs:** https://docs.iranpayamak.com/get-pattern-details-16297027e0.md

### Suggested DaruGard OTP Template

```
کد تایید داروگرد: %code%
این کد تا %expiry% دقیقه معتبر است.
```

Single-variable alternative:

```
کد تایید داروگرد: %code%
```

---

## General SMS: Simple SMS (Non-OTP Notifications)

For non-OTP transactional messages (e.g. "Your offer was accepted"), use simple SMS.

### Endpoint

```
POST /ws/v1/sms/simple
```

**Docs:** https://docs.iranpayamak.com/send-simple-sms-13909967e0.md

**Success HTTP status:** `201`

### Request Body

```json
{
  "text": "پیشنهاد شما برای لیستینگ #1234 پذیرفته شد.",
  "line_number": "2191307530",
  "recipients": ["09391155747"],
  "number_format": "english",
  "schedule": null
}
```

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `text` | Yes | `string` | Message body (free-form) |
| `line_number` | Yes | `string` | Sender line |
| `recipients` | Yes | `string[]` | Array of mobile numbers |
| `number_format` | Yes | `string` | `english` or `persian` |
| `schedule` | Yes | `string` \| `null` | Send time or `null` for immediate |

> **Do not use Simple SMS for OTP.** Unapproved free-form OTP text is likely to be blocked or filtered in Iran.

---

## Supporting Endpoints

### Account Balance

```
GET /ws/v1/account/balance
```

**Docs:** https://docs.iranpayamak.com/account-balance-13717911e0.md

**Auth:** `Api-Key` header

**Response example:**

```json
{
  "status": "success",
  "message": null,
  "data": {
    "balanceAmount": 5000,
    "balanceCount": 25,
    "details": [
      { "count": 25, "rate": 200, "amount": 5000 }
    ]
  }
}
```

Use for health checks and low-balance alerting.

### Accessible Sender Lines

```
GET /ws/v1/lines/accessible?search=&is_dedicated=
```

**Docs:** https://docs.iranpayamak.com/lines-27039797e0.md

**Auth:** `Api-Key` + `Bearer` token (from panel login)

Use during initial setup to discover the `line_number` to configure.

### Send Request Status (Delivery Tracking)

```
GET /ws/v1/send_request/{send_request_id}
```

**Docs:** https://docs.iranpayamak.com/show-send-request-details-27724809e0.md

**Auth:** `Api-Key` header

Use to debug failed OTP deliveries. `send_request_id` = `data` field from a successful send response.

### Calculate SMS Cost (Optional)

```
POST /ws/v1/sms/calculate-cost
```

**Docs:** https://docs.iranpayamak.com/calculate-send-sms-cost-31206056e0.md

Supports cost estimation for: Simple, Sample, PostalCode, Pattern.

---

## Environment Variables

Add to `backend/.env` and validate in `backend/src/config/env.validation.ts`.

### FarazSMS Provider (required for SMS)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `IRANPAYAMAK_API_KEY` | Yes | `sk_live_...` | API key from FarazSMS panel |
| `IRANPAYAMAK_BASE_URL` | No | `https://api.iranpayamak.com` | API base URL (default: production) |
| `IRANPAYAMAK_LINE_NUMBER` | Yes | `50002178584000` | Dedicated sender line (digits only) |
| `IRANPAYAMAK_OTP_PATTERN_CODE` | Yes | `SJ3FgPrE0C` | Approved OTP pattern UID |
| `IRANPAYAMAK_OTP_PATTERN_VAR` | Yes | `code` | Pattern variable name for OTP value |
| `IRANPAYAMAK_NUMBER_FORMAT` | Yes | `english` | Digit format in SMS body |

### FarazSMS Panel Login (optional — only for Bearer-protected endpoints)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `IRANPAYAMAK_USERNAME` | No | `myaccount` | Panel username |
| `IRANPAYAMAK_PASSWORD` | No | `********` | Panel password |

### OTP Behavior (DaruGard-owned)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OTP_LENGTH` | No | `6` | Number of digits in OTP code |
| `OTP_TTL_SECONDS` | No | `120` | OTP validity window (seconds) |
| `OTP_RESEND_COOLDOWN_SECONDS` | No | `60` | Minimum wait before resend |
| `OTP_MAX_ATTEMPTS` | No | `5` | Max verify attempts per OTP session |
| `OTP_MAX_REQUESTS_PER_HOUR` | No | `5` | Max OTP requests per phone per hour |

### JWT (required for auth)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | Yes | — | Secret for signing access tokens (min 16 chars) |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing refresh tokens (min 16 chars) |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token lifetime |

### Config Namespace (NestJS)

Implemented in `backend/src/config/configuration.ts`:

- `iranpayamak` — FarazSMS API credentials and pattern config
- `jwt` — JWT signing secrets and expiry
- `otp` — OTP behaviour (length, TTL, rate limits)

Access via `configService.get<string>('iranpayamak.apiKey')`, etc.

---

## Phone Number Format

| Rule | Value |
|------|-------|
| Country | Iran (`+98`) |
| Format for API | `09xxxxxxxxx` (11 digits, no `+98` prefix) |
| Valid prefixes | `091x`, `092x`, `093x`, `099x`, etc. |
| Storage in DB | Normalize to `09xxxxxxxxx` before send |

Reject invalid formats at the API layer before calling FarazSMS.

---

## OTP Login Flow

### Sequence

```
User                    DaruGard API              Redis                 FarazSMS
 │                           │                     │                      │
 │── POST /auth/otp/request ─►│                     │                      │
 │   { phone: "0912..." }     │── generate 6-digit ─►│                      │
 │                           │── SET otp:{phone} ──►│  TTL=120s            │
 │                           │── SET cooldown ──────►│  TTL=60s             │
 │                           │── POST /sms/pattern ─┼─────────────────────►│
 │                           │                     │                      │── SMS ──► User
 │◄── 200 { expiresIn: 120 }─│                     │                      │
 │                           │                     │                      │
 │── POST /auth/otp/verify ──►│                     │                      │
 │   { phone, code }         │── GET otp:{phone} ──►│                      │
 │                           │── compare code       │                      │
 │                           │── DEL otp:{phone} ──►│                      │
 │                           │── issue JWT          │                      │
 │◄── 200 { accessToken } ───│                     │                      │
```

### Implemented DaruGard Endpoints

```
POST /api/v1/auth/otp/request     Request OTP for a phone number
POST /api/v1/auth/otp/verify      Verify OTP and receive JWT tokens
POST /api/v1/auth/refresh         Rotate access + refresh tokens
POST /api/v1/auth/logout          Revoke tokens (Bearer required)
GET  /api/v1/auth/me              Current user profile (Bearer required)
```

On first successful OTP verify, a `User` is auto-created with `status = PENDING_PROFILE` and `role = OWNER`. Pharmacy profile completion is a follow-up step.

See `docs/08-api-design.md` for the broader auth blueprint.

### Redis Key Design

| Key | Value | TTL |
|-----|-------|-----|
| `otp:{phone}` | `{ codeHash, attempts, createdAt }` (SHA-256 hash, never plaintext) | `OTP_TTL_SECONDS` |
| `auth:refresh:{userId}:{jti}` | valid refresh token | refresh expiry |
| `auth:blocklist:{jti}` | revoked access token | access expiry |
| `otp:cooldown:{phone}` | `1` (sentinel) | `OTP_RESEND_COOLDOWN_SECONDS` |
| `otp:hourly:{phone}` | request count | 3600 seconds |

### Error Cases (DaruGard API)

| Condition | HTTP | Error |
|-----------|------|-------|
| Invalid phone format | `400` | `INVALID_PHONE` |
| Resend too soon | `429` | `OTP_COOLDOWN` |
| Hourly limit exceeded | `429` | `OTP_RATE_LIMIT` |
| OTP expired or not found | `400` | `OTP_EXPIRED` |
| Wrong code | `400` | `OTP_INVALID` |
| Max attempts exceeded | `429` | `OTP_MAX_ATTEMPTS` |
| FarazSMS send failed | `502` | `SMS_DELIVERY_FAILED` |

Never reveal whether a phone number is registered (return same `200` on request regardless).

---

## General Notification SMS Flow

Non-OTP messages (listing alerts, exchange updates) go through the existing BullMQ `notification.send` job defined in `docs/02-system-architecture.md`.

```
Event (e.g. OfferReceived)
  → notification.send job (BullMQ)
    → NotificationService.dispatch()
      → SmsChannel.send()          ← FarazSMS client
        → POST /ws/v1/sms/simple   (or pattern for templated alerts)
```

| Message type | FarazSMS endpoint | Notes |
|--------------|-------------------|-------|
| OTP login | `POST /ws/v1/sms/pattern` | Requires approved OTP pattern |
| Transactional alert | `POST /ws/v1/sms/simple` | Free-form text |
| Templated alert | `POST /ws/v1/sms/pattern` | Requires separate approved pattern |

---

## Module Placement in DaruGard

```
backend/src/
├── config/
│   ├── configuration.ts          ← iranpayamak, jwt, otp namespaces
│   └── env.validation.ts
├── infra/
│   └── sms/
│       ├── iranpayamak.client.ts   ← HTTP client (pattern send, simple send, balance)
│       └── sms.module.ts           ← @Global
├── common/phone/
│   ├── iranian-phone.ts
│   └── is-iranian-mobile.decorator.ts
└── modules/
    ├── identity/                   ← IMPLEMENTED
    │   ├── application/
    │   │   ├── otp.service.ts
    │   │   ├── token.service.ts
    │   │   └── auth.service.ts
    │   ├── infrastructure/
    │   │   └── prisma-user.repository.ts
    │   └── presentation/
    │       └── auth.controller.ts
    └── notifications/              ← Phase 2 (not yet implemented)
        └── infrastructure/
            └── sms.channel.ts
```

---

## Pre-Implementation Checklist (FarazSMS Panel)

Complete these steps **before** writing integration code:

- [ ] Create FarazSMS account at https://iranpayamak.com (or provider portal)
- [ ] Obtain **API Key** from panel settings
- [ ] Purchase / assign a **dedicated sender line** for transactional SMS
- [ ] Note the **line number** (`line_number`) — digits only
- [ ] Create an **OTP pattern** with `category: 1`
  - [ ] Include `%code%` variable (and optionally `%expiry%`)
  - [ ] Set `website` to `darugard.com`
- [ ] Wait for **pattern approval** from FarazSMS
- [ ] Record the approved **pattern code** (UID)
- [ ] Top up **wallet balance** (check via balance endpoint)
- [ ] Send a **test OTP** to your own `09...` number and confirm delivery
- [ ] Confirm the correct `number_format` value accepted by the API

---

## Implementation Status

- [x] Environment variables (Zod validation + NestJS config namespaces)
- [x] `IranPayamakClient` — pattern send, simple send, balance check
- [x] `OtpService` — generate, SHA-256 hash storage, verify, cooldown, rate limits
- [x] `TokenService` — JWT access/refresh, Redis refresh store + access blocklist
- [x] `IdentityModule` — auth endpoints, User/Pharmacy Prisma models
- [ ] `SmsChannel` in Notifications module (BullMQ `notification.send`)
- [ ] FarazSMS balance health probe

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| API key leakage | Store in `.env` only; never commit; rotate on exposure |
| OTP brute force | `OTP_MAX_ATTEMPTS` + exponential backoff |
| SMS flooding / cost abuse | Per-phone hourly limit + resend cooldown |
| User enumeration | Same response for registered/unregistered phones on OTP request |
| OTP in logs | Never log the OTP code or full SMS body in production logs |
| Replay attacks | Delete OTP from Redis immediately after successful verify |
| FarazSMS downtime | Return `502 SMS_DELIVERY_FAILED`; do not expose provider errors to client |

---

## Known Documentation Gaps

The FarazSMS OpenAPI docs are incomplete in places. Treat live API responses as the source of truth during integration:

| Gap | Workaround |
|-----|------------|
| Login response schema is `{}` | Inspect actual response to find Bearer token field name |
| `number_format` enum inconsistency (`en`/`fa` vs `english`/`persian`) | Test both; store working value in config |
| `attributes` typed as array in schema but used as object in examples | Send as `object` (key-value map); confirm with test call |
| Some endpoint descriptions are copy-pasted incorrectly | Rely on path + request body, not description text |

---

## References

| Topic | URL |
|-------|-----|
| Login | https://docs.iranpayamak.com/login-24945813e0.md |
| Verify 2FA (panel) | https://docs.iranpayamak.com/verify-2fa-24945819e0.md |
| Send Pattern SMS | https://docs.iranpayamak.com/send-pattern-based-sms-13925177e0.md |
| Send Simple SMS | https://docs.iranpayamak.com/send-simple-sms-13909967e0.md |
| Create Pattern | https://docs.iranpayamak.com/create-new-pattern-13925176e0.md |
| Get Pattern Details | https://docs.iranpayamak.com/get-pattern-details-16297027e0.md |
| Account Balance | https://docs.iranpayamak.com/account-balance-13717911e0.md |
| Lines | https://docs.iranpayamak.com/lines-27039797e0.md |
| Send Request Details | https://docs.iranpayamak.com/show-send-request-details-27724809e0.md |
| Calculate SMS Cost | https://docs.iranpayamak.com/calculate-send-sms-cost-31206056e0.md |
| PatternSendRequestDto schema | https://docs.iranpayamak.com/patternsendrequestdto-5191122d0.md |
| ApiStatus schema | https://docs.iranpayamak.com/apistatus-5068902d0.md |

## Related DaruGard Docs

| Doc | Relevance |
|-----|-----------|
| `docs/02-system-architecture.md` | BullMQ `notification.send` job, module layout |
| `docs/06-security-fraud-model.md` | Auth, rate limiting, input validation |
| `docs/08-api-design.md` | Phase 2 auth endpoint blueprint |
| `docs/09-roadmap.md` | Phase 2 Identity & Notification deliverables |
