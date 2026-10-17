# Ward boundary and demo data

`wards.geojson` contains the real final GBA 369-ward dataset: Central 63, North 72, East 50, South 72, West 112. Source: GBA December 2025 KML via OpenCity, with source-script Kannada checks from the official GBA GeoServer snapshot. OpenCity marks the selected dataset **Other (Public Domain)**.

Properties: `{ id, number, name_en, name_kn, zone, corporation, assembly }`. Stable IDs are corporation-aware (`w-central-25`). `ward-labels.json` provides validated interior points as `{ [wardId]: { lat, lng } }`. `lx/ly` are display-only properties.

Attribution: **Ward boundaries: Greater Bengaluru Authority (2025 delimitation), via OpenCity.**

See [sources, differences, landmark lookups and reproduction](../../../docs/research/wards.md). `validation.json` records checks and hashes. Run `node scripts/geo/validate.mjs` from the repo root after rebuilding geometry.

`demo-city.json` and `demo-seed-summary.json` come from `npm run seed -w @leadnet/api -- --dry-run`. Fixed IDs, PRNG seed and reference time (2026-10-17T08:00Z) make output deterministic. `--now <ISO timestamp>` changes the reference time explicitly. All 200 histories, reports, supports, votes, six people and eight project budgets/outcomes are fictional. Issue positions lie within their real ward polygons. Shared code computes priorities, SLAs, quorums and metrics; event replay validates transitions.

The default dry run calls no Firestore, Storage, Gemini or Auth service. Explicit `--apply` writes to the configured project and uploads licensed photo illustrations under canonical evidence paths. It never uploads audio. `--reset` requires `--apply` and deletes only `isDemo` records with `demo-` IDs. Existing citizen issues remain in the recomputed live ledger.

Applying over existing seed issue IDs is refused unless `--reset` is explicit, so a routine rerun cannot overwrite subsequent citizen interactions. `sample-media.json` contains original-byte SHA-256 fingerprints for the known illustrative samples; the API can detect them before image re-encoding and preserve the demo label independently of user-entered text.
