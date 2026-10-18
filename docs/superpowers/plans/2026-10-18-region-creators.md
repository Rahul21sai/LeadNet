# Region Creators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let a leader select a ward and inspect an anonymous directory of the citizens who posted its issues.

**Architecture:** Shared code owns grouping, deduplication and example associations. An authenticated API maps private report/post ownership to ward-scoped opaque references. The existing officer route renders a creators tab with the same ward selection, using explicit fictional associations in the offline demo.

**Tech Stack:** React 19, Vite, existing Tailwind/motion/lucide, Hono, Firestore admin adapter, TypeScript and Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-region-creators-design.md`

## Global Constraints

- Citizens display as Citizen; no name, UID, contact, precise coordinate, transcript or private source text leaves the API.
- All connected directory reads authenticate and enforce assigned-ward scope before reading authorship records.
- Additive shared contract and GET route are approved by the orchestrator within the owner's feature request; no existing contract, collection or rule changes.
- No dependencies, cloud deployment, AI calls or changes to civic metrics/state transitions.
- Work directly on main per the owner's standing instruction; agents do not stage, commit or push.

## Review Focus

- A citizen, unauthenticated caller or officer assigned elsewhere receives no directory data.
- Duplicate reports and a canonical feed projection do not create additional authors/activities.
- Post-only authors appear; supporters/commenters do not.
- Ward changes cannot leave stale creators from a different selected region on screen.
- Demonstration associations cannot turn genuine public records into fictional author identities.

### Task 1: Shared directory contract and grouping (root)

- [x] Add focused failing tests for deduplication, ordering, ward isolation and demo boundaries.
- [x] Add shared activity/creator/response types plus pure grouping and demo helpers.
- [x] Run shared tests and publish the exact contract to implementation agents.

### Task 2: Scoped directory API (API agent)

- [x] Add denial, privacy and mixed-source aggregation tests; observe failure before implementation.
- [x] Add GET /api/v1/officer/creators?wardId= using existing authentication, ward lookup and server ownership records.
- [x] Test assigned-ward/admin access, record deduplication, post-only authors and privacy.

### Task 3: Leader workspace UI (web agent)

- [x] Add a region-driven Issue creators tab alongside the queue with searchable anonymous entries and public record links.
- [x] Load only authorized connected data; offer labelled fictional examples in offline mode.
- [x] Reuse tokens, accessible controls and reduced-motion support; typecheck the web workspace.

### Task 4: Integration and delivery (root plus reviewer)

- [x] Review authorization, privacy, creator attribution, source mixing and stale region/auth state.
- [x] Run full typecheck/tests, web/API builds and the forced-demo build.
- [x] Update setup/status/verification documents with evidence and rendered/cloud limitations.
Delivery gate: explicitly stage, commit and push main, then verify the remote hash. Git records the final delivery result.
