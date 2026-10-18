# LeadNet deployment runbook

Deployment was authorized in the recovered session for `leadnet-blr`, on the owner's billing, with an approximately $10–15/month prototype target and a $25 budget alert. Do not select a different billing account or expand that scope silently. Never print tokens or commit credentials.

## Human sign-in

For a team demonstration before provisioning Google Cloud, use [the Vercel preview guide](VERCEL_PREVIEW.md). The checked-in Vercel configuration hosts the device-only demo without server credentials; it does not enable shared posts, Gemini or direct email.

Complete both interactive logins with the account that owns the Firebase project:

```powershell
& "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" auth login
& "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" auth application-default login
```

## Verify the project before changing it

Use `gcloud auth list`, `gcloud projects describe leadnet-blr`, `gcloud billing projects describe leadnet-blr`, and `firebase projects:list`. Confirm the project and intended billing account. Check enabled services, existing Firestore databases, Storage bucket, runtime service account and Cloud Run services. Do not recreate resources that already exist.

The first Firebase project/web-app/anonymous-auth setup was completed in the prior session. That does not imply a working database or paid services. The continuation initially found no gcloud/ADC login; refresh the actual state before proceeding.

## Provision within the approved scope

1. Link the owner's intended billing account, enable required Run, Cloud Build, Artifact Registry, Firestore, Storage, Identity Toolkit and Vertex APIs, and configure the $25 budget alert. A budget alert is not a spending cap.
2. Create the Native Firestore default database and Firebase Storage bucket in `asia-south1` if absent. Confirm the actual bucket name matches `STORAGE_BUCKET`.
3. Create a dedicated runtime service account. Grant only Vertex AI User, Cloud Datastore User, Storage Object Admin, Firebase Authentication Admin (the demo claim switch), and Logging Writer as the approved prototype requires. Keep deployment/build permissions on the deployer, not the runtime identity.
4. Run the production checks. Deploy the existing read-only Firestore/Storage rules and indexes. The app never writes through the Firebase browser SDK.
5. Deploy the Cloud Run container from the repository root with the dedicated identity, `GOOGLE_CLOUD_PROJECT=leadnet-blr`, the actual bucket, `VERTEX_LOCATION=global`, `AI_MOCK=0`, and configured model IDs. Use max instances 2, min instances 0 outside an intentional judging window, 512 MiB RAM, 1 CPU and a 60-second request timeout.
6. Run a small live model evaluation. A schema-valid fallback is not evidence of a working model. Inspect real accepted outputs, token usage, latency and resulting private/public AI documents. Adjust only to models the project can actually invoke.
7. Apply the demo seed explicitly after inspecting the dry-run. It uploads only licensed illustration photos and marks scripted data demo. Voice clips are not uploaded to public evidence.
8. Build the web with `VITE_DEMO_MODE` unset. Deploy Hosting with its `/api/**` rewrite to `leadnet-api` in `asia-south1`.

Representative commands, after the preceding state and identity checks:

```powershell
npm run typecheck
npm test
npm run build
firebase deploy --only firestore,storage --project leadnet-blr
gcloud run deploy leadnet-api --source . --project leadnet-blr --region asia-south1 --service-account leadnet-api@leadnet-blr.iam.gserviceaccount.com --allow-unauthenticated --memory 512Mi --cpu 1 --min-instances 0 --max-instances 2 --timeout 60 --set-env-vars GOOGLE_CLOUD_PROJECT=leadnet-blr,VERTEX_LOCATION=global,AI_MOCK=0,DEMO_MODE=1
npm run eval -w @leadnet/api -- --live
npm run seed -w @leadnet/api -- --apply
firebase deploy --only hosting --project leadnet-blr
```

`--allow-unauthenticated` allows Hosting and public health requests to reach the service; mutating routes still verify Firebase ID tokens. If the bucket or models differ from defaults, supply those environment variables before deployment. The runtime identity above is a planned name, not a claim that it exists.

## Verify the deployed result

Inspect health over the Hosting URL and Cloud Run URL. Complete the real report, duplicate join, scoped officer action, wrong-location hold, written override, eligible citizen quorum and ledger-update flows. Confirm private draft media, reports, transcripts and votes cannot be read anonymously, and browser writes fail. Check 390px and 1440px in both themes with no console errors. Verify map attribution, media credits and fictional labels.

Record the deployment revision, test report and evaluation sample sizes. Do not mark the app deployed based only on a CLI success message. GitHub push, making the repository public, team details and final hackathon submission remain separate owner actions.
