# Namma Civic submission deck

Local review snapshot. Cloud deployment and live model evaluation are deferred by owner. Team details, public links, genuine screenshots and measured live results remain incomplete. Final 14 slides preserve the required content hierarchy and branding. Original source slide 2 (download instructions) and source slide 15 (blank) are omitted; neither contains required pitch content or a retention instruction. The owner/orchestrator approved this cleanup.

## Slide 1 (source 1)

### Slide copy

Team Details

Team name: [Owner to fill]
Team leader name: [Owner to fill]
Problem Statement: [Owner to fill]

### Presenter notes and sources

Team details remain placeholders at the owner's explicit request. Product: Namma Civic. Proposed challenge: Sustainability & Social Impact. Confirm registered team roster before submission.

Source: explicit owner approval in the recovered session, 17 October 2026.

## Slide 2 (source 3)

### Slide copy

Brief about the idea

Namma Civic

Citizens verify the fix

A closed complaint alone does not show whether a street was repaired. Namma Civic keeps the report, evidence, official claim and citizen verdict in one public record.

Photo + voice reporting     Real ward assignment     Public outcome ledger

Bengaluru prototype | Independent demonstration; no government endorsement

### Presenter notes and sources

Namma Civic helps citizens report civic problems, tracks the official response, and separates a claimed fix from citizen-verified resolution. The prototype focuses on one complete report-to-verification loop in Bengaluru.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.
Source: docs/research/wards.md; apps/api/data/validation.json. GBA December 2025 final delimitation via https://data.opencity.in/dataset/gba-wards-delimitation-2025 (metadata licence: Other (Public Domain)), official GBA GeoServer Kannada cross-check. 369 cleaned polygons, 5 corporations; source differences documented.

## Slide 3 (source 4)

### Slide copy

Opportunities

Different by design

Independent evidence review

Officials claim completion. Eligible citizens confirm or dispute it. The ledger preserves the gap.

How it helps

One issue, one public history

Nearby reports join one canonical issue without deleting original reports. A ward queue makes responsibility visible.

Proposed USP

Bounded AI, auditable rules

Gemini observes and drafts. Code owns routing, priority, deadlines, transitions, quorum and every published metric.

### Presenter notes and sources

Differentiation is the combined evidence, citizen quorum and published metric definitions. This is a proposed product distinction, not a claim that no competitor offers citizen confirmation. No unverified market statistics are used.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.

## Slide 4 (source 5)

### Slide copy

List of features offered by the solution

Report copilot

Photo, voice or text; citizen confirms the draft.

Ward routing + duplicate review

Real polygons and distance checks before AI comparison.

Live civic record

Map, timeline, evidence, support, follow and Issue Pass.

Officer workflow

Acknowledge, start work, upload resolution evidence.

Citizen verification

Eligible votes confirm the fix or reopen the issue.

Outcome ledger

Claimed versus verified, SLA and reopen metrics with definitions.

Local source implemented and checked; cloud work deferred by owner. Browser review pending.

### Presenter notes and sources

Local source implemented and checked; cloud work deferred by owner. Browser review pending.

Feature architecture and source are implemented. A rendered UI review and live cloud/AI verification remain separate checks. Fictional leaders and projects are labelled demonstration records.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.

## Slide 5 (source 6)

### Slide copy

Process flow diagram or Use-case diagram

Report

Photo, voice, text
Citizen confirms

Route

Ward polygon
Nearby duplicates

Act

Officer response
Repair evidence

Verify

Evidence gate
Citizen quorum

Measure

Computed ledger
Published rules

Wrong-location evidence is held for review

Only eligible citizens can verify or reopen. A written officer override stays visible. Silence never closes an issue.

### Presenter notes and sources

A deterministic state machine governs every transition. Evidence observations are checked before an official claim advances. Citizen quorum is min(2, eligible), with at least one required vote. Silence never counts as confirmation.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.

## Slide 6 (source 7)

### Slide copy

Wireframes/Mock diagrams of the proposed solution (optional)

Map diagram from actual geometry

Illustrative ledger

100

50

Fixes claimed

Citizen verified

Scripted demo records
Not measured city performance
Not a product screenshot

### Presenter notes and sources

The graphic uses the shipped ward geometry and actual deterministic demo positions. The adjacent ledger is a native editable diagram of computed seed values. This slide is a mock diagram, not a screenshot and not measured municipal performance.

Source: docs/research/wards.md; apps/api/data/validation.json. GBA December 2025 final delimitation via https://data.opencity.in/dataset/gba-wards-delimitation-2025 (metadata licence: Other (Public Domain)), official GBA GeoServer Kannada cross-check. 369 cleaned polygons, 5 corporations; source differences documented.
Source: apps/api/data/demo-seed-summary.json and apps/web/public/data/demo-city.json, generated by a deterministic dry run at 2026-10-17T08:00Z. Every issue, person, vote, budget and outcome is fictional demo data. No civic performance claim is made.

## Slide 7 (source 8)

### Slide copy

Architecture diagram of the proposed solution

Citizen / officer web

React + Firebase Hosting

Cloud Run API

Hono + firebase-admin

Firestore + Storage

Records, photos, AI audit

Firebase Auth

Identity and demo roles

Gemini on Vertex AI

Draft, select, observe

Deterministic core

In-process rules + verifiers

API owns all writes. Browser reads are read-only. Schema checks, one repair retry, then a safe fallback.

### Presenter notes and sources

This is the implemented target architecture. Firebase Hosting would serve the SPA; /api would route to Cloud Run. Admin SDK owns mutations. Vertex uses a service account, not browser API keys. Cloud deployment and live model evaluation are deferred by owner; the current review continues locally.

For Ask Namma Civic, Gemini selects closed fact keys; code renders complete labelled bilingual values, units and sample sizes. Public AI projections exclude citizen transcripts and unapproved pre-edit prose. The deterministic core is inside the API, not another cloud service.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.

## Slide 8 (source 9)

### Slide copy

Technologies to be used in the solution

Interface

React 19, TypeScript, Vite, Tailwind, Motion, MapLibre

Google services

Firebase Hosting / Auth / Storage; Firestore; Cloud Run

AI integration

Gemini on Vertex AI; schema and task verifiers

API and domain

Node.js, Hono, firebase-admin, shared deterministic rules

Privacy

API-only writes, EXIF removal, PII scrub, private citizen audio

Evidence

Original reports, append-only events, source attribution, demo labels

### Presenter notes and sources

The stack is present in the codebase. Service integration code is distinct from successful cloud deployment or a measured live model evaluation.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.

## Slide 9 (source 10)

### Slide copy

Estimated implementation cost (optional)

Cloud cost has not been measured

Cloud Run

CPU, memory, requests and warm-instance time

Vertex Gemini

Input/output tokens and media processing

Firestore

Reads, writes, indexes and retention

Storage

Evidence size, downloads and retention

Cloud spending and alert setup are deferred. A $25 alert is planned; it is not a spending cap. No measured monthly cost is claimed.

### Presenter notes and sources

No cloud invoice, capacity benchmark or pricing estimate is claimed. The owner chose to continue locally, deferring cloud spending and alert configuration. Cost drivers are architecture facts, not quoted prices.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.

## Slide 10 (source 11)

### Slide copy

Snapshots of the prototype

Actual browser capture pending

No illustration is presented as a product screenshot. The local interface needs a rendered review before these two captures can be added.

Required capture 1

Homepage and ward map
Include the visible demo-data label

Required capture 2

Issue evidence and officer workflow
Use the verified deployed build

### Presenter notes and sources

This template section remains an explicit readiness gap. Managed browser access was blocked in the current authoring environment. No fake screenshot was substituted. Add genuine product captures and rerender this deck before submitting.

Source: docs/research/media.md and apps/web/public/samples/CREDITS.md. Licensed photographs are illustrations; synthetic audio is labelled. No generated screenshot is presented as the product.

## Slide 11 (source 12)

### Slide copy

Prototype Performance report/Benchmarking

Ward dataset

369 wards; 5 corporations; all representative points inside polygons

Seed integrity

200 demo histories replay; 1498 events; deterministic output hash

Media integrity

14 JPEGs without EXIF/XMP/IPTC; 17 sample fingerprints match

Code checks

Automated contract tests pass; all-workspace typecheck and web/API builds pass; 11 offline AI safety checks pass

Cloud deployment and live model evaluation deferred by owner
No live quality or latency results

### Presenter notes and sources

The figures on this slide are local integrity checks, not live model benchmarks. Cloud deployment and live model evaluation are deferred by owner. No Gemini category accuracy, duplicate precision/recall, evidence detection rate or latency is fabricated. A future live evaluation requires owner-directed resumption.

Source: apps/api/data/demo-seed-summary.json and apps/web/public/data/demo-city.json, generated by a deterministic dry run at 2026-10-17T08:00Z. Every issue, person, vote, budget and outcome is fictional demo data. No civic performance claim is made.
Source: docs/research/wards.md; apps/api/data/validation.json. GBA December 2025 final delimitation via https://data.opencity.in/dataset/gba-wards-delimitation-2025 (metadata licence: Other (Public Domain)), official GBA GeoServer Kannada cross-check. 369 cleaned polygons, 5 corporations; source differences documented.
Source: docs/research/media.md and apps/web/public/samples/CREDITS.md. Licensed photographs are illustrations; synthetic audio is labelled. No generated screenshot is presented as the product.
Status: submission/status.json

## Slide 12 (source 13)

### Slide copy

Additional Details/Future Development (if any)

Deferred cloud work

Owner chose to continue locally. Deployment, live model evaluation and public-link checks resume only when requested.

First pilot

Work with one ward or resident group; obtain consent, define moderation and review disputed closures with humans.

Later development

Complaint-system integrations, notifications, privacy blurring, real official identity checks and larger-scale analytics.

### Presenter notes and sources

Government integrations and real official verification are roadmap items. Namma Civic is an independent prototype; seeded fictional leaders and budgets must not be mistaken for actual officials or public spending.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.

## Slide 13 (source 14)

### Slide copy

Provide links to your:

GitHub public repository

https://github.com/Rahul21sai/LeadNet

Demo video (under 3 minutes)

[Owner: record, upload and paste public video URL]

Final product

[Cloud deployment deferred by owner; public URL pending]

All three links must open without account access during evaluation.

### Presenter notes and sources

Links remain explicit placeholders until published and checked. No repository push/publication, video upload, contest submission or live deployment is implied by this deck.

Source: prescribed template; current status in submission/status.json.

## Slide 14 (source 16)

### Slide copy



### Presenter notes and sources

Original closing artwork retained unchanged.

Source: prescribed AI Builder Cup submission template.