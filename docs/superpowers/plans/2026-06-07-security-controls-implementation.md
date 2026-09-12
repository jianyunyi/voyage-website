# Security Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-shaped security controls from the security design spec into the VoyageX business code.

**Architecture:** Add focused server-side security modules for SMS challenges, UGC moderation, and avatar upload validation, then wire them into existing Express routes. Keep provider integrations local and replaceable through small interfaces so real SMS, moderation, storage, and alert providers can be connected later.

**Tech Stack:** TypeScript, Express, MongoDB/Mongoose, Node `node:test`, existing React/Vite frontend.

---

### Task 1: Policy Tests

**Files:**
- Create: `src/server/security/smsSecurity.test.ts`
- Create: `src/server/security/moderationService.test.ts`
- Create: `src/server/security/avatarSecurity.test.ts`

- [x] Write tests that assert SMS per-phone/per-email rate limits, global budget exhaustion, and challenge lockout.
- [x] Write tests that assert high-risk UGC is not publishable and safe UGC starts in review.
- [x] Write tests that assert avatar uploads reject SVG, mismatched MIME/extension, oversized files, and accept valid JPEG metadata.
- [x] Run: `node --import tsx --test src/server/security/*.test.ts`

### Task 2: Security Services

**Files:**
- Create: `src/server/security/securityTypes.ts`
- Create: `src/server/security/smsSecurity.ts`
- Create: `src/server/security/moderationService.ts`
- Create: `src/server/security/avatarSecurity.ts`

- [ ] Implement pure, testable services with local provider adapters.
- [ ] Run targeted tests until they pass.

### Task 3: Server Route Integration

**Files:**
- Modify: `src/server/index.ts`
- Modify: `src/server/guideRoutes.ts`
- Modify: `src/server/foodRoutes.ts`
- Create: `src/server/avatarRoutes.ts`
- Create: `src/server/moderationRoutes.ts`

- [ ] Add SMS request and verify routes.
- [ ] Route guide/food submissions through moderation.
- [ ] Add unified admin moderation queue and decision routes.
- [ ] Add avatar upload init/complete/status/avatar read routes.

### Task 4: Model and Frontend Types

**Files:**
- Modify: `src/lib/database/models/User.ts`
- Modify: `src/lib/database/models/Guide.ts`
- Modify: `src/lib/database/models/Food.ts`
- Modify: `src/lib/authService.ts`
- Modify: `src/pages/Auth.tsx`
- Modify: `src/pages/Profile.tsx`
- Modify: `src/lib/guideService.ts`
- Modify: `src/lib/foodService.ts`

- [ ] Add phone fields and moderation/upload status types.
- [ ] Add SMS login client helpers.
- [ ] Add profile avatar upload UI using the local secure upload flow.

### Task 5: Verification

- [ ] Run `node --import tsx --test src/server/security/*.test.ts`.
- [ ] Run `npm.cmd run lint`.
- [ ] Report any pre-existing or remaining verification failures with exact file/line evidence.
