# Namma Civic submission readiness

This folder is a review package for Namma Civic by Tri-Fusion, selected challenge **Sustainability & Social Impact**. The frontend is live on Firebase Hosting Spark at https://leadnet-blr.web.app/, verified by HTTP and rendered browser checks. This remains a device-only demonstration: the connected backend and live Gemini are unavailable. Billing remains disabled. The contest entry has not been submitted by this package.

The revised deliverables are `Namma-Civic-AI-Builder-Cup-updated.pptx` and `Namma-Civic-AI-Builder-Cup.pdf`. The original PPTX is open in PowerPoint, so it and its Office lock file are preserved.

## Prepared locally

- [x] Required template inspected, including all 16 source slides.
- [x] Required content order, dimensions, branding and closing artwork retained. Source download-instruction slide 2 and blank slide 15 are omitted from the final 14-slide deck.
- [x] Registered team name is Tri-Fusion. Slide 1 and `team.json` include Vudumula Naga sai Rahul (Leader), Mohammed Mudasser and Abubakr Siddique M, exactly as supplied. Email addresses are excluded.
- [x] Source citations and data limitations recorded in slide notes.
- [x] Real ward geometry and clearly fictional seed records used for diagrams.
- [x] No fabricated model benchmark or product screenshot.
- [x] Video guidance uses the owner-supplied current requirement of 3-4 minutes. The revised Firebase/theme MP4 was exported and independently verified at 215 seconds. Public upload remains pending.
- [x] Brief solution description drafted under the 1,024-character limit.
- [x] Product branding is Namma Civic; the registered team name is Tri-Fusion. Template artwork and repository identity are preserved.
- [x] Final slide 13 includes the public repository and Firebase prototype URLs. The PDF has clickable link annotations. Only the public video URL remains pending.
- [x] Final PPTX and PDF rendered and verified; see `validation-report.json` for the current revision, changed slides, image comparisons and package/layout findings.
- [x] Final PDF is below 5 MB; the exact size is recorded in `validation-report.json`. The PDF uses image pages; the PPTX keeps editable text and diagrams.

## Deferred requirements for a future public submission

- [x] Select Sustainability & Social Impact in the materials and record the project-specific problem statement in `team.json` and `problem-statement.md`.
- [ ] Confirm this theme is selectable in the actual portal and confirm contest eligibility; no portal selection has been changed.
- [x] Deploy and verify the frontend on Firebase Hosting Spark without billing/card.
- [ ] If authorized later, deploy and verify the connected backend, Firestore, Storage, Auth and Cloud Run behavior. The current no-billing choice remains in force.
- [ ] Provide genuine Google AI model or eligible agentic-platform use evidence, as required by the supplied rules. Hosting alone does not establish compliance.
- [ ] Run real Vertex Gemini evaluation; record model ID, sample sizes, accuracy and latency. Offline safety checks are not live quality benchmarks.
- [x] Smoke-check public Community, People, map, issue and ledger at 390px and 1440px in both themes; captured browser error logs were empty. Full feature validation remains separate.
- [ ] Add genuine UI screenshots to final slide 10 (source slide 11); remove its pending-capture notice only after actual capture.
- [ ] Update final slide 11 (source slide 12) with measured live results, or retain truthful pending status.
- [ ] Check PII removal, private citizen audio and published evidence visibility end to end.
- [ ] Check report, duplicate merge, support/follow, officer evidence hold, eligible voting and ledger refresh on the deployed build.
- [x] Owner authorized pushing the local build to the existing public repository at https://github.com/Rahul21sai/LeadNet. Repository visibility is unchanged.
- [x] Export a 3:35 narrated walkthrough using genuine captured UI states; no successful live AI or connected mutation is claimed.
- [x] Complete and verify the requested Firebase-link/theme revision: the actual MP4 passed 47 checks and decoded-frame review, and the 14-page PDF passed structural, link and visual checks.
- [ ] Upload the revised video and obtain an accessible public video URL.
- [ ] Add the remaining public video URL on final slide 13 (source slide 14). Recheck all three links without a signed-in browser before submission.
- [ ] Update `status.json`, rebuild to a new revision, inspect all final pages again, and confirm PDF remains below 5 MB.
- [ ] Owner reviews the actual final artifacts and submits through the contest portal.

## Build

Use the bundled Codex Node/Python runtimes; no dependencies are installed by this source. `build-deck.mjs` imports and edits a copy of the supplied template with `@oai/artifact-tool`, renders every slide and calls the presentation finalizer. It never edits the source template.

The current artifact-tool renderer reports exit 1 during teardown after completing valid outputs. A minimal one-slide render reproduces it without an application exception or error stderr; module import alone exits 0. No forced-success override was added. Independent artifact validation exits 0 and checks the delivered v5 hashes; details are in `validation-report.json`. Do not describe the builder process itself as a passing command.

The `.build/` and `.finalized/` directories hold private intermediates, including a runtime `node_modules` junction. Exclude them from Git staging. Keep the final PPTX/PDF, source script, status and written collateral. Do not use `git add -A`.

## Current video preparation

- [x] Owner-supplied 3–4 minute rule controls; a 215-second English narrated preview is assembled.
- [x] Genuine public Vercel screen capture provenance is preserved. The current public prototype link is Firebase Hosting; screenshot provenance is not relabelled.
- [x] Automated video lint/runtime/layout/motion/contrast checks pass; narration fits all scenes.
- [x] Owner approved the initial narrated preview/encode and then requested the Firebase-link/theme revision; that edit and local re-export authorization were reused.
- [x] Revised export independently verified: 215 seconds, 1080p, 24 fps, H.264/AAC, 47 passing checks and decoded samples from every scene. Theme, current service status and Firebase closing URL were also reviewed at full size.
- [ ] Upload the final video and check its public link without sign-in; full real-time pronunciation review is still recommended.
- [ ] Verify working connected Google services and keep the submitted prototype functional throughout evaluation.
