# Connection Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let citizens opt into ward-based discovery and exchange consent-based connection requests.

**Architecture:** Shared code defines profile/connection contracts and deterministic transitions. The API owns private profiles, participant-only inboxes, pair transactions and rate limits. A People route uses central read/mutation hooks and a browser-local fictional demonstration; opt-in creator profiles link to it.

**Tech Stack:** Existing React/Vite/Tailwind/motion, Hono, Firebase Admin, shared TypeScript/zod and Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-connections-design.md`

## Global Constraints

- Keep Citizen labels; never publish raw UIDs, private source material, exact location or personal contacts.
- Public discovery is opt-in. Pending and accepted relationships are visible only to participants.
- No automatic acceptance of crossed requests, no external messaging and no cloud/dependency changes.
- Use one unordered-pair transaction and revision checks; count new requests in a server-side rate limit.
- Work on main as instructed; only root stages, commits and pushes.

## Review Focus

- Forged peer IDs, self-requests, nonparticipant actions and stale/replayed actions cannot alter another relationship.
- Opposite simultaneous sends remain one pending request, not an accepted connection.
- Decline cooldown, discoverability withdrawal and participant visibility have explicit behavior.
- Cached inboxes never cross user/token changes; local demo state never triggers the real API.
- Creator-to-People links exist only for matching ward opt-ins, without exposing nonconsenting authors.

### Task 1: Shared contracts and local adapter (root)

- [x] Write transition/privacy tests before implementation.
- [x] Add shared contracts, transition helpers and explicit fictional profile/demo state helpers.
- [x] Add central People/inbox/profile/action hooks with auth-scoped caching.

### Task 2: Connected API (API agent)

- [x] Test auth, discovery consent, idempotency, pair races, cooldowns, rate limits and privacy.
- [x] Add scoped public People read plus authenticated profile/inbox/send/action routes and private storage.
- [x] Add matching opt-in profile links to creator directory projections.

### Task 3: People UI (web agent)

- [x] Build opt-in profile and region discovery with Connect states.
- [x] Add incoming/sent/accepted views and consent actions with accessible loading/error/empty states.
- [x] Preserve responsive tokens, reduced motion and clear demo labels.

### Task 4: Integrate and publish (root plus reviewer)

- [x] Wire People navigation/route and creator profile links.
- [x] Review privacy, concurrency, authorization and source separation.
- [x] Run full typecheck/tests and connected/API/static-demo builds.
Delivery gate: update documentation/status, explicitly stage/commit/push main and verify the remote hash. Git records the final publication.
