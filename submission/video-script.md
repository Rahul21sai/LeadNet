# Namma Civic demo recording script

Target: **2 minutes 45 seconds**, English. This is a recording plan, not a completed video.

The owner chose to continue locally. Cloud deployment and live model evaluation are deferred; this production recording plan is deferred with them. If the owner later resumes that work, record only after the public build and actual model calls have been verified and the saved browser policy permits review. Use actual UI footage and keep the demo-data labels. Do not describe a mock response or read-only preview as a live mutation.

The supplied template asks for a three-minute video; the pasted submission form says three to four minutes, while the recovered research reported an under-three-minute condition. Confirm the current controlling rule before uploading. This script targets 2:45 and can be extended only if the portal requires it.

## 00:00-00:20 | Problem and product

**Screen:** Homepage with its demo label and claimed-versus-verified ledger.

**Say:**

“Namma Civic helps Bengaluru residents keep civic work on the record. An official can claim a repair, but citizens verify it. We keep the report, the evidence and the citizen verdict together, then publish the gap between what was claimed and what was confirmed.”

## 00:20-00:50 | Report by photo and voice

**Screen:** Report flow. Select a labelled sample, play the synthetic Kannada clip, request a real draft, then review the editable result.

**Say:**

“A resident can begin with a photo, text or a voice note. Here we are replaying a synthetic Kannada sample. Gemini proposes a category and report text, and the citizen confirms the details. This photo is an illustration; it is not proof of an incident at our replay location.”

## 00:50-01:15 | Route and join a duplicate

**Screen:** Ward assignment and nearby duplicate suggestion. Open the candidate, then confirm joining a deliberately created demo issue.

**Say:**

“Code assigns the ward from real boundary polygons and finds nearby open issues. Gemini compares only those supplied candidates. The citizen chooses whether to join an existing issue. Original reports remain separate records, so we preserve each submission while keeping one history for the underlying problem.”

## 01:15-01:50 | Officer action and evidence hold

**Screen:** Officer console. Acknowledge a demo issue, start work, upload a clearly different-location sample, show the held result and audit explanation.

**Say:**

“The officer queue is ordered by a published priority formula. The officer acknowledges the issue, starts work and submits evidence. This test deliberately uses another street. Gemini observes the photographs, but a code gate decides whether the claim can proceed. Suspicious evidence is held. A written override remains visible and is counted publicly.”

## 01:50-02:15 | Citizen verification

**Screen:** Eligible citizen accounts cast the required votes on a demo claim. Show the actual Verified or Reopened transition and timeline.

**Say:**

“A fix claim is still waiting for citizens. Only reporters and supporters can vote, and the shared quorum rule determines the result. Confirmation verifies the fix; sufficient disputes reopen it. A model cannot choose the status, and silence never closes an issue.”

## 02:15-02:35 | Explain the ledger

**Screen:** City and ward ledger; open a metric definition and sample size. Show real ward geometry.

**Say:**

“The ledger computes every number from the record: claims, verified fixes, response time and reopen rate. Each metric explains its formula and sample size. These two hundred histories are fictional demonstration data on real Bengaluru geography, not measured city performance.”

## 02:35-02:45 | Google services and close

**Screen:** Methodology/architecture panel or verified service overview, then homepage.

**Say:**

“Firebase serves the interface and identity. Firestore keeps the record, Cloud Run owns mutations, and Gemini assists within checked boundaries. Namma Civic makes civic outcomes inspectable.”

## Recording notes

- At the final deployment check, ensure the narrated service behavior matches the actual running environment. Do not say deployed if only the local preview is running.
- If a Gemini call falls back, show and name the fallback. Do not splice a different answer into that call.
- Do not show cloud credentials, access tokens, account details, citizen voice recordings or private report text.
- The seed supports deterministic replay; prepare known demo issue IDs before recording. Preserve public evidence/source disclosures.
- Read aloud once with a stopwatch. Shorten pauses and narration if it exceeds 2:45; allow time for visible interactions. Do not accelerate footage enough to obscure functionality.
