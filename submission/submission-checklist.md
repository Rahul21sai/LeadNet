# Namma Civic submission readiness

This folder is a review package for Namma Civic by Tri-Fusion. The public Vercel prototype at https://lead-net-6639-eta.vercel.app/ was opened successfully in the managed browser and shows a local, device-only demonstration. The owner plans Google Cloud deployment separately; connected cloud services and live model evaluation remain unverified. The contest entry has not been submitted by this package.

The current deliverables are `Namma-Civic-AI-Builder-Cup.pptx` and `Namma-Civic-AI-Builder-Cup.pdf`.

## Prepared locally

- [x] Required template inspected, including all 16 source slides.
- [x] Required content order, dimensions, branding and closing artwork retained. Source download-instruction slide 2 and blank slide 15 are omitted from the final 14-slide deck.
- [x] Registered team name is Tri-Fusion. Slide 1 and `team.json` include Vudumula Naga sai Rahul (Leader), Mohammed Mudasser and Abubakr Siddique M, exactly as supplied. Email addresses are excluded.
- [x] Source citations and data limitations recorded in slide notes.
- [x] Real ward geometry and clearly fictional seed records used for diagrams.
- [x] No fabricated model benchmark or product screenshot.
- [x] Video guidance uses the owner-supplied current requirement of 3-4 minutes. Recording and upload remain pending.
- [x] Brief solution description drafted under the 1,024-character limit.
- [x] Product branding is Namma Civic; the registered team name is Tri-Fusion. Template artwork and repository identity are preserved.
- [x] Final slide 13 includes the existing public repository URL and the accessible Vercel prototype URL. Only the public video URL remains pending.
- [x] Final PPTX and PDF rendered and verified; see `validation-report.json` for the current revision, changed slides, image comparisons and package/layout findings.
- [x] Final PDF is below 5 MB; the exact size is recorded in `validation-report.json`. The PDF uses image pages; the PPTX keeps editable text and diagrams.

## Deferred requirements for a future public submission

- [ ] Fill the exact problem-statement selection on slide 1. Confirm contest eligibility; registered team name and roster are already supplied.
- [ ] Complete the separately planned Google Cloud deployment and account setup, then verify the connected build.
- [ ] Verify deployed Firebase Hosting, Firestore, Storage, Auth and Cloud Run behavior.
- [ ] Run real Vertex Gemini evaluation; record model ID, sample sizes, accuracy and latency. Offline safety checks are not live quality benchmarks.
- [ ] Inspect the actual UI at 390px and 1440px in light/dark with no console errors.
- [ ] Add genuine UI screenshots to final slide 10 (source slide 11); remove its pending-capture notice only after actual capture.
- [ ] Update final slide 11 (source slide 12) with measured live results, or retain truthful pending status.
- [ ] Check PII removal, private citizen audio and published evidence visibility end to end.
- [ ] Check report, duplicate merge, support/follow, officer evidence hold, eligible voting and ledger refresh on the deployed build.
- [x] Owner authorized pushing the local build to the existing public repository at https://github.com/Rahul21sai/LeadNet. Repository visibility is unchanged.
- [ ] Record and upload the real demonstration with the current required duration of 3-4 minutes. No video delivery or public video URL is claimed by this checklist.
- [ ] Add the remaining public video URL on final slide 13 (source slide 14). Recheck all three links without a signed-in browser before submission.
- [ ] Update `status.json`, rebuild to a new revision, inspect all final pages again, and confirm PDF remains below 5 MB.
- [ ] Owner reviews the actual final artifacts and submits through the contest portal.

## Build

Use the bundled Codex Node/Python runtimes; no dependencies are installed by this source. `build-deck.mjs` imports and edits a copy of the supplied template with `@oai/artifact-tool`, renders every slide and calls the presentation finalizer. It never edits the source template.

The `.build/` and `.finalized/` directories hold private intermediates, including a runtime `node_modules` junction. Exclude them from Git staging. Keep the final PPTX/PDF, source script, status and written collateral. Do not use `git add -A`.

## Current video preparation

- [x] Owner-supplied 3–4 minute rule controls; a 215-second English narrated preview is assembled.
- [x] Genuine public Vercel screen captures, source provenance and current Google service boundaries are documented.
- [x] Automated video lint/runtime/layout/motion/contrast checks pass; narration fits all scenes.
- [x] Owner reviewed the assembled preview and approved the final encode.
- [x] Export independently verified: 215 seconds, 1080p, 24 fps, H.264/AAC, 47 passing checks and decoded samples from every scene.
- [ ] Upload the final video and check its public link without sign-in; full real-time pronunciation review is still recommended.
- [ ] Verify working connected Google services and keep the submitted prototype functional throughout evaluation.
