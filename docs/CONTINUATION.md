# LeadNet continuation

Recovered from Claude session `dd8efadd-d109-4fb3-8fed-72af80eef5e5` on 17 October 2026.

The owner approved the PRD, outcome ledger, fictional demo personas, a new Google Cloud project on their billing, and immediate parallel implementation. Team details remain placeholders. The session stopped during Wave 1 after repeated model gateway failures. Commit `f150c5d` contains the scaffold; existing uncommitted geography scripts, sample media and Firebase/model configuration are preserved.

## Implementation sequence

1. Recover and validate the real GBA ward datasets and media provenance. Build deterministic demo records from real ward label points.
2. Implement the existing API contracts with Firebase Admin, verified bounded Gemini calls, privacy guards, transactional state transitions and citizen quorum.
3. Build the report, issue, Issue Pass, officer, ledger, ward, project and methodology routes against the live data hooks and API.
4. Build the shared visual components, responsive shell, map and home page. Keep the approved neutral Civic Record palette, Inter / Noto Sans Kannada, bilingual headings, large breathing room and status-only chroma.
5. Integrate, run typecheck/tests/builds, inspect all routes at 390px and 1440px in both themes, and exercise the full civic loop.
6. Verify Google Cloud authentication and project state before any authorized cloud setup. Do not claim deployment or live Gemini validation until observed.
7. Prepare submission materials from the supplied template after the product works. The owner authorized pushing the local build to `https://github.com/Rahul21sai/LeadNet.git` on 17 October 2026. Cloud work remains deferred.

## Ownership

- API agent: `apps/api` except ward data and seed.
- Screen agent: report, issue, pass, officer, ledger, ward, project, methodology, not-found routes.
- Geography agent: source conversion, exact/display data, sample provenance and deterministic seed.
- Orchestrator: shared domain, web libraries, components, home/map, integration, QA and submission.

## Verification boundaries

No new dependencies. No browser writes to Firestore. Shared domain remains the only source of published metrics, priority, SLA and status transitions. AI failures hold resolution evidence. Demo records and synthetic media are labelled. Cloud authentication, team details, final video recording and public-source publication may require owner action; prepare concrete reviewable artifacts first.
