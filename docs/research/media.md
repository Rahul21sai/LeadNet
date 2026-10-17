# Demonstration media provenance

The recovered build left fourteen JPEGs and three MP3s in `apps/web/public/samples`. This continuation recovered source metadata from the previous assets agent's local records, checked current JPEG metadata with `sharp`, and generated [manifest.json](../../apps/web/public/samples/manifest.json) and [CREDITS.md](../../apps/web/public/samples/CREDITS.md). No media was newly downloaded.

Per-file author, licence URL, Commons source, date, dimensions, modifications and SHA-256 remain attached. Photos are **illustrations reused in fictional demo issues**. Replay pins are not photograph coordinates. Some photographs come from other cities/countries; this must stay visible during sample selection and seeded-evidence review.

- `pothole-1`: Bengaluru road, Mallikarjunasj, CC0. `pothole-1-recrop` is a constructed crop preserving the defect, useful for duplicate matching, not a repair claim.
- `pothole-3-before` / `pothole-3-after`: Alan Stanton's Reform Row repair sequence, **Tottenham, London**, 3 August / 23 September 2017, CC BY-SA 2.0. Same street/building context is visible. Viewpoints differ; exact individual-defect correspondence is not guaranteed. This is not a Bengaluru repair.
- `garbage-1` / `garbage-1-closeup`: separate Sahilrathod photographs taken about 90 seconds apart in Bengaluru, CC BY-SA 4.0, showing the same apparent waste pile/cow. The relationship is an evaluation label, not an official incident record.
- `road-elsewhere-1`: Savalanga Road, Shivamogga. Wrong-location negative for the evidence gate.

Fourteen files cover pothole/road damage, garbage, drainage/flooding, footpath obstruction, a fallen tree and a tilting streetlight. Two source originals are CC0; others use CC BY or CC BY-SA 2.0/4.0. Derivatives retain parent licences. Every JPEG is at most 1600 pixels on its longest side and was locally checked to contain no EXIF, XMP or IPTC block. Previous-agent face/plate blur counts are retained in the manifest. This continuation visually inspected the repair comparison; it has not established that every distant person is unidentifiable at every enlargement.

## Synthetic voice

The clips were generated through Google Translate text-to-speech on 17 October 2026 from fictional scripts. They are explicitly `synthetic: true`, not citizen recordings or native-speaker quality benchmarks.

| ID | Language | Duration | Sample rate |
|---|---|---:|---:|
| kn-pothole-mg-road | Kannada | 12.55 s | 24 kHz |
| hi-garbage-kr-market | Hindi | 12.65 s | 24 kHz |
| en-streetlight-indiranagar | English | 15.34 s | 24 kHz |

These static clips intentionally support sample replay. User-recorded voice remains private server-side draft media and must never be copied into public samples or public evidence.

## Reproduce

```powershell
node scripts/geo/build-media.mjs --photo-meta ../LeadNet-raw/media/photo_meta.json --audio-meta ../LeadNet-raw/media/audio_meta.json
```

This validates encoded JPEGs and rebuilds metadata; it does not download, generate speech, invoke AI or write cloud data. The previous session created the derived crop with relative rectangle `[6%,20%,82%,62%]`, then JPEG encoded it. No repaired surface was painted or generated.
