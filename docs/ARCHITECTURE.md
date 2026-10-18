# LeadNet — Architecture

## Topology
```
Browser (React 19 SPA, PWA-ready)
  │  static assets ─────────────► Firebase Hosting (leadnet-blr.web.app)
  │  /api/**  (Hosting rewrite) ─► Cloud Run "leadnet-api" (asia-south1, Node 22 + Hono)
  │                                   ├─ firebase-admin ─► Firestore (Native, asia-south1)  — system of record
  │                                   ├─ firebase-admin ─► Cloud Storage for Firebase          — evidence photos (EXIF-stripped)
  │                                   ├─ @google/genai  ─► Vertex AI Gemini (service account, no keys)
  │                                   └─ in-memory ward polygons (point-in-polygon, bundled GeoJSON)
  │  realtime reads (onSnapshot) ──► Firestore (public collections, read-only rules)
  └─ auth ──────────────────────► Firebase Auth (anonymous + Google; custom claims for demo officer role)
```

## Repository
```
packages/shared   Domain contracts — enums, categories/SLAs, state machine, priority, SLA, verification gates,
                  ledger metrics + definitions, PII/Kannada/number guards, Firestore doc types, HTTP contract (zod).
apps/api          Hono service. src/routes (HTTP), src/services (Firestore logic), src/ai (Gemini clients, prompts,
                  verifiers, fallbacks), src/geo (ward lookup), eval/ (benchmark harness), scripts/seed.ts.
apps/web          Vite SPA. src/routes/<screen> (lazy, one owner each), src/components/{ui,layout,map,charts},
                  src/lib (firebase, auth, api client, live data hooks, formatting, theme), src/styles/tokens.css.
docs              PRD, ARCHITECTURE, DESIGN_SYSTEM, research notes.
submission        Deck generator, description, video script.
```

## The AI boundary (bounded LLM over a deterministic core)
| Task | Gemini selects / observes | Code computes / decides | Verifier (code) | Fallback |
|---|---|---|---|---|
| **Triage** (photo + voice + text) | category ∈ enum, hazards ⊆ enum, severity 1–5, EN+KN wording, transcript, isCivicIssue | department, SLA, priority score, ward | zod schema; enums; `kn` fields ≥ 60% Kannada script; PII scrubbed; length caps | manual category picker, citizen text as title |
| **Dedupe** | which code-supplied candidate (or none) is the same problem, with reasons | candidate set (same category, open, ≤150 m via geohash), distance, the merge itself (citizen-confirmed) | chosen id ∈ candidates; confidence ∈ [0,1] | "no match" |
| **Evidence** | sameLocation, defectResolved (+confidences), photo quality, notes | gate decision (hold/pass), state transition, override counting | schema; booleans + confidences | hold for review (never auto-pass) |
| **Ask** | selects and orders relevant fact IDs from the code-supplied closed list | every complete bilingual fact sentence, including its label, value, unit and sample size | schema; valid distinct fact IDs; no model-authored numeric clauses | fixed set of code-rendered fact sentences |

Each call: schema-constrained JSON (`responseSchema`) → verifier → one repair retry with error text → fallback.
Each call writes `aiRuns/{id}` (model, prompt version, redacted input summary, output, checks, attempts, latency, tokens).

## Data model (Firestore)
Public read: `issues` (+ `events`, `evidence` subcollections), `wards`, `ledger/city`, `leaders`, `projects`,
`aiRuns` (only `public == true`). Owner read: `reports`, `users`. Server-only: `drafts`, `supports`, `votes`.
All writes via the API (admin SDK). Timestamps are epoch ms. Types in `packages/shared/src/types.ts`.

The leader creator directory reads existing reports and post ownership only through authenticated `GET /api/v1/officer/creators?wardId=...`. Assigned-ward officers/admins receive anonymous ward-scoped references and public activity projections. Self-assigned demo roles are denied; neither raw ownership nor private reports become browser-readable. Grouping and deduplication live in `packages/shared/src/creators.ts`; this feature adds no collections or security rules.

Private follows live in `users/{uid}.followedIssueIds`. Following saves a record but does not add support or verification eligibility. Public triage trails retain categorical observations only; original AI titles, summaries and voice transcripts remain private. Public duplicate trails omit unapproved free-text reasons. Photo objects start unpublished and become readable only after their evidence document commits.

Key distinction (from the concept): a **report** is one citizen's submission; an **issue** is the real-world problem;
a **project** is planned development work. Many reports → one issue; a project relates to many issues.

## Request flows
**Report:** `POST /reports/draft` (multipart) → validate → sharp re-encode (strips EXIF) → upload `drafts/` → ward lookup →
Gemini triage → verify → priority computed → nearby candidates (geohash bounds, same category, open, ≤150 m) → Gemini
dedupe (if candidates) → verify → draft doc → response. `POST /reports` (citizen-edited fields) → transaction: create issue
or merge into existing (support +1, report count +1, priority recomputed) → event → evidence moved to `evidence/` → ledger
& ward stats recomputed → `aiRuns` marked public.

**Resolve:** officer `POST /issues/:id/resolution` (photo) → re-encode → Gemini evidence check (before photos vs after) →
`evidenceGate` → pass: transition to `resolved_pending_verification` + event; hold: evidence flag + event, issue stays
(override with reason allowed and counted).

**Verify:** reporter/supporter `POST /issues/:id/verify` → one vote per uid per claim → `verificationOutcome` →
`verified` or `reopened` (system transition) → ledger recompute.

## Deployment
- Project `leadnet-blr` (Blaze). Region **asia-south1** (Mumbai) for Cloud Run, Firestore, Storage. Gemini via Vertex AI
  location from `VERTEX_LOCATION` (default `global`; model ids configurable via env, see `apps/api/src/env.ts`).
- Cloud Run: `gcloud run deploy leadnet-api --source . --region asia-south1` (root Dockerfile), min-instances 1 during
  judging, dedicated runtime service account with roles: Vertex AI User, Cloud Datastore User, Storage Object Admin,
  Firebase Auth Admin (custom claims), Logging writer.
- Hosting: `firebase deploy --only hosting,firestore,storage`. `/api/**` rewrites to Cloud Run (60 s Hosting timeout ⇒ all AI
  calls must finish well under it; thinking budget kept low).
- Secrets: none in code. Firebase web config is public by design; access is enforced by rules + API.

## Scaling path (deck)
Firestore → BigQuery export for analytics; PostGIS when spatial queries outgrow geohash; Pub/Sub for async evidence
checks; per-corporation deployments; Sahaaya/1533 integration adapters.

## Community extension (18 October 2026)

The owner requested a social capture/discussion/outreach experience. `packages/shared/src/community.ts` defines its contracts. Public `posts` and nested `comments` are read-only from browsers. Private `postOwners`, `communityRequests`, `communityLimits`, `postReactions` and `communityOutbox` separate identity, original capture location, limits and delivery state from public content. Social support never grants issue-verification eligibility or changes the outcome ledger.

The compose task uses the same Vertex adapter and verifier/repair/fallback runner for sanitized photos, private audio transcription and wording. Numeric detail and explicit negation are checked; cross-language semantics require human review. Raw audio is not published. Community photos are EXIF/GPS-stripped; public coordinates are rounded while the private original determines representative matching. Video is optionally transcoded with the approved FFmpeg Docker runtime.

Representative lookup reuses real ward assignment and a dated, source-backed assembly/MP contact map. It is not LLM output or a precise constituency polygon overlay. Resend is an optional server-side mail adapter with matched recipients, ownership checks, limits and provider idempotency. Final review is required; no provider credentials means sending is unavailable. X sharing is a reviewed intent handoff. See `COMMUNITY_SETUP.md` for runtime settings, exact sources and limitations.
