# LeadNet

**Bengaluru, on the record.** Citizens share local issues, discuss nearby problems, and prepare reviewed messages to their elected representatives. Civic reports retain their evidence trail and citizen-verified outcomes; social reactions do not decide whether a fix is verified.

This is an AI Builder Cup prototype. Demonstration issues, leader personas, projects, votes and outcomes are fictional. The separate representative contact directory contains 28 real MLAs and five MPs with officially published contact addresses, checked on 18 October 2026. Ward geography is real, attributed GBA reference data. Licensed photographs are illustrations and do not prove that a particular incident occurred at a demo pin.

## Community capture and outreach

The home screen now provides a photo/video feed, City/Nearby/Saved views, camera capture with fresh device location, private voice recording, reviewed multilingual Gemini drafts, comments, reactions and official MLA/MP lookup. Direct email uses an optional configured Resend service and an explicit final review. X opens a reviewed composer that the user publishes from; images are not attached automatically.

The previous spatial presentation remains at `/city`. See [community setup](docs/COMMUNITY_SETUP.md) for configuration, source methodology and integration limits. Video transcoding is included in the approved Docker runtime definition; the Windows host has no FFmpeg binary. Exact Anthropic font assets are not redistributed; the typography uses an inspired Georgia/Inter/Kannada treatment.

## Run locally

Node.js 22 or newer is required. Dependencies are already installed in this workspace.

Copy `apps/web/.env.example` to `apps/web/.env.local` and set `VITE_FIREBASE_API_KEY` from the Firebase web app configuration. The local file is ignored by Git. The current workspace already has this local setting. Firebase rules and API authentication enforce access; the web configuration alone does not grant it.

```powershell
npm run dev
```

The web app serves on `http://localhost:5173` and proxies `/api` to the API on port 8080. The normal application reads Firestore and sends all writes through authenticated API routes. The API needs Google application-default credentials and a configured `leadnet-blr` Firebase project. No service-account key belongs in this repository.

For a labelled preview with 200 seeded issues and a private device-only community sandbox:

```powershell
$env:VITE_DEMO_MODE='1'
npm run dev
```

This mode reads the demonstration snapshot through the same UI data hooks. Community posts/media, comments, bookmarks and reactions stay on this device; no cloud publication, external email or live AI is simulated. The local API can still serve its static official contact directory and capability flags without Google credentials. Officer actions, citizen verification and generated answers remain disabled. Remove `VITE_DEMO_MODE` from the environment before building or deploying the connected version.

Set `AI_MOCK=1` on the API to exercise deterministic fallbacks without paid model calls. This does not replace Firestore, authentication or Storage with fake services.

## Verify

```powershell
npm run typecheck
npm test
npm run build
node --test scripts/geo/geo.test.mjs
npm run eval -w @leadnet/api
npm run seed -w @leadnet/api
```

Evaluation and seeding default to offline/dry-run operations. The evaluation report distinguishes contract safety checks from unmeasured live model quality. Applying seed data requires the explicit `--apply` argument. It refuses to overwrite existing demo records unless an explicit reset is requested. Do not reset a project containing records you want to preserve.

On restrictive Windows sandboxes, Vite/Vitest config bundling can fail while traversing ancestor directories. A local fallback is `node node_modules/vitest/vitest.mjs run --configLoader runner`; run Vite from `apps/web` with `node ../../node_modules/vite/bin/vite.js build --configLoader runner`. The ordinary npm commands are the deployment/CI checks.

## The bounded AI boundary

Gemini proposes category, hazard enums, severity enums and bilingual wording; compares only code-selected duplicate candidates; and describes evidence photos. Zod plus task-specific checks validate every response. One repair is allowed, followed by a deterministic fallback. Every call creates an AI trail. Raw voice transcripts and clips stay private.

Shared TypeScript computes ward routing, priority, SLAs, allowed status changes, evidence gates, citizen quorum and every metric. Ask LeadNet lets Gemini select relevant fact IDs; code renders complete labelled bilingual facts so a model cannot swap metric values. Officers cannot publish a verified status. A failed evidence model call holds a claim. Silence never verifies a fix.

Authentication uses Firebase ID tokens. Officer actions are scoped to assigned wards. The hackathon role switch is explicitly a demo capability and must be disabled with `DEMO_MODE=0` for a real deployment. Browser Firestore and Storage writes are denied by rules.

## Configuration and deployment

The API accepts `GOOGLE_CLOUD_PROJECT`, `STORAGE_BUCKET`, `VERTEX_LOCATION`, `MODEL_TRIAGE`, `MODEL_DEDUPE`, `MODEL_EVIDENCE`, `MODEL_BRIEF`, `MODEL_COMPOSE`, `AI_MOCK`, `DEMO_MODE`, `ALLOWED_ORIGINS` and `PORT`. Optional outreach/video settings are `RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_APP_URL` and `FFMPEG_PATH`; keep keys server-side. Model IDs are configurable. Verify availability with a live evaluation before claiming model quality or deploying a judging build.

The intended deployment is Firebase Hosting plus a Node.js Cloud Run service in `asia-south1`, with Firestore, Firebase Auth, Storage and Vertex AI. The container runs as an unprivileged user. Follow [the deployment runbook](docs/DEPLOYMENT.md). Creating the Firebase project alone does not establish that billing, database, Storage, Vertex or Cloud Run is ready.

## Project documents

- [Product requirements](docs/PRD.md)
- [Architecture and HTTP/data contracts](docs/ARCHITECTURE.md)
- [Visual system](docs/DESIGN_SYSTEM.md)
- [Spatial city interface direction](docs/SPATIAL_DESIGN.md)
- [Screenshot-led design refinement](docs/DESIGN_REFRESH.md)
- [Community feature and setup](docs/COMMUNITY_SETUP.md)
- [Official representative provenance](docs/research/representatives.md)
- [Ward provenance and geometry validation](docs/research/wards.md)
- [Media provenance](apps/web/public/samples/CREDITS.md)
- [Recovered handoff and implementation scope](docs/CONTINUATION.md)
- [Current verification status](docs/status.html)
- [Verification evidence and remaining limits](docs/VERIFICATION.md)

Source repository: https://github.com/Rahul21sai/LeadNet. Submission materials retain owner-supplied team placeholders until the team roster is supplied. Deployment and live model evaluation remain deferred.
