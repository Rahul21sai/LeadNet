# Submission readiness

This folder is a local review package. The owner explicitly chose to continue locally, deferring cloud deployment and live model evaluation. It does not mean the contest entry has been submitted or a public deployment is ready.

## Prepared locally

- [x] Required template inspected, including all 16 source slides.
- [x] Required content order, dimensions, branding and closing artwork retained. Source download-instruction slide 2 and blank slide 15 are omitted from the final 14-slide deck.
- [x] Team fields deliberately left as owner placeholders.
- [x] Source citations and data limitations recorded in slide notes.
- [x] Real ward geometry and clearly fictional seed records used for diagrams.
- [x] No fabricated model benchmark or product screenshot.
- [x] English demo recording script targets 2:45.
- [x] Brief solution description drafted under the 1,024-character limit.
- [x] Final PPTX and PDF rendered, inspected and verified; see `validation-report.json`. Package/layout checks have zero findings; all 14 actual PDF pages were inspected.
- [x] Final PDF size is 1,974,292 bytes, below 5 MB. The PDF uses image pages; the PPTX keeps editable text and diagrams.

## Deferred requirements for a future public submission

- [ ] Fill registered team name, leader name and exact problem-statement selection on slide 1. Confirm eligibility and the registered roster.
- [ ] Only if the owner resumes cloud work: authenticate the intended Google Cloud/Firebase account and complete cloud setup. No authentication action is requested for the current local-only work.
- [ ] Verify deployed Firebase Hosting, Firestore, Storage, Auth and Cloud Run behavior.
- [ ] Run real Vertex Gemini evaluation; record model ID, sample sizes, accuracy and latency. Offline safety checks are not live quality benchmarks.
- [ ] Inspect the actual UI at 390px and 1440px in light/dark with no console errors.
- [ ] Add genuine UI screenshots to final slide 10 (source slide 11); remove its pending-capture notice only after actual capture.
- [ ] Update final slide 11 (source slide 12) with measured live results, or retain truthful pending status.
- [ ] Check PII removal, private citizen audio and published evidence visibility end to end.
- [ ] Check report, duplicate merge, support/follow, officer evidence hold, eligible voting and ledger refresh on the deployed build.
- [x] Owner authorized pushing the local build to the existing public repository at https://github.com/Rahul21sai/LeadNet. Repository visibility is unchanged.
- [ ] Record and upload the real demonstration. Resolve the conflicting duration wording against the current authoritative portal/rules.
- [ ] Add and verify public repository, video and product URLs on final slide 13 (source slide 14). Test without a signed-in browser.
- [ ] Update `status.json`, rebuild to a new revision, inspect all final pages again, and confirm PDF remains below 5 MB.
- [ ] Owner reviews the actual final artifacts and submits through the contest portal.

## Build

Use the bundled Codex Node/Python runtimes; no dependencies are installed by this source. `build-deck.mjs` imports and edits a copy of the supplied template with `@oai/artifact-tool`, renders every slide and calls the presentation finalizer. It never edits the source template.

The `.build/` and `.finalized/` directories hold private intermediates, including a runtime `node_modules` junction. Exclude them from Git staging. Keep the final PPTX/PDF, source script, status and written collateral. Do not use `git add -A`.
