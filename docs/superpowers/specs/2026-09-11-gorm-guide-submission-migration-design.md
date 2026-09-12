# Gorm Guide and Submission Migration Design

## Goal

Move guide submissions, moderation decisions, published guide reads, and the
personal submission list to MySQL through Gorm while preserving the current
Gin JSON API contract.

## Scope

- A user guide submission is stored only in `submissions` until approved.
- An approved guide is inserted into `guides` in the same MySQL transaction
  that marks its submission as `published`.
- A rejected submission remains in `submissions` with status `rejected`, its
  moderation reason, reviewer, and review time so the author can see it in
  the personal center.
- Every moderation decision creates a `moderation_logs` row.
- The existing MongoDB food, user, authentication, avatar, and favorite
  workflows remain unchanged in this migration.

## Architecture

`GormGuideRepository` owns published-guide queries and inserts. Its records
are mapped to the existing `model.PublicGuide` response shape at the service
boundary.

`GormSubmissionRepository` owns submission persistence, the admin review
queue, and a user-scoped newest-first submission list. JSON payloads and risk
labels are encoded with `encoding/json`, rather than hand-built strings.

`GormModerationService` coordinates a transaction. For an approve decision it
locks the submission row, validates the status transition, decodes the guide
payload, creates a published guide, updates the submission with the new guide
ID and `published` status, and records the audit log. For a reject decision it
updates the submission to `rejected` and records the audit log without adding
a guide row. A failed step rolls back the full transaction.

Handlers retain their routes and JSON field names. In MySQL mode they use the
Gorm service implementations for guide submissions, the moderation queue and
decision endpoint, public guide listings, and `/api/users/:userId/submissions`.
MongoDB remains responsible for authentication during this focused phase, so
the authenticated Mongo ObjectID is represented as a stable string in MySQL
submission ownership fields until the users table is migrated.

## Data Rules

- `submissions.author_id` is stored as a string, because existing Mongo user
  IDs are 24-character hexadecimal ObjectIDs while Gorm user IDs are numeric.
- `guides.author_id` is stored as a nullable string for the same transition.
- Rejecting a submission never deletes it. It never creates a `guides` row.
- A guide becomes visible in the public list only after the transaction
  commits with `guides.status = published`.
- Repeating an already-resolved moderation decision returns a domain conflict;
  it cannot create a second guide.

## Error Handling

- Unknown submission IDs return not found.
- A type mismatch, invalid state transition, or malformed stored payload
  returns a domain error and commits no data.
- Database errors are wrapped for server logs and returned as the existing
  generic handler error responses.

## Tests

- Unit tests cover Gorm model mapping, JSON payload encoding and decoding, and
  status-transition validation without opening a database connection.
- Moderation-service tests use transaction-aware repository fakes to verify an
  approval creates exactly one guide and marks its submission published, a
  rejection preserves the submission and reason, and a guide insert failure
  reports failure without applying the queued updates.
- MySQL integration tests run only when `MYSQL_TEST_DSN` is explicitly set;
  they verify actual Gorm transactions roll back the guide, submission, and
  audit-log writes together.
- Handler tests verify personal-center output contains rejected submissions
  and their moderation reason without exposing raw payload internals.
