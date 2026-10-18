# Google-services and recording evidence

Read-only source audit, 18 October 2026. No credentials were opened, no cloud/network mutations were made, and no local browser automation was attempted. This audit does not establish rendered behavior or a live deployment.

## Current claim boundary

- Both Vercel configurations force `VITE_DEMO_MODE=1`: `vercel.json:5`, `apps/web/vercel.json:5`.
- This flag loads bundled data instead of Firestore snapshots: `apps/web/src/lib/demo.ts:3-8`, `apps/web/src/lib/data.ts:48-55` and `73-79`.
- Canonical API mutations are blocked in the static demo: `apps/web/src/lib/api.ts:14-17`. The only permitted exceptions are public community capability/representative reads; the static Vercel deployment has no API proxy, and the UI handles those being unavailable.
- The deployment guide explicitly calls this a frontend demonstration before the connected Google Cloud application is deployed: `docs/VERCEL_PREVIEW.md:3`.
- The repository records local verification, not live Firebase transactions/rules, Vertex quality/latency, Docker operation or deployed behavior: `docs/VERIFICATION.md:92-97`. Recorded test counts are prior evidence; this audit did not rerun them.
- No `.vercel/project.json`, nested Vercel project link, or actual `vercel.app` deployment URL was found in the inspected checkout. `leadnet-blr.web.app` is the architecture target (`docs/ARCHITECTURE.md:8`), not proof it is serving this application.

## Service roles supported by source

| Service | Implemented role | Evidence | Safe wording before live verification |
|---|---|---|---|
| Firebase Authentication | Anonymous/Google sign-in; server verifies ID tokens and custom role/ward claims | `apps/web/src/lib/auth.ts:2,58,64-65`; `apps/api/src/services/firebase.ts:30-44` | “The connected implementation uses Firebase Authentication for citizen identity and scoped officer access.” |
| Cloud Firestore | Canonical records, timelines, ledger, private ownership and audit documents; transactions on server, realtime public reads in browser | `apps/api/src/services/firebase.ts:54-65`; `apps/web/src/lib/data.ts:48-55,73-79`; `firestore.rules:3-4,8-44` | “Firestore is the connected system of record. Browser writes are denied; validated mutations go through the API.” |
| Cloud Storage for Firebase | Evidence/media objects start unpublished; server photo re-encoding strips metadata; rules allow published photos and deny draft reads/client writes | `apps/api/src/services/media.ts:26-46,52-55`; `storage.rules:3-20` | “The media adapter stores sanitized evidence in Cloud Storage for Firebase and keeps raw drafts private.” |
| Cloud Run | Node 22/Hono API container, authenticated mutations and deterministic workflow logic | `Dockerfile:1-34`; `apps/api/src/server.ts:1-8`; `firebase.json:6` | “The API is packaged for Cloud Run in Mumbai; deployment is pending owner verification.” |
| Vertex AI / Gemini | SDK adapter receives multimodal inputs and schema-constrained output; task verifier, one repair retry, deterministic fallback and `aiRuns` logging | `apps/api/src/ai/client.ts:19-30`; `apps/api/src/ai/runner.ts:23-51`; `apps/api/src/services/context.ts:16-17` | “Gemini is integrated through Vertex AI for bounded suggestions and observations. Code validates its output and controls civic decisions.” |
| Firebase Hosting | Static SPA assets and `/api/**` rewrite to the Cloud Run service | `firebase.json:2-7`; `docs/DEPLOYMENT.md:28-31` | “The Google Cloud deployment target uses Firebase Hosting in front of Cloud Run.” |

Do not say that Vercel is using these Google backends. It serves the device-only demo. Do not read a model name from configuration as evidence of model availability. The deployment runbook requires a real accepted response with token/latency evidence (`docs/DEPLOYMENT.md:29`).

## Strongest recordable prototype flow

Use a real browser recording of the prototype with a small visible “Fictional demo data · device-only preview” label. Keep these two stories distinct:

1. `/` → **New issue** → type a civic observation, optionally attach a harmless photo → **Review my text** → confirm → **Save on this device**. Return to the new post at the top of City feed. Say “This draft is saved privately in this browser.” This exercises the implemented device-post path; validate it in the recording browser first. It is not a canonical report or AI-generated draft. Evidence: `docs/VERCEL_PREVIEW.md:28-40`; `apps/web/src/routes/community/index.tsx:61,69`; `apps/web/src/lib/community.ts:84-110`.
2. `/map` → filter/select an issue → `/issue/demo-issue-007` → drag the photo comparison → inspect its public timeline and citizen quorum → `/ledger`. The bundled record is “Broken road surface at the school crossing,” Ashokanagar, with distinct `/samples/photos/pothole-3-before.jpg` and `pothole-3-after.jpg` illustrations, status `verified`, two confirms, zero disputes and a quorum of two. Its source is `apps/web/public/data/demo-city.json`; selectors expose histories/evidence in `apps/web/src/lib/demoRecords.ts:21-31`. Say “This fictional example shows the completed accountability loop.”

The second story demonstrates the record and explanation surfaces. It does not demonstrate a live mutation from reported to verified. The issue page implements the comparison, evidence flag, timeline and tally (`apps/web/src/routes/issue/index.tsx:12-14,67-75`). The static data explicitly returns no AI runs (`apps/web/src/lib/demoRecords.ts:26`); do not promise a populated Gemini audit trail in this preview.

Optional short cutaway: `/people` shows fictional, browser-only requests and consent controls (`apps/web/src/routes/people/index.tsx:95`; `docs/VERCEL_PREVIEW.md:30`). For a 3–4 minute video, prioritize evidence → citizen check → ledger over a long social-network tour.

Do not click these as if live in the static preview: `/report` submit, officer status/evidence actions, citizen verification submission, ledger Ask, AI polishing/transcription, representative email. Canonical actions require a configured backend; direct email also requires its separate provider and final review (`docs/VERCEL_PREVIEW.md:35-38`).

## Suggested accurate narration

“A complaint being marked resolved is not the same as a repair being verified. Namma Civic connects local reporting and community attention to an evidence-backed public record. This recording uses fictional example data and a device-only preview.”

“I can describe an issue, review the text and keep the post privately on this device. In the connected workflow, the citizen reviews Gemini's suggestions before publishing. Code assigns the ward, computes priority and deadlines, and controls every status transition.”

“Here is a completed fictional record. We can compare the report and claimed-repair photos, inspect the action history, and see the eligible citizen check. Photos support the claim; citizen quorum determines verification. Silence never verifies a fix.”

“The outcome ledger keeps claimed fixes separate from verified outcomes and shows definitions and sample sizes. It is calculated by code, rather than invented by an AI model.”

“The implemented Google Cloud architecture uses Firebase Authentication, Firestore, Cloud Storage for Firebase, a Hono API packaged for Cloud Run, and Gemini through Vertex AI. Firebase Hosting is configured to serve the SPA and route API requests to Cloud Run. Live deployment and model validation are the next owner-run steps.”

After deployment and evidence capture, replace the final sentence only with facts actually verified on that deployment. A successful CLI deployment by itself is insufficient (`docs/DEPLOYMENT.md:50-52`).

## Focused validation before recording

- Open the actual public preview URL, refresh `/map`, `/issue/demo-issue-007`, `/ledger`, `/people`, and confirm assets/deep links load. Confirm `/api` paths do not return SPA HTML.
- Check the chosen recording viewport and 390px/1440px in both themes, visible fictional/device-only labels, readable text, media credits, ward attribution and browser console.
- Make one device post, confirm it appears first, refresh and confirm persistence on the same origin. Confirm it is absent on another browser/device. Do not label this “published.”
- Preload issue 007 and verify the distinct comparison images, timeline, tally and ledger values on camera. These are fictional seed results, not measured civic impact.
- If recording sensors, verify camera/microphone/geolocation on the target HTTPS device with explicit browser permission; use typed input if they are unreliable. Keep private media and messages out of the recording.
- Keep representative email/X publication out of the recording. Do not send messages for demo purposes.

## Minimal-spend connected validation, only when owner deploys

Follow `docs/DEPLOYMENT.md:18-31` first: inspect existing resources and intended billing rather than recreating them. Use its min-instances 0, max-instances 2 and bounded instance settings. A budget alert is not a spending cap. Avoid repeated model calls; one deliberate accepted triage/evidence sample plus the existing offline harness is a useful initial check, not a quality benchmark.

For any recorded live claim, capture the real service revision, successful authenticated workflow, accepted non-fallback Vertex output (`attempts > 0`, `fallbackUsed == false`, non-null usage when returned), correctly persisted public/private documents, and one visible Firestore-driven update. Verify rules, real photo reads, privacy and citizen eligibility before describing the application as connected or deployed. Record the sample size and limits. No live service verification was performed in this audit.
