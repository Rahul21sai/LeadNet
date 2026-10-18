# Namma Civic video — Tri-Fusion

Final export: **3:35**, 1920×1080 at 24 fps, English synthetic narration and phrase captions. The owner approved the narrated preview; the MP4 was exported and passed 47 checks plus decoded-frame review. File: `output/Namma-Civic-Tri-Fusion-Demo.mp4` (26,157,705 bytes). The editable HyperFrames composition is retained.

The eight scenes cover the problem, product, actual deployed composer and People screens, fictional evidence/verification records, Google architecture, pilot and team. Screens are genuine captures of the owner-provided Vercel URL. This is a narrated screen walkthrough, not a recording of successful post creation, connection sending, citizen voting or live Gemini generation. Those actions were not verified by browser input in this session. The connected service architecture is explicitly distinguished from the device-only public preview.

## Review and export

From this directory, with the approved local dependencies already installed:

```powershell
node .\build-video.mjs
node .\hf.mjs check --snapshots
node .\hf.mjs play --port 4569
```

Review the lightweight player at http://localhost:4569 and unmute it for narration. On this Windows host Studio became unresponsive; the official lightweight player served the full composition and audio successfully. The current version was approved for final encoding. Review later revisions before re-exporting:

```powershell
node .\hf.mjs render --workers 1 --fps 24 --quality looks --output output/Namma-Civic-Tri-Fusion-Demo.mp4
```

The wrapper disables telemetry and exposes the approved local FFmpeg runtime. It does not use a paid provider or cloud rendering. The toolchain is pinned independently of the application workspaces; provenance is in `tooling-provenance.json`. A low-memory host requires one worker. Optional voice/music/transcription models and Docker are absent and are unnecessary for this composition.

Regenerate narration with `& .\narrate.ps1` on Windows. It uses Microsoft Mark through local System.Speech, measures each WAV and raises speaking rate only when needed to fit the scene. WAVs and encoded videos are local generated artifacts and are ignored by Git. The eight measured tracks fit their scene windows. Caption phrase times are estimated from those measured durations and need a listening review in Studio.

The final MP4 was checked with FFprobe: 215 seconds, 5,160 decoded frames, H.264 video and AAC narration. All eight narration regions are audible and contain no clipped samples. Twenty-four decoded start/mid/end frames and eight full-size midpoint images were reviewed. The export has not been played end to end in real time or independently transcribed. No public video URL or contest submission is created by this source.

## Source and credits

- `../video-script.md`: narration and shot instructions.
- `../video-notes/scene-plan.json`: canonical scene timing/text.
- `../video-notes/capture-evidence.md`: genuine capture provenance and limits.
- `assets/captures/manifest.json`: capture hashes, source URLs and timestamps.
- `assets/captures/derived-manifest.json`: unaltered-content composer detail crops.
- `MEDIA-CREDITS.md`: image licenses and vendor artwork sources. Copy its attribution into the public video description.
- Inter Variable is provided under the bundled OFL license in `assets/INTER-LICENSE.txt`. EB Garamond is resolved by the video compiler from Google Fonts and embedded at build time.

The team is Tri-Fusion: Vudumula Naga sai Rahul (Leader), Mohammed Mudasser and Abubakr Siddique M. Email addresses are deliberately excluded.
