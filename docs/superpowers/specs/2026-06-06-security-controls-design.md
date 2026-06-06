# VoyageX Security Controls Design

Date: 2026-06-06
Status: Draft for review
Scope: Login SMS verification, public UGC moderation, and profile image upload security.

## Goals

VoyageX must prevent account abuse, unsafe public content exposure, and unsafe user image handling before the product accepts real user traffic. This design defines production-grade controls and API contracts while preserving the current React + Express + MongoDB architecture.

## Non-Goals

- This document does not pick a final vendor. SMS, content moderation, object storage, CDN, and alerting providers stay behind service adapters.
- This document does not implement JWT/session hardening, although protected upload and moderation APIs assume authenticated server-side user identity.
- This document does not introduce admin UI screens. It defines the APIs those screens will call.

## Current Context

- Authentication currently supports email and password in `src/server/index.ts`.
- UGC submissions for guides and foods already default to `pending`; public list APIs only return `published`.
- Profile currently displays an avatar URL and has no upload API or storage isolation.
- Server-side authentication is incomplete; `authorId` and localStorage identity cannot be trusted in production.

## Shared Security Principles

- Server state is authoritative. Client-submitted user IDs, moderation status, file paths, and author fields are advisory only.
- Public surfaces only read from `published` states. Approval and publication are separate actions.
- External providers must be wrapped by internal interfaces so failures, budgets, retries, and audit logging are consistent.
- Every security decision writes an audit event with actor, resource, decision, reason, request ID, and timestamp.
- Sensitive identifiers such as phone, email, IP, and device fingerprints are stored in normalized and hashed forms for rate-limit keys where possible.

## 1. SMS Verification Login

### Requirements

- Login verification uses SMS codes.
- The same phone number is rate-limited.
- The same email address is rate-limited.
- A global SMS budget cap prevents runaway spending.
- Abnormal traffic triggers alerts.
- Verification must not reveal whether an email or phone is registered.

### Data Model

`LoginVerificationChallenge`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Challenge ID returned to client. |
| `emailHash` | string | HMAC-SHA256 of normalized email. |
| `phoneHash` | string | HMAC-SHA256 of E.164 phone. |
| `codeHash` | string | Argon2id or bcrypt hash of six-digit code. |
| `status` | enum | `pending`, `verified`, `expired`, `locked`, `consumed`. |
| `attemptCount` | number | Failed verification attempts. |
| `expiresAt` | Date | Default 5 minutes after issue. |
| `createdAt` | Date | Indexed. |
| `verifiedAt` | Date? | Present after success. |
| `requestIpHash` | string | HMAC of IP. |
| `deviceHash` | string? | HMAC of stable device fingerprint if available. |
| `riskScore` | number | From local risk rules and provider signals. |

`User` additions

| Field | Type | Notes |
| --- | --- | --- |
| `phoneEncrypted` | string | E.164 phone encrypted at rest for account recovery and SMS delivery. |
| `phoneHash` | string | HMAC-SHA256 of E.164 phone for lookup and rate-limit joins. Unique when present. |
| `phoneVerifiedAt` | Date? | Required before SMS login is allowed. |
| `lastLoginAt` | Date? | Updated after successful challenge consumption. |

`SecurityBudgetCounter`

| Field | Type | Notes |
| --- | --- | --- |
| `bucket` | string | Example: `sms:global:2026-06-06T13:00Z`. |
| `count` | number | Messages sent. |
| `costCents` | number | Optional vendor cost estimate. |
| `expiresAt` | Date | TTL aligned to the budget window. |

`SecurityAuditEvent`

| Field | Type | Notes |
| --- | --- | --- |
| `type` | string | Example: `login_sms_requested`, `login_sms_blocked`, `login_sms_verified`. |
| `actorId` | ObjectId? | Known after user resolution. |
| `subjectHash` | string | Email or phone hash. |
| `decision` | enum | `allow`, `deny`, `review`, `alert`. |
| `reason` | string | Machine-readable reason. |
| `metadata` | object | Counts, provider response code, risk score. |
| `createdAt` | Date | Indexed. |

### Rate Limits

Recommended initial limits:

| Scope | Limit | Window | Failure Mode |
| --- | ---: | --- | --- |
| Phone | 3 sends | 10 minutes | `429 SMS_PHONE_RATE_LIMITED` |
| Phone | 8 sends | 24 hours | `429 SMS_PHONE_DAILY_LIMITED` |
| Email | 3 sends | 10 minutes | `429 SMS_EMAIL_RATE_LIMITED` |
| Email | 8 sends | 24 hours | `429 SMS_EMAIL_DAILY_LIMITED` |
| IP | 20 sends | 10 minutes | `429 SMS_IP_RATE_LIMITED` |
| Device | 10 sends | 1 hour | `429 SMS_DEVICE_RATE_LIMITED` |
| Global | env-configured | 1 hour and 24 hours | `503 SMS_BUDGET_EXHAUSTED` |
| Verify attempts | 5 attempts | Per challenge | `423 SMS_CHALLENGE_LOCKED` |

Counters must be atomic. In production, use Redis with Lua or MongoDB transactions and unique bucket keys. Prefer fail-closed for provider budget exhaustion and fail-open only for audit logging write failures.

### Abnormal Alerts

Emit high-priority alerts when any condition is met:

- Global hourly SMS usage exceeds 80% of configured budget.
- Global hourly SMS usage reaches 100% of configured budget.
- A single IP block accounts for more than 20% of SMS sends in 10 minutes.
- SMS provider failure rate is above 10% for 5 minutes.
- Verification failure rate is above 70% over at least 100 attempts in 10 minutes.
- A phone or email hits a daily cap more than twice in 24 hours.

Alert payload must include request IDs, affected limit keys, counts, windows, and provider status. Do not include raw phone numbers or emails.

### API Contracts

`POST /api/auth/login/sms/request`

Request:

```json
{
  "email": "user@example.com",
  "phone": "+8613800138000"
}
```

Response `202`:

```json
{
  "success": true,
  "challengeId": "656f...",
  "expiresInSeconds": 300,
  "retryAfterSeconds": 60,
  "message": "If the account can receive verification, a code has been sent."
}
```

Notes:

- Always return a neutral message for account lookup outcomes.
- If rate-limited, return `429` with `retryAfterSeconds`.
- If the global budget is exhausted, return `503` with `SMS_BUDGET_EXHAUSTED`.

`POST /api/auth/login/sms/verify`

Request:

```json
{
  "challengeId": "656f...",
  "code": "123456"
}
```

Response `200`:

```json
{
  "success": true,
  "user": {
    "id": "u123",
    "email": "user@example.com",
    "name": "VoyageX User",
    "avatar": "/api/users/u123/avatar"
  },
  "session": {
    "expiresAt": "2026-06-13T13:00:00.000Z"
  }
}
```

Errors:

| HTTP | Code | Meaning |
| ---: | --- | --- |
| 400 | `SMS_INVALID_INPUT` | Invalid email, phone, challenge, or code format. |
| 401 | `SMS_INVALID_CODE` | Code mismatch. |
| 410 | `SMS_CHALLENGE_EXPIRED` | Challenge expired. |
| 423 | `SMS_CHALLENGE_LOCKED` | Too many failed attempts. |
| 429 | `SMS_RATE_LIMITED` | A rate limit was hit. |
| 503 | `SMS_BUDGET_EXHAUSTED` | Global budget is closed. |

### Provider Adapter

```ts
interface SmsProvider {
  sendLoginCode(input: {
    phoneE164: string;
    code: string;
    requestId: string;
  }): Promise<{ providerMessageId: string; costCents?: number }>;
}
```

The adapter must enforce request timeout, retry only idempotent provider failures, and record provider response metadata in audit logs.

### Alert Adapter

```ts
interface SecurityAlertSink {
  emit(input: {
    severity: 'info' | 'warning' | 'critical';
    type: string;
    requestId: string;
    reason: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}
```

Alert delivery failures must not block login, moderation, or upload decisions, but they must be logged locally and counted by metrics.

## 2. Public UGC Moderation

### Requirements

- All UGC that can be publicly displayed is hidden first.
- UGC becomes visible only after review approval.
- High-risk content must not leak through list, detail, search, recommendation, sitemap, feed, or cached API responses.

### Moderation State Machine

Allowed states:

- `draft`: User-created but not submitted.
- `pending_review`: Submitted and hidden from public surfaces.
- `auto_rejected`: Blocked by automated high-risk checks.
- `needs_manual_review`: Suspicious or unclear content.
- `approved`: Eligible for public display.
- `published`: Publicly visible.
- `rejected`: Manually rejected.
- `removed`: Previously published but later taken down.

Only `published` content is public. `approved` is not public until a publish action sets `published`.

### Content Risk Checks

Automated checks run synchronously before persistence where possible:

- Text policy scan for violence, sexual content, hate, scams, illegal services, malware links, private data, and spam.
- URL allowlist or reputation checks for submitted image links and outbound references.
- Duplicate/spam detection using normalized text hashes.
- Author trust checks using account age, recent rejection rate, and submission velocity.

If the moderation provider is unavailable:

- User submissions are stored as `pending_review`.
- Public display remains blocked.
- Alert if provider outage lasts more than 5 minutes or backlog exceeds threshold.

### API Contracts

`POST /api/guides/submit`

Response `201`:

```json
{
  "success": true,
  "guide": {
    "id": "656f...",
    "status": "pending_review"
  },
  "message": "Submitted for review."
}
```

`POST /api/foods/submit`

Response follows the same pattern.

`GET /api/guides`

Rules:

- Returns only `published`.
- Does not accept client-provided status filters.
- Uses cache keys that include `publicOnly=true`.

`GET /api/moderation/queue?type=guide&status=pending_review`

Admin-only response:

```json
{
  "success": true,
  "items": [
    {
      "id": "656f...",
      "type": "guide",
      "status": "pending_review",
      "riskScore": 42,
      "riskLabels": ["spam_suspected"],
      "submittedAt": "2026-06-06T13:00:00.000Z"
    }
  ]
}
```

`POST /api/moderation/items/:id/decision`

Request:

```json
{
  "type": "guide",
  "decision": "approve",
  "reason": "manual_review_passed"
}
```

Allowed decisions:

- `approve`: `pending_review` or `needs_manual_review` to `approved`.
- `publish`: `approved` to `published`.
- `reject`: review states to `rejected`.
- `remove`: public content to `removed`.

Every decision writes an audit event.

### Provider Adapter

```ts
interface ContentModerationProvider {
  reviewText(input: {
    text: string;
    locale?: string;
    requestId: string;
  }): Promise<ModerationResult>;

  reviewImageUrl(input: {
    url: string;
    requestId: string;
  }): Promise<ModerationResult>;
}

interface ModerationResult {
  decision: 'allow' | 'block' | 'review';
  score: number;
  labels: string[];
  providerTraceId?: string;
}
```

## 3. Profile Image Upload Security

### Requirements

- Profile image upload validates file format.
- Image content is reviewed before use.
- Access control prevents users from reading or mutating other users' images.
- Hotlink protection prevents untrusted origins from embedding approved public image URLs.
- Storage is isolated from public UGC and application code.

### Storage Layout

Use separate buckets or prefixes:

- `voyagex-private-uploads/profile/original/{userId}/{assetId}`
- `voyagex-private-uploads/profile/quarantine/{assetId}`
- `voyagex-public-assets/profile/approved/{userId}/{assetId}.webp`

Original uploads remain private. Public profile avatars are derived assets only, transformed to a safe format such as WebP or PNG after successful review.

### Upload Flow

1. Authenticated user requests an upload URL.
2. Server creates an `ImageAsset` in `upload_pending`.
3. Client uploads directly to private object storage with a short-lived signed URL.
4. Client finalizes upload.
5. Server validates object size, MIME type, extension, magic bytes, dimensions, and image decode success.
6. Server sends the image to content moderation.
7. If approved, server strips metadata, transforms to WebP or PNG, writes derived asset to public approved storage, and marks `approved`.
8. User profile avatar is updated to a server-controlled asset ID.
9. Public reads go through `/api/users/:id/avatar` or signed CDN URLs with anti-hotlink rules.

### File Validation

Initial policy:

| Property | Requirement |
| --- | --- |
| Extensions | `.jpg`, `.jpeg`, `.png`, `.webp` |
| MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Magic bytes | Must match MIME type. |
| Max size | 5 MB |
| Dimensions | Minimum 128x128, maximum 4096x4096 |
| Animated images | Rejected for profile avatars |
| EXIF metadata | Stripped before publication |
| SVG | Rejected |

### Data Model

`ImageAsset`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Asset ID. |
| `ownerId` | ObjectId | Authenticated user. |
| `purpose` | enum | `profile_avatar`, future-safe. |
| `status` | enum | `upload_pending`, `uploaded`, `validating`, `quarantined`, `approved`, `rejected`, `deleted`. |
| `privateObjectKey` | string | Original object key. |
| `publicObjectKey` | string? | Derived approved object key. |
| `mimeType` | string | Server-verified. |
| `sizeBytes` | number | Server-verified. |
| `width` | number? | Server-verified. |
| `height` | number? | Server-verified. |
| `contentHash` | string? | SHA-256 of uploaded bytes. |
| `moderationLabels` | string[] | Provider labels. |
| `rejectionReason` | string? | Machine-readable. |
| `createdAt` | Date | Indexed. |
| `updatedAt` | Date | Indexed. |

### API Contracts

`POST /api/profile/avatar/uploads`

Authenticated request:

```json
{
  "fileName": "avatar.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 482913
}
```

Response `201`:

```json
{
  "success": true,
  "assetId": "656f...",
  "uploadUrl": "https://storage.example.com/signed-put-url",
  "expiresInSeconds": 300,
  "headers": {
    "Content-Type": "image/jpeg"
  }
}
```

`POST /api/profile/avatar/uploads/:assetId/complete`

Response `202`:

```json
{
  "success": true,
  "assetId": "656f...",
  "status": "validating"
}
```

`GET /api/profile/avatar/uploads/:assetId`

Owner-only response:

```json
{
  "success": true,
  "asset": {
    "id": "656f...",
    "status": "approved",
    "avatarUrl": "/api/users/me/avatar?asset=656f..."
  }
}
```

`GET /api/users/:userId/avatar`

Rules:

- Serves only approved derived assets.
- Does not expose object storage private keys.
- Returns default generated avatar if no approved asset exists.
- Applies `Cache-Control` and `Content-Security-Policy` headers.
- CDN hotlink rules allow only VoyageX production origins, staging origins, and mobile app referers if applicable.

Errors:

| HTTP | Code | Meaning |
| ---: | --- | --- |
| 400 | `UPLOAD_INVALID_FORMAT` | Extension, MIME, magic bytes, or dimensions invalid. |
| 401 | `AUTH_REQUIRED` | No valid session. |
| 403 | `UPLOAD_FORBIDDEN` | Asset does not belong to user. |
| 413 | `UPLOAD_TOO_LARGE` | Size exceeds limit. |
| 415 | `UPLOAD_UNSUPPORTED_MEDIA_TYPE` | Unsupported image type. |
| 422 | `UPLOAD_CONTENT_REJECTED` | Moderation rejected content. |
| 429 | `UPLOAD_RATE_LIMITED` | User/IP upload limit exceeded. |

### Upload Rate Limits

| Scope | Limit | Window |
| --- | ---: | --- |
| User | 10 avatar upload starts | 1 hour |
| User | 30 avatar upload starts | 24 hours |
| IP | 60 avatar upload starts | 1 hour |

## Operational Controls

### Observability

Metrics:

- `security.sms.request.count`
- `security.sms.sent.count`
- `security.sms.blocked.count`
- `security.sms.verify.failure.count`
- `security.moderation.queue.depth`
- `security.moderation.provider.failure.rate`
- `security.upload.rejected.count`
- `security.upload.validation.failure.count`

Logs:

- Use structured JSON logs.
- Include `requestId`, `actorId`, `resourceId`, `decision`, and `reason`.
- Do not log raw SMS codes, raw phone numbers, raw emails, signed URLs, or provider secrets.

### Admin and Authorization

- Replace static `ADMIN_KEY` with role-based authorization before production.
- Moderation APIs require `moderator` or `admin` role.
- Budget override APIs, if added, require `security_admin` role and mandatory audit reason.

### Caching and Public Leakage Prevention

- Public list/detail APIs query only `published`.
- Admin APIs must send `Cache-Control: no-store`.
- CDN cache invalidation is required when content transitions from `published` to `removed`.
- Search indexes and recommendation jobs must read only `published` records.

## Implementation Phases

### Phase 1: Foundations

- Add service adapters for SMS, moderation, storage, and alerting with local development implementations.
- Add audit event and rate-limit data models.
- Add server-side session middleware.

### Phase 2: SMS Login

- Add SMS request and verify APIs.
- Add phone/email/IP/device rate limits.
- Add budget counters and alert hooks.
- Update login UI to request email, phone, and SMS code.

### Phase 3: UGC Moderation

- Rename current `pending` semantics to `pending_review`.
- Add moderation metadata fields and admin moderation APIs.
- Ensure all public queries, search, and recommendation paths filter only `published`.

### Phase 4: Secure Avatar Upload

- Add private upload, finalize, validation, moderation, and derived image publication flow.
- Add profile UI for upload status and rejection messages.
- Add CDN/object storage anti-hotlink configuration.

## Acceptance Criteria

- SMS request API enforces phone, email, IP, device, and global budget limits with deterministic tests.
- SMS verify API locks challenges after five failed attempts and consumes challenges after success.
- Public UGC APIs never return `pending_review`, `needs_manual_review`, `approved`, `rejected`, or `removed`.
- Admin moderation decisions are auditable and cannot be made by normal users.
- Profile image uploads reject SVG, mismatched MIME/magic bytes, oversized files, animated images, and unsafe moderation results.
- Users cannot access, finalize, or publish image assets owned by another user.
- Public avatar URLs expose only approved derived assets and never private storage keys.
- Alerts fire when SMS budget, provider failure, moderation backlog, or abuse thresholds are exceeded.

## Open Decisions

- Choose production SMS provider and define per-message budget values.
- Choose content moderation provider for Chinese and English text/image review.
- Choose object storage and CDN provider.
- Define the exact role model for `admin`, `moderator`, and `security_admin`.
- Decide whether login remains email-plus-phone SMS or migrates to phone-first identity.
