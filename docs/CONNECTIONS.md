# Citizen connections

Open **People** (`/people`) to discover citizens who have opted into a ward's directory. Everyone appears as Citizen. Choose **Join People**, select a ward, optionally add a short public-interest bio, and enable discovery. Then choose **Connect** on another profile.

Incoming requests offer Accept/Decline. Sent requests can be cancelled. Only an explicit acceptance creates a connection; crossed requests do not auto-connect. Either participant can remove an accepted connection after confirmation. New requests require both profiles to be discoverable. Hiding a profile stops new discovery/requests but retains participant access to existing requests and connections.

## Privacy and state

Public discovery exposes only an opaque profile reference, Citizen label, selected ward and scrubbed bio. A selected ward describes the chosen discovery region, not verified residence. No personal name, UID, phone, email, exact location or citizen photo is exposed.

Private pairs snapshot the public profiles shared when the request was made. Existing participants see that request-time information, not later hidden profile edits. New requests after the cooldown capture fresh consented information. Creator-directory links appear only when the same citizen opted into discovery for the selected ward. Fictional demo creator links lead to corresponding fictional People profiles.

Shared code controls pending/accepted/declined/cancelled/removed states. Each unordered pair has one transactional record and monotonically increasing revisions. Retries are idempotent; stale decisions cannot apply to a later request cycle. Only recipients accept/decline, only senders cancel, and either accepted participant may remove. Both directions wait 24 hours after a decline/removal before requesting again. New sends are limited to 20 per hour; duplicate retries do not consume another slot. These social states do not change civic issue status, quorum or ledger metrics.

## API and storage

- Public `GET /api/v1/community/people?wardId=...` returns enabled profiles in that ward.
- Authenticated `GET /api/v1/community/connections` returns only the caller's profile and participant requests.
- Authenticated `POST /api/v1/community/connections/profile` saves `{ wardId, bio, discoverable }`.
- Authenticated `POST /api/v1/community/connections` sends `{ peerId }`.
- Authenticated `POST /api/v1/community/connections/:id/action` accepts `{ action, revision }`.

`connectionProfiles` and `connections` are server-only collections protected by existing default-deny rules. All writes go through the API; browser-readable Firestore rules are unchanged. Private reads/actions use no-store headers, UID-bound requests and auth-epoch cache isolation. Missing and nonparticipant pair IDs return indistinguishable errors. No email, SMS, X post, direct message or other external notification is sent by this feature.

## Vercel demonstration

With `VITE_DEMO_MODE=1`, People uses fictional profiles and local browser storage. Joining seeds two explicitly fictional incoming requests so acceptance/decline can be tried. New outgoing demo requests stay pending until cancelled; no remote citizen is contacted or automatically accepts. Clearing site data removes this demo activity. Each teammate has independent state; real cross-device requests require the configured Firebase/API application.

The demo uses its own storage key and validates stored data before restoring it. It refuses genuine profile records and does not persist an action if storage rejects the write. Public bios are scrubbed and bounded after privacy replacement so saved state remains reloadable.

## Verification limits

Automated tests cover transactions, consent, role ownership, anonymous projections, profile snapshots, pair probing, rate/cooldown/revision behavior, client identity changes, corrupted/quota-limited storage and rendered server markup for controls. Server markup is not a browser/device QA result. Actual 390px/1440px light/dark rendering, keyboard/focus timing, console errors and cloud-backed multi-device behavior remain unverified under the existing browser/configuration limits.
