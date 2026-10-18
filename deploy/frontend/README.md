# Frontend deployment

The owner selected **Firebase Hosting on Spark with no billing/card**. The frontend was deployed on 18 October 2026 at [https://leadnet-blr.web.app](https://leadnet-blr.web.app), project `leadnet-blr`. Billing is unlinked. Follow [FIREBASE.md](FIREBASE.md) for the selected deployment, using the separate `firebase.frontend.json` configuration and a build with `VITE_DEMO_MODE=1`.

This serves the Namma Civic device-only demo, as the existing Vercel preview does. Posts, comments and connections stay in the current browser. Shared publishing, canonical report mutations, Gemini and direct email require the separate backend and are unavailable here. No application secrets are required for this build. Verify the live Hosting files and routes with:

```powershell
node deploy/frontend/verify-hosting.mjs https://leadnet-blr.web.app
```

See [VERIFICATION.md](VERIFICATION.md) for the deployment checks and their limits.

## Optional frontend-only Cloud Run — not deployed

The following container workflow remains available for a future owner-approved move to Cloud Run. It has not been deployed. There is no current authorization to enable billing or provision paid resources; the owner's Spark selection replaces the earlier paid-deployment plan.

Prepared locally on 18 October 2026: the frontend build, nine static-server HTTP checks, all-workspace typecheck and packaged-site smoke checks pass. Docker is unavailable on this host, so the container itself has not been built locally.

The root Dockerfile runs the API. Use this separate preparation/deployment flow so the uploaded source contains only `Dockerfile`, `server.mjs` and the built static site. Video files, API source, credentials and the repository are excluded by construction.

After explicit new approval for Cloud Run and billing, from the repository root in PowerShell:

```powershell
& "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" auth login
node deploy/frontend/prepare.mjs
node --test deploy/frontend/server.test.mjs
& .\deploy\frontend\deploy.ps1 -UsePrepared
```

The deployment targets the existing `leadnet-blr` project, `asia-south1` region and a separate `namma-civic-web` service. It checks active CLI login and project billing, then uses the required Run/Cloud Build/Artifact Registry/IAM APIs. It creates or reuses a dedicated runtime service account without granting it application roles, and refuses to replace a service that is not labelled as this frontend. No ADC login, Firestore seed, Vertex enablement or backend deployment is performed.

Cost settings: request-based CPU, minimum zero instances, maximum one, 1 CPU, 256 MiB memory, and no startup CPU boost. Scaling to zero avoids an always-on instance; build, image-storage and traffic charges can still apply. No billing account is linked or changed automatically.

The static server listens on `PORT` (8080 by default), supports SPA deep links, returns real JSON 404s for API/missing files, provides `/healthz`, and serves precompressed Brotli/gzip assets. The preparation builds with `VITE_DEMO_MODE=1`; setting runtime environment variables cannot change that compiled mode.

After an optional Cloud Run deployment, check the public homepage, `/map`, `/people`, an issue deep link, datasets, sample media, and `/healthz`. The container's `/healthz` endpoint is not part of the selected Firebase Hosting deployment. Expected unavailable API reads must return 404 instead of successful HTML. Validate rendered layouts at 390px/1440px in both themes on the actual deployed URL, and grant camera/microphone/location permissions only when deliberately testing those features. Existing Vercel or Firebase browser data does not migrate to a different origin.
