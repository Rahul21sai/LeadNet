# Local verification, 17 October 2026

The owner chose to continue locally. Cloud setup, live model evaluation, deployment and final submission are deferred. No cloud write or dependency installation was performed. The owner subsequently authorized publishing the local build to `https://github.com/Rahul21sai/LeadNet.git`; the push is separate from deployment.

## Observed passing checks

| Check | Result |
|---|---|
| `npm test` | 75 tests pass in 9 files, including spatial geometry checks |
| `npm run typecheck` | Shared, API and web pass |
| `npm run build` | Web and API production builds pass |
| `node --test scripts/geo/geo.test.mjs` | 3 tests pass |
| `npm run eval -w @leadnet/api` | 11/11 offline verifier cases pass |
| `npm run seed -w @leadnet/api` | Dry run passes; no cloud writes |
| `git diff --check` | Passes |
| Built API health / unauthenticated draft request | Health returns 200; mutation returns 401 |

The latest seed contains 200 fictional issues, 670 reports, 3,377 supporters, 150 votes, 1,498 events, 286 evidence records, six fictional personas and eight projects. All 369 real wards are present; the demo issues cover 12 wards. The deterministic seed payload hash is `3ec084f0e4fd3c51ee0982034ed3e6e9b89dbe841d2fea21f264147300c2bfc1`.

## Regression evidence

The suite covers ward scoping, token requirements, draft ownership, duplicate constraints, confirmation/support/follow idempotency, citizen eligibility and claim quorum, reopening and a fresh claim, wrong-location holds, recorded overrides, failed model repair/fallback, private transcripts and edited-away AI text, code-bound ledger facts, photo metadata removal, bounded audio, transactional photo publication, failed-publication recovery, safe seed resets, persisted auth restoration and read-only preview data boundaries.

The read-only integration reviewer independently reproduced the resolution-publication failure and then verified recovery after the fix: one AI call, unchanged claim count, canonical photo publication and refreshed ledger. Seed reset preflight accepts the complete scripted seed and refuses runtime reports, memberships, votes or officer timeline activity. Do not run reset against an actively changing deployment; preflight does not pause concurrent writers.

## Review package

The source template's download instructions and blank slide were omitted. The review deck retains 14 slides, its branded template, editable text and diagrams. The PDF is assembled from rendered slides and is below 5 MB. Every final PDF page was rendered and inspected; the PPTX finalizer reports no package/layout findings and successful reimport. Team details, genuine product captures and public links remain intentional owner placeholders.

## Spatial interface follow-up

The owner approved the Apple-style spatial city direction. The local design adds a layered city model from all 369 ward polygons, selectable source-record pins, status filters, rotation and overhead controls, a lifecycle walkthrough, category filtering, a 2D/3D MapLibre explorer, responsive navigation motion and an optional depth comparison in the ledger. Shared metrics remain authoritative; column height is only a visual scale. Displayed numbers crossfade between actual recorded values.

The new geometry tests preserve all 375 source rings, including holes, and check geographic aspect correction, north orientation, finite projection and interior labels. Existing dependencies suffice. Backend logic, credentials, Firebase settings and API contracts were not changed. All-workspace typecheck and both production builds pass. The latest web build includes the final copy and accessible control labels.

Browser access was retried only after the owner confirmed enabling the origin. The tool still returned a saved-policy denial; no alternate browser route was attempted. The new design has static review and automated validation, not a rendered 390px/1440px, light/dark or console sign-off. Source details are in `SPATIAL_DESIGN.md`.

## Limits and remaining work

- Browser access to `http://127.0.0.1:5173` was denied by a saved managed permission, including after the owner explicitly approved local testing. No alternate browser or screenshot workaround was used. Responsive visual behavior and the absence of browser console errors remain unverified.
- Docker is unavailable on this host. The container context manifest exclusion was corrected and CI includes a Docker build, but the container itself has not been run here or in CI.
- Live Firebase rules, custom claims, photo reads, real Firestore transactions, Vertex availability, model quality/latency and deployed behavior have not been tested. Offline safety checks are not model benchmarks. All live benchmark fields remain null.
- The current local preview uses `VITE_DEMO_MODE=1`, prominently labels fictional records and rejects mutations. Normal production builds leave that mode off and use the live hooks/API.
- The production build reports large Firebase/MapLibre chunks and upstream Zod annotation warnings. It exits successfully. No additional dependency or bundle tuning was introduced without evidence that it was needed.

See `CONTINUATION.md` for recovered scope and `DEPLOYMENT.md` for the future authorized cloud sequence. GitHub publication is authorized. Browser permissions, team roster, actual video recording and final contest submission remain owner-controlled steps; cloud work is deferred.
