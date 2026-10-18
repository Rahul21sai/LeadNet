# Firebase Hosting Spark frontend

The selected frontend is live at [https://leadnet-blr.web.app](https://leadnet-blr.web.app), deployed on 18 October 2026 in the existing Firebase project `leadnet-blr`. The owner chose Spark with no billing/card. Project billing is unlinked; Cloud Run and the connected backend were not deployed.

This is a static, device-only demonstration built with `VITE_DEMO_MODE=1`. The feed, city map, issue pages, ward pages and ledger read bundled fictional records and attributed ward geometry. New community posts, media, comments, reactions and connections are saved only in the current browser. Nothing is shared with another device. Gemini, transcription, canonical reporting, officer actions, citizen verification and direct email require the connected backend and are unavailable on this deployment.

## Build and deploy

Use the existing Firebase CLI and sign in with the project owner account if needed:

```powershell
firebase login
firebase projects:list
```

Confirm `leadnet-blr` is the intended project. From the repository root in PowerShell:

```powershell
$env:VITE_DEMO_MODE = '1'
npm run build -w @leadnet/web
Remove-Item Env:VITE_DEMO_MODE
firebase deploy --only hosting --project leadnet-blr --config firebase.frontend.json
node deploy/frontend/verify-hosting.mjs https://leadnet-blr.web.app
```

Continue to deployment only after the build succeeds. Vite compiles the demo flag into `apps/web/dist`; a runtime environment variable cannot change an existing build. The separate `firebase.frontend.json` publishes this directory to Hosting site `leadnet-blr`, rewrites known browser routes to `index.html`, and keeps `/api/**` and missing assets as actual 404s. It does not deploy rules, databases, Storage, Functions or a Cloud Run service. Do not substitute the root `firebase.json`: that file contains the future connected application's configuration.

This path needs no gcloud/ADC login, service account, server credentials, Vertex setup or seed command. Spark Hosting is subject to its plan's storage and transfer quotas; it does not require linking billing. Billing changes or a later paid deployment require new owner approval.

## Verify and share

`node deploy/frontend/verify-hosting.mjs https://leadnet-blr.web.app` checks ten SPA routes, the 369-ward atlas, favicon, sharing image, sample photo/audio and 404 behavior for API requests and missing assets. This verifies deployed HTTP responses; it does not replace rendered browser checks.

Check the homepage, map, People, an issue deep link, and the device composer at 390px and 1440px in both themes, including refreshes and browser console errors. Try a typed draft through **Review my text** and **Save on this device**. Camera, microphone and location require compatible browsers, HTTPS and user permission. Capability and representative-directory API reads intentionally remain unavailable and the demo handles their failures. Firebase Hosting has no `/healthz` endpoint; that route belongs to the optional static-server container.

Share the HTTPS URL directly. Device activity is tied to the browser and origin: localhost or Vercel data does not move to Firebase Hosting, and clearing site storage removes saved local activity. Existing notices label the fictional city examples and browser-only behavior.

The optional [Cloud Run workflow](README.md#optional-frontend-only-cloud-run--not-deployed) remains prepared but was not deployed. Follow [the main deployment runbook](../../docs/DEPLOYMENT.md) for the distinction between this live frontend and the future connected application.
