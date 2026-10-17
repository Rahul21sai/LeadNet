# LeadNet

**Bengaluru, on the record.** Citizens report civic issues, officials attach repair evidence, and the people affected verify the outcome. The public ledger measures the gap between claimed and citizen-verified fixes.

This is an AI Builder Cup prototype. Demonstration issues, people, projects, votes and outcomes are fictional. Ward geography is real, attributed GBA reference data. Licensed photographs are illustrations and do not prove that a particular incident occurred at a demo pin.

## Run locally

Node.js 22 or newer is required. Dependencies are already installed in this workspace.

Copy `apps/web/.env.example` to `apps/web/.env.local` and set `VITE_FIREBASE_API_KEY` from the Firebase web app configuration. The local file is ignored by Git. The current workspace already has this local setting. Firebase rules and API authentication enforce access; the web configuration alone does not grant it.

```powershell
npm run dev
```

The web app serves on `http://localhost:5173` and proxies `/api` to the API on port 8080. The normal application reads Firestore and sends all writes through authenticated API routes. The API needs Google application-default credentials and a configured `leadnet-blr` Firebase project. No service-account key belongs in this repository.

For an explicitly labelled, read-only preview with 200 seeded issues:

```powershell
$env:VITE_DEMO_MODE='1'
npm run dev -w @leadnet/web
```

This mode reads the public demonstration snapshot through the same UI data hooks. Publishing, officer actions, voting and generated answers are disabled. Remove `VITE_DEMO_MODE` from the environment before building or deploying the connected version.

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

The API accepts `GOOGLE_CLOUD_PROJECT`, `STORAGE_BUCKET`, `VERTEX_LOCATION`, `MODEL_TRIAGE`, `MODEL_DEDUPE`, `MODEL_EVIDENCE`, `MODEL_BRIEF`, `AI_MOCK`, `DEMO_MODE`, `ALLOWED_ORIGINS` and `PORT`. Model IDs are configurable. Verify availability with a live evaluation before claiming model quality or deploying a judging build.

The intended deployment is Firebase Hosting plus a Node.js Cloud Run service in `asia-south1`, with Firestore, Firebase Auth, Storage and Vertex AI. The container runs as an unprivileged user. Follow [the deployment runbook](docs/DEPLOYMENT.md). Creating the Firebase project alone does not establish that billing, database, Storage, Vertex or Cloud Run is ready.

## Project documents

- [Product requirements](docs/PRD.md)
- [Architecture and HTTP/data contracts](docs/ARCHITECTURE.md)
- [Visual system](docs/DESIGN_SYSTEM.md)
- [Ward provenance and geometry validation](docs/research/wards.md)
- [Media provenance](apps/web/public/samples/CREDITS.md)
- [Recovered handoff and implementation scope](docs/CONTINUATION.md)
- [Current verification status](docs/status.html)
- [Verification evidence and remaining limits](docs/VERIFICATION.md)

Source repository: https://github.com/Rahul21sai/LeadNet. Submission materials retain owner-supplied team placeholders until the team roster is supplied. Deployment and live model evaluation remain deferred.
