# Region issue creators

The leader workspace at `/officer` now pairs the existing issue queue with an Issue creators view. Select a ward to list the anonymous citizens who authored its issues or community posts, inspect their activity and follow links to the public records. The top navigation calls this workspace Leaders.

## What the directory counts

Canonical reports are grouped by authenticated author and the canonical issue's ward, including citizens who submitted a duplicate report. Repeated reports by the same citizen about the same issue count once. A canonical feed projection (`issue-{issueId}`) and its report are one activity; an independently authored community post remains separate even when it links to that issue. Support, bookmarks and comments do not establish issue authorship.

Counts and grouping are deterministic shared code. Each issue/post counts once per citizen, so the same issue reported by two people contributes one record to each citizen's row. The aggregate counts records across citizen entries, not globally unique ward issues. These are separate from the civic outcome ledger, verification eligibility and popularity. Rows sort by recent activity. Citizens display as Citizen with a ward-scoped reference, not a personal name or global account ID.

## Connected access

`GET /api/v1/officer/creators?wardId=...` requires a Firebase-authenticated officer assigned to that ward, or an admin. Ward scope is checked before any authorship records are read. Self-assigned demo-officer accounts cannot access this directory; an authorized leader account must be provisioned through the project's existing trusted administration process. The signed `demoOfficer` claim is propagated through server and browser identity handling.

The API reads existing public issues/posts plus server-only report/post ownership. It returns no raw UID, private report text, transcript, exact coordinate, contact detail or storage path. No collection or Firestore-rule change is required, and browsers do not query private ownership data.

## Vercel and local demonstration

With `VITE_DEMO_MODE=1`, the directory uses explicit fictional author associations over existing fictional issue records in the selected ward. These associations are illustrative and do not recover actual author identities from public posts. Genuine issue records are excluded. Device-saved community posts remain separate because the static preview cannot verify their ward/author association.

Live directory reads require the configured API and trusted identity. Vercel's static team preview demonstrates the UI without exposing private server records.

## Validation boundaries

Shared grouping, API authorization/privacy and browser-side scope checks are covered by focused tests. Run the full repository checks before publication. Browser-service access remains denied for the local origin, so rendered mobile/desktop behavior, focus timing, console errors and cloud-backed transactions require separate verification after access is available.
