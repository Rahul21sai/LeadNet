# LeadNet Google Cloud architecture

- `leadnet-google-cloud-architecture.svg`: self-contained editable vector diagram, 2560 × 1440.
- `leadnet-google-cloud-architecture.png`: presentation export, 3840 × 2160.
- `leadnet-google-cloud-preview.png`: compact 1600 × 900 preview.

The connected Google Cloud/Firebase boundary shows implemented source architecture, with cloud deployment explicitly unverified. The Vercel static demo configuration is shown separately with fictional fixtures and browser-only state. Shared policy code is inside the application runtime, not represented as another deployed service. The optional FFmpeg video runtime remains unverified.

## Official icon sources

Retrieved 18 October 2026 from vendor-provided downloads:

| Local artwork | Official source |
|---|---|
| Cloud Run, Cloud Storage, Vertex AI | [Google Cloud core product icons](https://services.google.com/fh/files/misc/core-products-icons.zip) |
| Firestore | [Google Cloud legacy product icons](https://services.google.com/fh/files/misc/google-cloud-legacy-icons.zip) |
| Firebase Hosting, Authentication | [Firebase brand assets](https://firebase.google.com/static/downloads/brand-guidelines/firebase-brand-assets.zip) |

Source pages: [Google Cloud icon library](https://cloud.google.com/icons) and [Firebase brand guidelines](https://firebase.google.com/brand-guidelines). Product artwork remains Google's trademarked artwork and is used to identify architectural components. Original asset files are preserved in `assets/`; embedded copies retain their paths, colours and proportions, with identifiers namespaced to prevent SVG collisions. This diagram does not imply Google endorsement.

## Regenerate

Generate the SVG with Python 3:

```text
python docs/diagrams/build_architecture.py
```

The PNG was rendered with the repository's existing `sharp` package (librsvg), without a browser or new dependency. From the repository root:

```javascript
const sharp = require('sharp');
(async () => {
  await sharp('docs/diagrams/leadnet-google-cloud-architecture.svg', { density: 108 })
    .png().toFile('docs/diagrams/leadnet-google-cloud-architecture.png');
  await sharp('docs/diagrams/leadnet-google-cloud-architecture.svg')
    .resize(1600, 900).png().toFile('docs/diagrams/leadnet-google-cloud-preview.png');
})().catch(console.error);
```

Both exports were visually inspected. XML parsing, unique IDs and image dimensions were checked. This is validation of the generated diagram only, not rendered application QA or cloud deployment verification.
