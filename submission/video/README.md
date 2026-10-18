# Namma Civic video — Tri-Fusion

Final revised export: **3:35**, 1920×1080 at 24 fps, English synthetic narration and phrase captions. This updates the same eight-scene film for the selected theme and current Firebase facts. The owner authorized re-export. The revised MP4 passed 47 automated checks plus decoded-frame review; no material rendering defects were observed. File: `output/Namma-Civic-Tri-Fusion-Demo.mp4` (26,207,038 bytes). The editable HyperFrames composition is retained.

Selected theme: **Sustainability & Social Impact**. Residents struggle to turn everyday civic problems into actionable reports and track whether a fix happened. Namma Civic brings accessible local reporting, community discussion, evidence-backed responses and citizen verification into one public record. This addresses the challenge's focus on supporting communities and informed decision-making; no measured societal impact is claimed.

Current public demonstration: https://leadnet-blr.web.app/. The static frontend was deployed to Firebase Hosting on the Spark plan and verified on **18 October 2026**, as recorded in `../status.json`. Posts and interactions remain device-only. The connected backend, Cloud Run, Firestore, Cloud Storage and Vertex AI/Gemini remain undeployed and unverified.

The eight scenes cover the problem, product, composer and People screens, fictional evidence/verification records, integration architecture, pilot and team. The stills are genuine captures taken on **18 October 2026** from the earlier Vercel demonstration at https://lead-net-6639-eta.vercel.app/; their source URLs remain in the capture manifests. This is a narrated screen walkthrough. Successful post creation, connection sending, citizen voting and live Gemini generation were not verified by browser input in that capture session.

## Review and export

From this directory, with the approved local dependencies already installed:

```powershell
node .\build-video.mjs
node .\hf.mjs check --snapshots
node .\hf.mjs play --port 4569
```

Review the lightweight player at http://localhost:4569 and unmute it for narration. On this Windows host Studio became unresponsive; the official lightweight player served the previous composition and audio successfully. Re-export of this revision is authorized; inspect the revised preview and output:

```powershell
node .\hf.mjs render --workers 1 --fps 24 --quality looks --output output/Namma-Civic-Tri-Fusion-Demo.mp4
```

The wrapper disables telemetry and exposes the approved local FFmpeg runtime. It does not use a paid provider or cloud rendering. The toolchain is pinned independently of the application workspaces; provenance is in `tooling-provenance.json`. A low-memory host requires one worker. Optional voice/music/transcription models and Docker are absent and are unnecessary for this composition.

Regenerate narration with `& .\narrate.ps1` in the existing pwsh host on Windows; older Windows PowerShell can expose a different voice list. It uses Microsoft Mark through local System.Speech, measures each WAV and raises speaking rate only when needed to fit the scene. WAVs and encoded videos are local generated artifacts and are ignored by Git. The eight measured tracks fit their scene windows. Caption phrase times are estimated from those measured durations and need a listening review in Studio.

The revised MP4 was checked with FFprobe: 215 seconds, 5,160 decoded frames, H.264 video and AAC narration. All eight narration regions are audible with no clipped samples. Twenty-four decoded start/mid/end frames and all eight full-size midpoint images were reviewed, including a separate parent review of changed scenes 02/06/08. No material rendering defects were observed. This was a sampled review, not end-to-end real-time playback or independent transcription. Current proof, SHA-256 and source-hash relationships are in `validation-report.json` and `output/final-review/`. No public video URL or contest submission is created by this source.

## Source and credits

- `../video-script.md`: narration and shot instructions.
- `../video-notes/scene-plan.json`: canonical scene timing/text.
- `../video-notes/capture-evidence.md`: genuine capture provenance and limits.
- `assets/captures/manifest.json`: capture hashes, source URLs and timestamps.
- `assets/captures/derived-manifest.json`: unaltered-content composer detail crops.
- `MEDIA-CREDITS.md`: image licenses and vendor artwork sources. Copy its attribution into the public video description.
- Inter Variable is provided under the bundled OFL license in `assets/INTER-LICENSE.txt`. EB Garamond is resolved by the video compiler from Google Fonts and embedded at build time.

The team is Tri-Fusion: Vudumula Naga sai Rahul (Leader), Mohammed Mudasser and Abubakr Siddique M. Email addresses are deliberately excluded.
