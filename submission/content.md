# Namma Civic submission deck

Review snapshot. Registered team: Tri-Fusion. The roster is confirmed from the owner-supplied portal screenshot. Selected problem statement: Sustainability & Social Impact. Owner selected Sustainability & Social Impact for the submission materials on 18 October 2026; this does not confirm a portal selection or eligibility. Public prototype: https://leadnet-blr.web.app/ (Firebase Hosting Spark, device-only demo). Public repository: https://github.com/Rahul21sai/LeadNet. Frontend deployed to Firebase Hosting Spark in leadnet-blr on 18 October 2026. Project billing remains disabled. Cloud Run, connected backend and live Gemini were not deployed or verified. The public video URL, selected genuine screenshots and measured live AI results remain incomplete. Static Hosting alone does not establish the Google AI service requirement. Final 14 slides preserve the required content hierarchy and branding. Original source slide 2 (download instructions) and source slide 15 (blank) are omitted; neither contains required pitch content or a retention instruction. The owner/orchestrator approved this cleanup.

## Slide 1 (source 1)

### Slide copy

Team Details

Team name: Tri-Fusion
Team leader name: Vudumula Naga sai Rahul
Problem Statement: Sustainability & Social Impact

Team members: Mohammed Mudasser; Abubakr Siddique M

### Presenter notes and sources

Registered team: Tri-Fusion. Product: Namma Civic. Vudumula Naga sai Rahul (Leader); Mohammed Mudasser (Member); Abubakr Siddique M (Member). Names match the owner-supplied portal screenshot exactly; email addresses are omitted.

Selected problem statement: Sustainability & Social Impact. Owner selected Sustainability & Social Impact for the submission materials on 18 October 2026; this does not confirm a portal selection or eligibility.

Challenge description: Build an AI-powered solution that addresses a meaningful environmental or societal challenge. Solutions may focus on improving resource efficiency, increasing accessibility, strengthening resilience, supporting communities, or enabling more informed and sustainable decision-making.

Project problem statement: Residents struggle to turn everyday civic problems into clear, actionable reports and to track whether a fix actually happened. Namma Civic connects accessible local reporting, community discussion, evidence-backed responses and citizen verification in one public record.

Source: owner-supplied Hack2Skill portal roster screenshot, registered team confirmation and selected challenge, 18 October 2026; submission/team.json.

## Slide 2 (source 3)

### Slide copy

Brief about the idea

Namma Civic

Citizens verify the fix

Residents struggle to turn everyday civic problems into clear, actionable reports and to track whether a fix actually happened. Namma Civic connects accessible local reporting, community discussion, evidence-backed responses and citizen verification in one public record.

Photo + voice reporting     Real ward assignment     Public outcome ledger

Bengaluru prototype. Independent demonstration. No government endorsement.

### Presenter notes and sources

Selected challenge: Sustainability & Social Impact

Challenge description: Build an AI-powered solution that addresses a meaningful environmental or societal challenge. Solutions may focus on improving resource efficiency, increasing accessibility, strengthening resilience, supporting communities, or enabling more informed and sustainable decision-making.

Project problem statement: Residents struggle to turn everyday civic problems into clear, actionable reports and to track whether a fix actually happened. Namma Civic connects accessible local reporting, community discussion, evidence-backed responses and citizen verification in one public record.

Namma Civic applies this challenge to accessible local reporting, community participation and an evidence-backed public civic record. The connected report-to-verification workflow is implemented in source. The live Firebase Hosting frontend is a device-only demonstration, with no live Gemini or connected backend.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.
Source: docs/research/wards.md; apps/api/data/validation.json. GBA December 2025 final delimitation via https://data.opencity.in/dataset/gba-wards-delimitation-2025 (metadata licence: Other (Public Domain)), official GBA GeoServer Kannada cross-check. 369 cleaned polygons, 5 corporations; source differences documented.
Source: submission/team.json; submission/status.json; deploy/frontend/FIREBASE.md.

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

Public Firebase Hosting device-only demonstration is accessible. Posts and interactions stay in each browser; connected backend features remain unavailable.

### Presenter notes and sources

Public Firebase Hosting device-only demonstration is accessible. Posts and interactions stay in each browser; connected backend features remain unavailable.

All-workspace typecheck and nine static-server tests pass. Live Hosting routes, 369 wards and sample media verified. Community, People, map, issue and ledger layouts checked at 390px and 1440px in both themes.

Connected feature architecture and source are implemented. Firebase Hosting Spark serves the device-only demonstration. Connected API mutations and live Gemini remain unavailable. Fictional leaders and projects are labelled demonstration records.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.
Source: submission/status.json; deploy/frontend/FIREBASE.md.

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

Firebase Hosting Spark
Live device demo

Cloud Run API

Hono + firebase-admin
Not deployed

Firestore + Storage

Connected source only
Not deployed

Firebase Auth

Connected identity path
Unused by device demo

Gemini on Vertex AI

Draft, select, observe
No live invocation

Deterministic core

Rules + verifiers in source

Live: Firebase Hosting Spark frontend only. Backend and Gemini are unavailable.
Target: API writes, schema checks, one repair retry, then a safe fallback.

### Presenter notes and sources

This diagram combines the deployed static frontend with the implemented connected target architecture. Firebase Hosting Spark serves the device-only SPA at https://leadnet-blr.web.app/. It was deployed on 18 October 2026 with billing disabled and no API rewrite. Cloud Run and the connected backend remain undeployed. Gemini on Vertex AI has not been invoked or evaluated live. Device posts and interactions remain in each browser.

In the future connected design, Admin SDK owns mutations. Vertex uses a service account, not browser API keys. For Ask Namma Civic, Gemini selects closed fact keys and code renders complete labelled bilingual values, units and sample sizes. Public AI projections exclude citizen transcripts and unapproved pre-edit prose. The deterministic core is inside the API, not another cloud service. Static Firebase Hosting alone does not establish the challenge requirement to use a Google AI service.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.
Source: submission/status.json; deploy/frontend/FIREBASE.md; firebase.frontend.json.

## Slide 8 (source 9)

### Slide copy

Technologies to be used in the solution

Interface

React 19, TypeScript, Vite, Tailwind, Motion, MapLibre

Google services

Firebase Hosting Spark is live. Connected services are source only.

AI integration

Gemini on Vertex AI + verifiers in source. Live AI unavailable.

API and domain

Node.js, Hono, firebase-admin, shared deterministic rules

Privacy

API-only writes, EXIF removal, PII scrub, private citizen audio

Evidence

Original reports, append-only events, source attribution, demo labels

### Presenter notes and sources

Firebase Hosting Spark is the deployed Google service for the frontend. Auth, Storage, Firestore and Cloud Run are part of the connected source architecture, not a working connected deployment. Gemini integration and verifiers are implemented in source, but live Google AI behavior has not been established. The device demo stores new activity in the browser.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.
Source: submission/status.json; deploy/frontend/FIREBASE.md.

## Slide 9 (source 10)

### Slide copy

Estimated implementation cost (optional)

Firebase Hosting Spark frontend

Billing is unlinked. The static frontend uses Spark quotas.

Future Cloud Run

CPU, memory, requests and warm-instance time

Future Gemini

Input/output tokens and media processing

Future Firestore

Reads, writes, indexes and retention

Future Storage

Evidence size, downloads and retention

No paid backend is deployed or authorized. Spark quota limits apply. Future service costs need separate approval; no monthly cost measurement is claimed.

### Presenter notes and sources

The owner selected Firebase Hosting Spark with no billing/card. Project billing is unlinked. Cloud Run, the connected backend and Gemini were not deployed. No measured cloud invoice, capacity benchmark or monthly pricing estimate is claimed. The listed future cost drivers are architecture facts, not quoted prices. Paid resources need new owner approval.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.
Source: submission/status.json; docs/DEPLOYMENT.md; deploy/frontend/FIREBASE.md.

## Slide 10 (source 11)

### Slide copy

Snapshots of the prototype

Actual browser capture pending

The Firebase frontend is live. Verified product captures have not yet been selected for this deck. Illustrations are not presented as screenshots.

Required capture 1

Homepage and ward map
Include the visible demo-data label

Required capture 2

Issue evidence and officer workflow
Use the verified deployed build

### Presenter notes and sources

This template section remains a readiness gap. Firebase Hosting is live and browser layouts have been reviewed, but genuine product screenshots are not included in this deck revision. Existing archival capture sources remain unchanged. Add selected verified product captures and rerender before submitting.

Source: docs/research/media.md and apps/web/public/samples/CREDITS.md. Licensed photographs are illustrations; synthetic audio is labelled. No generated screenshot is presented as the product.
Source: submission/status.json.

## Slide 11 (source 12)

### Slide copy

Prototype Performance report/Benchmarking

Ward dataset

369 wards; 5 corporations; all representative points inside polygons

Seed integrity

200 demo histories replay; 1498 events; deterministic output hash

Media integrity

14 JPEGs without EXIF/XMP/IPTC; 17 sample fingerprints match

Code + Hosting

Typecheck and 9 HTTP tests pass. Live routes, media and layouts verified.

Firebase Hosting Spark is live. Billing is disabled.
Cloud Run, backend and Gemini remain unavailable.
No live AI quality or latency results are claimed.

### Presenter notes and sources

The figures describe local integrity checks and deployed frontend verification, not live model benchmarks.

All-workspace typecheck and nine static-server tests pass. Live Hosting routes, 369 wards and sample media verified. Community, People, map, issue and ledger layouts checked at 390px and 1440px in both themes.

Frontend deployed to Firebase Hosting Spark in leadnet-blr on 18 October 2026. Project billing remains disabled. Cloud Run, connected backend and live Gemini were not deployed or verified.

No Gemini category accuracy, duplicate precision/recall, evidence detection rate or latency is claimed. Hosting a static frontend does not establish the Google AI service requirement.

Source: apps/api/data/demo-seed-summary.json and apps/web/public/data/demo-city.json, generated by a deterministic dry run at 2026-10-17T08:00Z. Every issue, person, vote, budget and outcome is fictional demo data. No civic performance claim is made.
Source: docs/research/wards.md; apps/api/data/validation.json. GBA December 2025 final delimitation via https://data.opencity.in/dataset/gba-wards-delimitation-2025 (metadata licence: Other (Public Domain)), official GBA GeoServer Kannada cross-check. 369 cleaned polygons, 5 corporations; source differences documented.
Source: docs/research/media.md and apps/web/public/samples/CREDITS.md. Licensed photographs are illustrations; synthetic audio is labelled. No generated screenshot is presented as the product.
Status: submission/status.json

## Slide 12 (source 13)

### Slide copy

Additional Details/Future Development (if any)

Connected backend

Firebase Hosting Spark is live. Cloud Run, backend and Gemini need separate approval, deployment and live verification.

First pilot

Work with one ward or resident group; obtain consent, define moderation and review disputed closures with humans.

Later development

Complaint-system integrations, notifications, privacy blurring, real official identity checks and larger-scale analytics.

### Presenter notes and sources

The frontend is deployed to Firebase Hosting Spark. The connected backend and live Gemini remain unavailable, and paid deployment requires new owner approval. Government integrations and real official verification are roadmap items. Namma Civic is an independent prototype; seeded fictional leaders and budgets are not actual officials or public spending.

Sources: repository docs/PRD.md; docs/ARCHITECTURE.md; packages/shared/src/stateMachine.ts; priority.ts; sla.ts; verification.ts; metrics.ts. These are implemented contracts, not evidence of a deployed pilot.
Source: submission/status.json; docs/DEPLOYMENT.md.

## Slide 13 (source 14)

### Slide copy

Provide links to your:

GitHub public repository

https://github.com/Rahul21sai/LeadNet

Demo video (3-4 minutes)

[Owner: upload MP4 and paste public video URL]

Public prototype (Firebase device demo)

https://leadnet-blr.web.app/

All three links must open without account access during evaluation.

### Presenter notes and sources

The public repository link is retained. The Firebase Hosting product URL https://leadnet-blr.web.app/ serves Namma Civic in device-only demo mode, deployed on Spark on 18 October 2026. Current Hosting route, media and browser checks are recorded in submission/status.json. This frontend deployment does not establish connected backend operation or live Google AI use. The public video URL remains pending. The owner-supplied current submission requirement is a 3-4 minute video. No video upload or contest submission is implied by this deck.

Source: prescribed template; owner-supplied current video requirement; submission/status.json; deploy/frontend/FIREBASE.md, 18 October 2026.

## Slide 14 (source 16)

### Slide copy



### Presenter notes and sources

Original closing artwork retained unchanged.

Source: prescribed AI Builder Cup submission template.