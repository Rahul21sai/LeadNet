# LeadNet — Product Requirements (hackathon edition)

> **Bengaluru, on the record.** Officials can *claim* a fix. Citizens *verify* it — with evidence.
> LeadNet publishes the gap.

Submission: Google Cloud × Hack2Skill **AI Builder Cup 2026**, theme **Sustainability & Social Impact**.
Deadline 18 Oct 2026 23:59 IST. Feature freeze 18 Oct 14:00 IST.

## Problem
Civic complaints in Bengaluru are fragmented across helplines, apps, and WhatsApp groups. Even when a complaint is filed:
1. **Duplicates bury signal.** Many citizens report one pothole separately, and the counts mean nothing.
2. **Closure is self-reported.** The department that owns the fix also marks it fixed, with no independent check.
3. **Outcomes are invisible.** There is no public, defined measure of what was *actually* fixed, ward by ward.
4. **Language excludes people.** Text-only English/Kannada forms exclude people who would rather speak.

## Goal
Prove one complete, evidence-backed loop — **report → route → act → verify → measure** — on real Bengaluru geography,
with Gemini doing the parts only a model can do, and deterministic code owning every decision and every number.

## Users (prototype)
- **Citizen** — reports by photo + voice (Kannada/English/Hindi), joins existing issues, confirms or disputes fixes.
- **Ward officer** — works a priority queue, acknowledges, submits resolution evidence.
- **Public / judges** — browse the live map, issue records, ward ledger, and the methodology.

## Core features (must ship)
1. **Report copilot** — one photo and/or a ≤30 s voice note → Gemini proposes category (closed list), hazards, severity,
   bilingual EN+ಕನ್ನಡ title & summary, transcript. Citizen confirms/edits. Never blocks: on AI failure, a manual form.
2. **Deterministic routing** — ward by point-in-polygon on real boundaries; department by category lookup; priority by the
   published formula; SLA deadlines by category.
3. **Duplicate merge** — code finds open same-category issues within 150 m; Gemini adjudicates "same real-world problem?"
   among those candidates only; citizen chooses to join (adds support) or file separately. Original reports are preserved.
4. **Live civic map** — real-time markers coloured by status, clustering, ward boundaries, filters, issue sheet.
5. **Issue record** — status timeline (append-only), evidence gallery, before/after compare, "How LeadNet decided" (AI trail
   with verifier checks), support & follow, verification controls, Wallet-style **Issue Pass** for the reporter.
6. **Officer console** — demo role switch; ward queue sorted by priority with breakdown and SLA countdown; acknowledge →
   start → upload resolution photo → **Gemini evidence check** (same place? defect gone?) → code gate holds suspicious
   claims; officer may override with a written reason (counted publicly).
7. **Citizen verification** — only reporters/supporters vote; quorum = min(2, eligible); confirm → Verified, dispute → Reopened.
8. **Ward ledger** — city and per-ward metrics computed from records: unique issues vs reports, median time to acknowledge,
   fixes claimed vs verified (the gap), reopen rate, overdue, overrides — each with definition, formula and sample size.
9. **Methodology page** — the state machine, priority weights, SLAs, metric definitions, AI boundaries, data sources.
10. **Seeded demo city** — ~200 realistic demo issues across real wards with full histories, clearly labelled demo data, plus
    sample photos and a sample Kannada voice clip so judges can test the AI without a real pothole.

## Should ship if time allows
- Fictional leader profiles + development project tracker (milestones planned vs actual, linked issues), labelled demo.
- "Ask LeadNet" — question → code-computed facts → Gemini selects relevant fact IDs → code renders complete labelled bilingual facts.
- Face / number-plate blur before publishing photos.
- Gemini-written ward brief (narrative verified to cite only computed numbers).
- Dark mode polish.

## Out of scope (roadmap slide only)
Integration with GBA Sahaaya / 1533; SMS/push notifications; field-worker app; BigQuery analytics; PostGIS backend;
Aadhaar/face-scan identity (never in a prototype); real leader verification; multi-city; monetisation features.

## Anti-goals (a failure even if it "works")
- A model decides a status, a priority, a ward, or a published number.
- Real politicians shown with invented scores; star ratings or popularity rankings of leaders.
- Generic AI-template look (gradients, icon-tile grids, centred two-button hero).
- Citizen personal data (names, phones, faces, GPS EXIF) published.
- An issue marked fixed without citizen confirmation.

## Success metrics (for the demo and the deck)
- **North Star (product):** unique issues reaching citizen-verified resolution.
- **Prototype benchmarks (measured, slide 12):** triage category accuracy on the labelled sample set; duplicate
  precision/recall on constructed pairs; evidence-check detection of wrong-location photos; schema-valid rate before repair;
  p50/p95 latency per AI task; end-to-end report time.

## Locked decisions (2026-10-17)

The owner approved citizen connection requests through People on 18 October, using the supplied social-network image as a reference. Discovery is opt-in and anonymous; recipient acceptance is required. The static preview remains browser-local with explicit fictional people. Chat, stories, personal-name profiles and external notifications are outside this increment. See `CONNECTIONS.md`.

The owner further requested a leader view of citizen issue creators by region on 18 October. The officer workspace now includes a ward-scoped anonymous creator directory over canonical report authors and community post owners. The static preview uses labelled fictional associations. Trusted leader access, private identities and existing civic metrics remain separate; see `REGION_CREATORS.md`.

The owner's 18 October community request extends the civic prototype with a social home feed, direct camera/location capture, video/photo posts, nearby/saved discovery, reactions, comments, reviewed voice/text/photo composition and source-backed MLA/MP outreach. This supersedes the prior anti-social-experience direction. Existing fictional leader personas remain demo-only; the separate real contact directory carries source URLs and check dates, never invented politician scores. Social engagement does not count as an official fix or voting eligibility. See `COMMUNITY_PLAN.md` and `COMMUNITY_SETUP.md` for implemented boundaries and integration requirements.
| Decision | Choice | Rejected |
|---|---|---|
| Accountability scoring | Outcome ledger (rates with n) | Star ratings / medals leaderboard |
| Leaders | Fictional, labelled personas | Real MLAs/corporators |
| Frontend | React 19 SPA on Firebase Hosting | Next.js (needs SSR hosting, slower to ship) |
| Backend | Node 22 + Hono on Cloud Run asia-south1 | FastAPI (second language, duplicated domain logic) |
| Database | Firestore (required by submission) | Cloud SQL + PostGIS (cost/time; on roadmap) |
| AI | Gemini on Vertex AI via service account | API keys in code |
| Team slide | Placeholders for the owner to fill | — |
