# Local verification, 17–18 October 2026

The owner chose to continue locally. Cloud setup, live model evaluation, deployment and final submission are deferred. No cloud write or dependency installation was performed. The owner subsequently authorized publishing the local build to `https://github.com/Rahul21sai/LeadNet.git`; the push is separate from deployment.

## Observed passing checks

| Check | Result |
|---|---|
| `npm test` | 239 tests pass in 29 files, including connection consent/privacy/identity isolation, creator access, feed visibility, report-to-post publication and existing civic workflows |
| `npm run typecheck` | Shared, API and web pass |
| `npm run build` | Web and API production builds pass |
| `node --test scripts/geo/geo.test.mjs` | 3 tests pass |
| `npm run eval -w @leadnet/api` | 11/11 offline verifier cases pass |
| `npm run seed -w @leadnet/api` | Dry run passes; no cloud writes |
| `git diff --check` | Passes |
| Built API health / unauthenticated draft request | Health returns 200; mutation returns 401 |

The latest seed contains 200 fictional issues, 670 reports, 3,377 supporters, 150 votes, 1,498 events, 286 evidence records, six fictional personas and eight projects. All 369 real wards are present; the demo issues cover 12 wards. The deterministic seed payload hash is `b3d1d91bcf5f0001cd0dc10f84ff6e697bc7c730a09daaf153d7982578f0c9a3`.

## Regression evidence

The suite covers ward scoping, token requirements, draft ownership, duplicate constraints, confirmation/support/follow idempotency, citizen eligibility and claim quorum, reopening and a fresh claim, wrong-location holds, recorded overrides, failed model repair/fallback, private transcripts and edited-away AI text, code-bound ledger facts, photo metadata removal, bounded audio, transactional photo publication, failed-publication recovery, safe seed resets, persisted auth restoration and read-only preview data boundaries.

The read-only integration reviewer independently reproduced the resolution-publication failure and then verified recovery after the fix: one AI call, unchanged claim count, canonical photo publication and refreshed ledger. Seed reset preflight accepts the complete scripted seed and refuses runtime reports, memberships, votes or officer timeline activity. Do not run reset against an actively changing deployment; preflight does not pause concurrent writers.

## Review package

The source template's download instructions and blank slide were omitted. The review deck retains 14 slides, its branded template, editable text and diagrams. The PDF is assembled from rendered slides and is below 5 MB. Every final PDF page was rendered and inspected; the PPTX finalizer reports no package/layout findings and successful reimport. Team details, genuine product captures and public links remain intentional owner placeholders.

## Spatial interface follow-up

The owner approved the Apple-style spatial city direction. The first pass added a layered city model from all 369 ward polygons, selectable source-record pins, status filters, rotation and overhead controls, responsive navigation motion and an optional depth comparison in the ledger. The owner then supplied rendered screenshots showing excessive height/whitespace and a blank explorer; the second pass is specified in `DESIGN_REFRESH.md`.

The current design has a compact complete city model with attached record selection, a 64px header, refined light/charcoal materials, an actual issue's interactive photo comparison/timeline/citizen tally, varied category previews and a compact ledger comparison. The explorer is a definite-height map/list workspace with an inline local ward style and SVG fallback; no remote street, tile, glyph or building service is required. Source review found and fixed stale reused cluster markers and keyboard focus loss after mobile selection. Home and full issue photo comparisons both select the current claim's evidence; they never relabel an older claim's resolution as current.

The geometry tests preserve all 375 source rings, including holes, and check geographic aspect correction, north orientation, finite projection and interior labels. Added tests validate MapLibre's installed style schema, exact ward extents, record identity/coordinates, invalid coordinates, reused cluster metadata, varied preview selection and current-claim evidence. Final `npm test` passes 87 tests in 11 files; all-workspace typecheck and both production builds pass. Changed normal text, link and status token pairings against the secondary materials were calculated at >=4.5:1. The separate design reviewer also projected the actual ward vertices through sampled camera rotations to check the reduced scene's ground bounds. These are source/calculation checks, not rendered screenshots.

Existing dependencies suffice. Backend logic, credentials, Firebase settings, domain contracts and API paths were not changed.

Browser access was retried after the owner confirmed enabling the origin, supplied an explicit Allow screenshot and restarted the system. The reboot stopped both development services; these were restored on the original local address. The restored tab was an internal error document; a documented fresh-tab recovery on the same browser and approved HTTP URL still received an explicit saved/managed-policy denial. No alternate browser surface, raw CDP or screenshot workaround was used. The new design has user-supplied before screenshots, static review and automated validation, not a rendered 390px/1440px, light/dark or console sign-off. Source details are in `SPATIAL_DESIGN.md`.

## Community capture and outreach follow-up, 18 October

The owner expanded the product to a community network with camera/location capture, private voice-to-draft generation, media posts, discussion, nearby discovery, official representative lookup and reviewed outreach. This explicitly supersedes the earlier social-experience restriction; canonical issue statuses, quorum and ledger calculations remain separate and unchanged.

Implemented source includes public posts/comments and server-only writes; private ownership/raw-location/outbox/idempotency records; a device-only IndexedDB demonstration; new compose schema/verifiers/repair/fallback/private logs; photo re-encoding; official contact cards; reviewed Resend delivery; and a user-controlled X intent. The owner approved FFmpeg in the Docker runtime; it was added without deployment or installation on Windows. No exact Anthropic font binaries were downloaded or licensed; the interface uses a labelled inspired fallback.

The directory contains 28 MLAs and five MPs with official published emails. All 369 ward assembly attributes match a sourced pair using the official assembly directory, Sansad and ECI mapping; API/web snapshots are identical. Matching is by ward assembly attribution, not an exact constituency polygon overlay. A real-geometry, in-process API check for the MG Road sample returned Ashokanagar/Shanthinagar and both roles with verified directory addresses. Ward-ID lookup returned the same pair. Public capability reads succeeded without credentials; unauthenticated post creation returned 401. No message was sent.

Final full tests pass 129 cases across 15 files. They cover numeric/PII handling in English/Kannada/Hindi, fresh capture metadata, private sandbox state, safe links and deep links, current-claim evidence, post/comment/reaction limits and idempotency, authenticated ownership and matched email recipients, AI repair/fallback and photo-only drafts. An independent reviewer reproduced a delayed concurrent upload overwriting a published photo's access marker; the fix uses atomic GCS create-only preconditions and two production-adapter regressions now pass. API production build and all-workspace typechecks pass. Provider receipt retries are tested with fake adapters, not a real mail service.

Changed community action/text pairings were calculated at >=4.5:1 on the intended materials. Source review covers responsive structure, sensor cleanup, draft confirmation separation and reduced motion. Actual device/browser rendering remains unverified under the existing explicit browser-service denial.

## Issue visibility and theme recovery, 18 October

The owner supplied a screenshot showing white “Share an issue” text without its intended background. Both the fresh development compiler and production CSS contained the community colour/font tokens before this fix, and no service worker or source cascade conflict was found. Stale runtime transforms remain a hypothesis, not a confirmed root cause. Theme tokens now emit unconditionally with `@theme static`; community primary actions and display headings also include explicit colour/font fallbacks. The top navigation opens `/?compose=1` through “New issue”, and a second New issue action sits in the feed. The supplied screenshot is the before state; no rendered after state is claimed.

Three confirmed data problems were corrected: fictional examples could outrank actual posts when their timestamps were ahead of the device clock; delayed IndexedDB hydration could replace posts added during loading; and canonical report publication wrote issues without creating community feed posts. Feed merging now preserves new/deleted device entries, places fictional examples after actual posts, and pins the just-saved post while resetting filters. After the composer closes, the new card receives keyboard focus and scrolls into view. Query navigation opens/closes the composer, while closing preserves unrelated query parameters and the hash.

New canonical issues atomically create one privacy-scrubbed community post with rounded public location and private ownership. Duplicate joins and consumed-draft retries preserve social counts and ownership. Existing canonical reports are not backfilled. Seven feed regressions and four report-projection regressions bring the full suite to 140 passing tests in 17 files. All-workspace typecheck passes. Motion added here is limited to action press, dialog entry and saved-post feedback, with reduced-motion handling. Exact Anthropic font files remain unbundled; Georgia, Inter and Noto Sans Kannada provide the documented inspired treatment.

Both production builds pass, including a fresh web build after the final mobile header spacing adjustment. Static production-asset checks confirm emitted tokens, colour/font fallbacks, reduced-motion feedback and the final New issue header link. Calculated community-button contrast is 5.74:1 in light and 8.09:1 in dark. These checks do not measure rendered behavior.

The existing Vite process was verified against this repository's executable and restarted on `127.0.0.1:5173` in the same device-only demo mode; both the web and API TCP listeners are present. Browser-service access remains denied; responsive rendering, actual focus timing, camera/GPS and console-error checks remain unverified. No alternate browser or permission bypass was used.

## Leader region creators, 18 October

The owner requested a leader-selectable region directory and clarified that creators are citizens who posted issues. The existing officer route now presents a shared ward selector, Issue queue and Issue creators tabs, anonymous searchable entries and expandable public record links. The connected read lives in the central data hook; both request cache and rendered data are scoped by identity, signed role, ward assignments, demo-role restriction and selected ward. A new/refreshing identity immediately clears previously ready permissions before awaiting signed claims, preventing stale creator data from remaining visible during account/claim changes.

The new authenticated GET endpoint checks trusted officer/admin role and exact ward scope before reading authorship records. Self-assigned demo officer roles are denied. It uses selected-ward issue/post queries, report authors and private post ownership, in batches of eight. Ward-scoped SHA256 references replace UIDs. Explicit projections exclude private report text, transcripts, exact coordinates, contacts and storage paths. Repeated reports and canonical feed projections deduplicate per citizen/issue; independently authored posts remain distinct. Aggregate activity counts describe records across citizen entries, not globally unique ward issues. No collection, security-rule or civic-state/metric changes were made.

The static preview generates explicitly fictional author associations only over fictional records in the selected ward; it does not infer real author identity from anonymous public posts. A populated sample-ward shortcut helps demonstrate sparse wards. Private device posts remain separate.

Fresh verification: 178 tests in 22 files pass, all-workspace typecheck passes, and web/API production builds pass. A separate app-root build with `VITE_DEMO_MODE=1` passes; static asset checks find the leader directory/fictional labels and confirm the connected creator request is removed from that build. Both local service listeners remain present. Coverage adds six shared grouping/demo cases, 21 API scope/aggregation/privacy cases, four server-claim cases, three client-scope cases and four auth-change cases. The auth-change regression was reproduced with two failing tests before the pending-claims fix. Independent source review found no remaining actionable issues. Actual browser rendering and live Firebase/Cloud Run behavior remain unverified under the existing access/configuration limits. See `REGION_CREATORS.md` for attribution and access details.

## Citizen connections, 18 October

The owner requested connection sending from a social-network reference image and confirmed that it should be available to all citizens through People. The new page provides ward-based discovery, opt-in anonymous profiles, public-bio search, request sending, Incoming/Sent/Connections views, acceptance/decline/cancellation and confirmed removal. Creator directories link only to opted-in same-ward profiles; fictional creator examples link to matching fictional People profiles. Existing colours, typography, reduced motion and civic flows are preserved.

Private server collections remain covered by existing default-deny rules; browsers never write them directly. Transactions enforce one unordered pair, two-sided consent, idempotency, 20-new-request hourly limits, monotonically increasing revisions and 24-hour decline/removal cooldowns in both directions. Public projections exclude UID, personal contact and exact location. Participant views use immutable request-time profile snapshots, so later hidden profile edits do not leak to former requesters. Existing/nonexistent pair probes by outsiders produce the same response. Private results are no-store, bound to the current UID after token loading and gated by auth epoch during account/token changes.

The Vercel demo uses its own validated local-storage state with fictional profiles and incoming examples. Outgoing requests are never sent remotely or automatically accepted. Tests verify corrupt/genuine record rejection, quota-failure preservation, independent profile-ward selection, truthful refresh errors and scrubbed bio length after replacement expansion. SSR component checks verify actual controls, direction/status ownership, anonymous markup and cooldown labels; they do not establish browser layout or interaction.

Fresh full verification passes 239 tests in 29 files, all-workspace typecheck and both connected web/API builds. Final connected and forced-demo web builds also pass after the central-hook import integration. Static demo assets contain People, consent controls, local storage and creator links; the live profile-mutation path is removed from that build. Independent review found and verified fixes for cooldown reversal, hidden profile drift, pair existence probing, delayed-token identity changes and bio persistence. No real connection, cloud write, external message, deployment or dependency installation was performed. Rendered browser/device and deployed multi-user QA remain unverified. See `CONNECTIONS.md`.

## Namma Civic rebrand, 18 October

The owner renamed the product to Namma Civic. The interface, page metadata, social image, share/email wording, downloaded filenames, demo timeline actors, documentation, architecture graphics and submission exports use the new name. Repository URLs, package scopes, cloud resources and browser-storage namespaces retain their existing identities. The longer navigation wordmark has source-level responsive adjustments.

Fresh verification passed 239 tests in 29 files, all-workspace typecheck, connected web/API production builds, and the forced-demo web build. After the final display-filename updates, the 20 affected community-client/feed tests passed again. The dry-run seed regeneration passed; a structural comparison confirmed only brand strings changed, with counts, metrics, record IDs and geometry unchanged. The seed payload hash above reflects these label changes. Diagram XML, unique IDs and image dimensions were checked and the new graphics inspected. The rebuilt 14-slide PPTX and PDF have their own validation report in submission. Rendered app QA remains unverified under the existing browser permission denial.

## Tri-Fusion team and video preparation, 18 October

The owner supplied the team roster and confirmed the registered name Tri-Fusion. The team slide, editable PPTX and PDF now contain Vudumula Naga sai Rahul (Leader), Mohammed Mudasser and Abubakr Siddique M; email addresses are excluded. The owner-provided public URL is https://lead-net-6639-eta.vercel.app/. The rebuilt deck labels it a device-only public prototype; Google Cloud deployment is planned separately and live integrations remain unverified. The 14-page PDF and native PPTX roster/URL were checked, with zero finalizer package/layout findings.

The owner supplied the current 3–4 minute video rule, superseding the earlier 2:45 plan, and approved free local video tooling. An editable 215-second HyperFrames film with eight scenes, offline synthetic narration and phrase captions is prepared under submission/video. Ten genuine public UI captures were validated with successful capture receipts, hashes and visual inspection. Failed capture attempts are excluded. These are rendered screen states, not a recording of successful post creation, request sending, voting or live Gemini generation. The film states those boundaries.

The video check passed with browser execution enabled: zero lint/runtime/layout/motion/contrast errors, including 300 motion assertion samples. All eight narration clips fit their scenes and have no clipped audio samples. Each scene was inspected at a visible midpoint. The owner approved the narrated preview. The final MP4 rendered successfully at 215 seconds, 1920×1080, 24 fps, 5,160 frames with H.264/AAC. All 47 export checks passed, all eight narration regions are audible, and 24 decoded frame samples plus eight full-size midpoints were inspected without material defects. Full real-time pronunciation playback and a public upload are not claimed. No paid media, cloud rendering, application dependency change or cloud deployment occurred. See submission/video/validation-report.json and submission/video-notes/capture-evidence.md.

## Current limits and remaining work

- Browser access to `http://127.0.0.1:5173` was denied by a saved managed permission, including after the owner explicitly approved local testing. No alternate browser or screenshot workaround was used. Responsive visual behavior and the absence of browser console errors remain unverified.
- Docker is unavailable on this host. The container context manifest exclusion was corrected and CI includes a Docker build, but the container itself has not been run here or in CI.
- Live Firebase rules, custom claims, photo reads, real Firestore transactions, Vertex availability, model quality/latency and deployed behavior have not been tested. Offline safety checks are not model benchmarks. All live benchmark fields remain null.
- The current local preview uses `VITE_DEMO_MODE=1`, labels fictional examples and permits only explicitly private device community activity. Cloud writes, live AI, voting and direct email remain disabled. Normal production builds leave that mode off and use the live hooks/API.
- Real camera/microphone/GPS behavior and rendered community layouts need manual/device QA. Gemini quality/transcription, Resend delivery, FFmpeg encoding, deployed rules and real cloud persistence remain unverified. Docker is not installed on this host; the approved runtime image has not been built here.
- The production build reports large Firebase/MapLibre chunks and upstream Zod annotation warnings. It exits successfully. No additional dependency or bundle tuning was introduced without evidence that it was needed.

See `CONTINUATION.md` for recovered scope and `DEPLOYMENT.md` for the future authorized cloud sequence. GitHub publication is authorized. Browser permissions, team roster, actual video recording and final contest submission remain owner-controlled steps; cloud work is deferred.
