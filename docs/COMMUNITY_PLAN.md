# Community reporting and outreach

The owner requested this expansion on 18 October 2026. It supersedes the earlier restriction against a social experience and authorizes a separate source-backed representative directory. Existing fictional leader personas retain their labels. No real politician receives an invented score or outcome.

## Reviewable flow

Camera photo + capture-time device location, or uploaded media + explicitly chosen location → private voice/text draft → reviewed LLM rewrite → community post → nearby discovery, local bookmarks, reactions and discussion → verified representative contact cards → reviewed email or user-controlled X composer.

Camera location is the device position at shutter time, with accuracy and timestamp. It does not prove where an uploaded photograph was taken. Uploads do not inherit current GPS. Public community coordinates are rounded to approximately 100m; unrounded coordinates stay server-private for constituency lookup. Location denial permits a manual location or a post without location. Voice clips remain private.

## Interface direction

Community is the home screen. The existing spatial city is available at `/city`; map, evidence, ledger and reporting remain intact. The feed has a photo-first centre column, nearby/saved filters, a capture/voice/text composer and an outreach inspector. Anonymous public labels remain Citizen. Example records are explicitly fictional and begin with zero invented social engagement.

Warm paper (`#f7f5f1`), white cards, warm secondary material (`#eeebe5`) and ink form the light palette; charcoal counterparts use `#191816`, `#23211e`, `#2d2a25`. A clay accent identifies community actions and remains separate from issue statuses. Display typography uses an Anthropic-inspired serif treatment, with Inter and Kannada retained for controls/body; exact proprietary font files are not redistributed. Motion explains composer opening, media selection, reaction state and review steps, with reduced-motion alternatives.

## Contracts and services

Shared community types and zod schemas live in `packages/shared/src/community.ts`. Public `posts` and `posts/{id}/comments` contain no author UID or raw capture position. Ownership, unrounded location, idempotency and email outbox records are private. Browsers never write Firestore or Storage.

Compose uses the existing Vertex Gemini adapter and the verifier/repair/fallback/logging runner with a new compose task. Missing transcription is explicit; an offline fallback never claims to be an LLM rewrite. Generated copy is editable. Representatives and contact addresses come from verified directory sources, never from the LLM. Ward-to-assembly attribution and its limits are shown. Unknown contacts remain unavailable.

Email uses an optional Resend HTTP adapter with server-selected, matched recipients, ownership checks, limits, idempotency and an explicit final confirmation. X sharing opens a reviewed intent; the user completes publication. Images are not falsely claimed to be attached to an X intent. No external message is sent by development tools.

Photo uploads retain server re-encoding. Video upload requires metadata-stripping, bounded transcoding; the owner approved the FFmpeg Docker runtime dependency on 18 October 2026. It has been added to the runtime image definition without deployment or a Windows-host installation. All integration credentials remain in ignored environment files. No deployment or paid call is performed by this implementation task.

## Local demonstration and validation

In demo mode community interactions persist on this device and are clearly separate from cloud publication. Media uses IndexedDB rather than large localStorage strings. Public representative/capability reads can use the local API without cloud credentials. Camera, microphone and geolocation are requested only through an explicit user action.

Validate contracts, PII scrubbing, claim/ledger isolation, media publication recovery, numeric fidelity/fallback, private transcripts, matched contact/owner checks, reaction/comment idempotency, limits and email receipt state. Run typecheck, tests and builds. The existing browser-service policy block remains in effect; no alternate browser or screenshot mechanism may bypass it, and rendered/device permission QA must not be claimed.
