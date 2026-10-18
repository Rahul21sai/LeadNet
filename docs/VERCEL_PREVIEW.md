# Share LeadNet with the team on Vercel

This is a frontend demonstration before the connected Google Cloud application is deployed. Both Vercel configurations build only the web workspace and explicitly enable `VITE_DEMO_MODE=1`. No Google Cloud, Gemini, Firebase or email credentials are required for this demonstration.

## Deploy from GitHub

1. Sign in at [Vercel](https://vercel.com/new) and import `Rahul21sai/LeadNet`.
2. If Vercel detects multiple applications, select **Import single project** next to **web (Vite)**. Keep its **Root Directory** at `apps/web`.
3. Use **Vite** for Framework Preset and **22.x** for Node.js. If shown, enable **Include source files outside of the Root Directory in the Build Step** so `packages/shared` and the workspace lockfile remain available. The app-local `apps/web/vercel.json` supplies install/build/output settings:

   | Setting | Value |
   |---|---|
   | Install Command | `npm ci` |
   | Build Command | `VITE_DEMO_MODE=1 npm run build` |
   | Output Directory | `dist` |

4. Leave Environment Variables empty for this demo and deploy `main`.
5. Share the resulting HTTPS URL. Your laptop can be turned off after deployment. If Vercel protects the deployment, grant teammates access through Vercel's sharing/access controls.

Output paths are relative to the selected project root. With `apps/web` selected, `dist` means `apps/web/dist` in the repository. Do not use `apps/web/dist` as the output setting for this app-root import. For an existing repository-root import, the separate root `vercel.json` retains the workspace build command and `apps/web/dist` output; use **Other** as its preset. The two configurations support the two import flows without moving source files.

No Vercel deployment has been created by preparing these files. This checkout has no installed Vercel CLI or linked Vercel project. For agent-assisted linking, environment management, deployment and logs, installing the official CLI with `npm i -g vercel` is strongly recommended. Complete `vercel login` in your account, then verify the intended project before deploying. The GitHub import above does not require the CLI.

## What teammates can try

| Feature | Demo behavior |
|---|---|
| Community feed, city map, ledger and issue pages | Bundled fictional example records and attributed real ward geometry |
| Leaders → Issue creators | Fictional author associations grouped by selected ward; actual authorship requires a trusted connected leader account |
| Camera, microphone and device location | Browser permissions required; HTTPS supports these APIs in compatible browsers |
| Photo/video posts, written drafts, reactions, comments and bookmarks | Saved only in that browser; not shared across teammates |
| Nearby | Filters available example/device posts within 5 km of the device; outside Bengaluru it may be empty |
| Voice recording | Private recording/playback; type the transcript to continue without Gemini |
| AI polishing and transcription | Unavailable until the connected backend is configured |
| Representative lookup and direct email | Unavailable on this static deployment; no recipient is guessed and no email is sent |
| Canonical reporting, officer actions and citizen verification | Read-only; require the connected application |
| X | User-controlled text handoff; publication and media attachment happen in X |

Try **New issue**, add a description/photo, choose **Review my text**, confirm the review and choose **Save on this device**. The saved post appears at the top of City feed. Clearing site storage removes device activity. Data saved on localhost does not move to the Vercel origin.

## Routing and future connected deployment

The Vercel configuration serves existing assets first and falls back to `index.html` for app routes, including deep links such as `/map` and `/issue/...`. It excludes `/api` and `/api/*`, which must fail rather than return HTML as if it were an API response. Missing public capability/directory reads are handled by the demo UI.

After the backend is deployed, change the Vercel build command to remove the forced demo flag, configure the Firebase web environment, add the approved same-origin `/api` proxy to the actual Cloud Run service, and authorize the deployment domain in Firebase Authentication. Follow `DEPLOYMENT.md` for the backend and live verification. Never put service-account JSON, mail keys or server credentials in `VITE_*` variables.

## Validation

The local preview already has an explicit browser-service permission denial. Source/build checks do not replace testing the deployed URL on mobile/desktop, refreshing deep links, checking console errors and exercising camera/microphone/location on real devices. Record those results after Vercel supplies the deployment URL.
