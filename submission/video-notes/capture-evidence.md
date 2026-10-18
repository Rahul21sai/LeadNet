# Public demo capture evidence

Captured 18 October 2026 from the user-supplied public origin, `https://lead-net-6639-eta.vercel.app/`. No localhost origin was accessed. Source capture tool: official Hyperframes 0.8.171, invoked through `submission/video/hf.mjs` with `--skip-vision --skip-assets --json`. All listed usable sources returned HTTP 200 and JSON `ok: true`, with no `BLOCKED.md`. Screenshots were visually inspected.

## Ready-to-use images

Paths below are relative to `submission/video/assets/captures/`. All stable PNGs are 1920 × 1080. Crops preserve actual screenshot pixels and add no UI, text, or synthesized content.

| Stable file | Source URL | Captured UTC | What it actually shows |
| --- | --- | --- | --- |
| `01-community.png` | `/` | 2026-10-18 13:38:30 | Community homepage with the issue entry card, fictional city feed, local demo banner, and explicit AI connection limitation. |
| `02-new-issue.png` | `/?compose=1` | 2026-10-18 13:39:33 | Genuine initial issue composer: blank description, media and private voice controls, category/language/location fields, device sandbox notice. AI and Review actions are disabled until the necessary input/service is available. |
| `03-issue-evidence.png` | `/issue/demo-issue-007` | 2026-10-18 13:31:31 | Verified demo issue BLR-D007, bilingual title, fictional report disclaimer, community count, beginning of before/after evidence. |
| `03b-before-after.png` | `/issue/demo-issue-007` | 2026-10-18 13:31:33 | Actual full-page screenshot crop at y=650: before/after slider, linked report/resolution images, statement that only citizen votes verify a fix. |
| `04a-citizen-check.png` | `/issue/demo-issue-007` | 2026-10-18 13:31:33 | Actual full-page screenshot crop at y=1580: “Did the fix hold?” form, 2 confirm / 0 dispute / quorum 2, choices and optional observation/photo controls. No new check was submitted. |
| `04-citizen-verification.png` | `/issue/demo-issue-007` | 2026-10-18 13:31:31 | Scripted demo timeline: resolution submitted, two citizen comments, system verified. The screen explicitly says no public AI runs are attached. |
| `05-ledger.png` | `/ledger` | 2026-10-18 13:30:54 | Outcome ledger with visible prototype/demo disclaimer and 100 claims / 50 citizen verified / 50 unverified. These are fictional demonstration values. |
| `06-people-opt-in.png` | `/people` | 2026-10-18 13:31:29 | People page, explicit fictional people/browser-only connections notice, profile hidden by default, opt-in discovery controls. |
| `06b-people-directory.png` | `/people` | 2026-10-18 13:31:30 | Actual full-page screenshot crop at y=700: fictional Citizen directory cards and profile interests/discovery controls. No outgoing request was made. |
| `07-city-explore.png` | `/city` | 2026-10-18 13:40:38 | City overview with genuine 3D ward map, demo issue pins, source attribution, and explicitly fictional record totals. |

Original successful captures and full-page plates remain in `home-logging-fix/`, `compose-logging-fix/`, `issue-evidence/`, `ledger/`, `people/`, and `city-logging-fix/`. `extracted/visible-text.txt` records the page text observed by the capture tool. `manifest.json` records file sizes, dimensions, SHA-256 hashes, source URLs, capture timestamps, and crop origins for the stable files.

## Verified limitations

- The public UI describes itself as a local demo. Posts and reactions stay on the device; live publishing, AI, and email require the connected service.
- This capture agent did not verify a newly saved post, generated AI output, email delivery, X posting, an outgoing People connection request, or a new citizen verification mutation.
- Browser screenshots were available through CUA, but DOM snapshots and interaction commands timed out. The parent's prior writing/review observation does not establish successful saving.
- The issue's photos are licensed illustrations; the page explicitly says they are not geolocated proof of the fictional location.
- Optional vision and imported-asset collection were disabled. The capture output warned of a referenced asset cap; the usable screenshot files themselves were inspected.

## Unusable capture attempts

`home/`, `home-public/`, `new-issue/`, and `city/` returned JSON `ok: false` after an `EBUSY` error while removing the temporary Chrome profile's `Default/chrome_debug.log`. Their `BLOCKED.md` files mark them unusable. Do not use their screenshots, extracted files, or brand data. They are excluded from the stable image list.

A fresh bounded homepage retry with `CHROME_LOG_FILE` set to `assets/captures/chrome-capture.log` succeeded (`ok: true`, HTTP 200, no blocked marker). The same normal Chromium logging configuration then produced successful composer and city captures. No capture validation gate was bypassed. There are no capture processes pending.
