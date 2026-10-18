# Frontend deployment verification

Verified on 18 October 2026 at https://leadnet-blr.web.app, Firebase project/site `leadnet-blr`.

## Deployment and cost boundary

- Firebase CLI completed the static Hosting release successfully, uploading 90 files from `apps/web/dist` with `firebase.frontend.json`.
- The deployed build uses `VITE_DEMO_MODE=1`; the public UI displays its device-only demonstration notice.
- A fresh `gcloud billing projects describe leadnet-blr --format='value(billingEnabled)'` returned `False` after release. No billing account was linked.
- Cloud Run, backend, database rules, Storage rules and Vertex services were not deployed by this operation. The optional frontend container remains a prepared alternative.

## Automated checks

- `node deploy/frontend/verify-hosting.mjs https://leadnet-blr.web.app` passed: ten SPA paths, 369 ward features, favicon, sharing image, sample photo/audio, and real 404s for API and missing bundle requests.
- The same Hosting checks passed against the Firebase Hosting emulator before release.
- `npm run typecheck` passed for all workspaces.
- `node --test deploy/frontend/server.test.mjs` passed all nine tests for the optional static server. Docker is unavailable locally, so its container was not built or deployed.
- The web demo build completed before release. Existing chunk-size and annotation warnings remain.

## Public browser checks

The public HTTPS origin was inspected in the in-app Chromium browser. Community, People, map, an existing issue detail and the public ledger rendered at 390px and 1440px in light and dark themes. DOM layout checks found no horizontal overflow or failed loaded images. The community and map screenshots showed the expected content and themes. Captured browser error logs were empty during these checks.

On mobile, the menu opened and navigated to People. The New issue button opened the scrollable device composer, with the camera, media, voice and location controls visible; the connected AI control was disabled as expected. The map displayed the real ward geometry and fictional issue markers.

These were deployment smoke checks, not a full end-to-end feature test. No photo, voice or precise location was captured. No test post, representative email, X post, live AI request or backend mutation was submitted. Hardware permission flows, shared publishing, officer actions and citizen verification were not validated. New browser data on the Firebase origin is separate from localhost and Vercel.
