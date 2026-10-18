# Bengaluru ward geography used by Namma Civic

Snapshot: 17 October 2026. Geographic records are real reference data. Issue records, project budgets, people and outcome statistics in the demonstration are fictional.

## Dataset choice and provenance

Use the **final 369-ward, five-corporation GBA delimitation**, not the superseded BBMP 198-, 243-, 225-ward or draft 368-ward maps. OpenCity's metadata describes the November map as notified on 19 November 2025 and the December map as including the 1 December name changes. The selected December source includes ward corporation, zone and assembly attributes. Corporation counts are Central 63, North 72, East 50, South 72, West 112.

| Source | Resource and use |
|---|---|
| [OpenCity GBA Wards Delimitation 2025](https://data.opencity.in/dataset/gba-wards-delimitation-2025) | Dataset metadata licence field: **Other (Public Domain)**. This is the published reuse designation, not a claim that all GBA web content shares that licence. |
| [December final wards KML](https://data.opencity.in/dataset/863209cb-4ced-4f51-b5c5-156939c50922/resource/9013d656-8051-4e2d-9648-46efd0d86d3d/download/gba-369-wards-december-2025.kml) | Primary geometry and administrative attributes. |
| [November final wards KML](https://data.opencity.in/dataset/863209cb-4ced-4f51-b5c5-156939c50922/resource/dbe57ae6-a72f-426e-917b-e55b3b22a87b/download/1c5bbd4e-006c-4130-b278-fd6680fef91b.kml) | Earlier names retained as searchable aliases. |
| [Ward-to-division mapping CSV](https://data.opencity.in/dataset/863209cb-4ced-4f51-b5c5-156939c50922/resource/0b0b7da4-64e8-480c-bc2f-84c4ac86510e/download/gba-wards-divisions-mapping.csv) | Independently cross-checks all 369 ward-to-zone assignments. |
| [Five corporations dataset](https://data.opencity.in/dataset/greater-bengaluru-authority-corporations-delimitation-2025) | Same OpenCity licence field: Other (Public Domain). |
| [September final corporations KML](https://data.opencity.in/dataset/3faa72e4-688f-4896-bfbb-0ee5a848bbd6/resource/06a9389c-8a3d-4a91-bf61-1df0dc7ffa28/download/790f6df1-45dc-4096-b4ed-53a4c3743d58.kml) | Corporation outlines; all 369 ward label points match their named corporation. |
| [Zones KML](https://data.opencity.in/dataset/3faa72e4-688f-4896-bfbb-0ee5a848bbd6/resource/5e7856ef-7a27-4255-80ad-9b62e62aadbf/download/e7ad0eac-7fa9-435f-822d-752be486e726.kml) | Older reference outline; 356/369 label-point matches. It does not overwrite current ward attributes. |
| [Official GBA GeoServer ward layer](https://gisapps.bbmp.gov.in/geoserver/gba_boundary/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=gba_boundary:ward_369_final&outputFormat=application/json&srsName=EPSG:4326) | Prior session downloaded 369 features on 17 October 2026. Source-script Kannada enrichment, including the corrected Doddakannelli name for East 49. Default WMS Fees/AccessConstraints fields say NONE; these are not a standalone copyright licence. |

Local input files and their SHA-256 manifest remain outside the repository in `Downloads/LeadNet-raw/wards/`. They were downloaded in the recovered Claude session. This continuation parsed the existing local files and checked retained metadata; it did not refetch them. `apps/api/data/validation.json` records hashes of shipped outputs.

## Source differences and processing

- Ward numbers repeat between corporations. Stable IDs use `w-<corporation>-<number>`, such as `w-central-25`.
- English names preserve source spelling, with whitespace/casing normalization only. Kannada comes only from source Unicode fields. No place name is machine-translated. Official source Kannada currently exists for all 369 records; missing values remain null.
- East 49 is **Doddakannelli Ward**, replacing Shivanasamudra Ward under the 1 December corrigendum. Its source Kannada is `ದೊಡ್ಡಕನ್ನೆಲ್ಲಿ ವಾರ್ಡ್`. The former name remains a search alias.
- December and official source pairing is retained when older November names/geometries differ in the North corporation. Neighbourhood names and ward names are not interchangeable.
- Older zone outlines disagree for North 20–21, East 28–29, West 78–81 and West 105–109. All 369 ward zone attributes match the mapping CSV. Those attributes are retained and the 13 outline discrepancies are reported.
- Polygon/MultiPolygon parts and holes are preserved; rings are closed with RFC 7946 winding. Tiny retraced tracing/rounding loops of at most eight vertices and less than `1e-9` square degrees (approximately 12 square metres at the equator) are removed. Material ward areas are not replaced.
- API coordinates normally retain six decimals. **Central 5 and North 43 retain seven**, because six-decimal rounding creates intersections. These cleaned source polygons are not a cadastral survey product.
- Shared-arc Douglas–Peucker display simplification uses tolerance `0.00006` degrees and five decimals. Shared arcs simplify once. Largest ward area change: **0.9872%**. Assignment uses API polygons.
- Interior label points use a polylabel-style search. Every rounded label stays inside both API and display geometry. API consumers use `ward-labels.json`; averaging boundary vertices is unsafe.

## Built output

| File | Purpose | Records | Bytes |
|---|---|---:|---:|
| `apps/api/data/wards.geojson` | API assignment polygons | 369 | 2,007,710 |
| `apps/api/data/ward-labels.json` | Representative `{lat,lng}` by ward ID | 369 | generated lookup |
| `apps/web/public/data/wards.geojson` | Display polygons with `lx/ly` | 369 | 527,619 |
| `apps/web/public/data/corporations.geojson` | Corporation outlines | 5 | 64,298 |
| `apps/api/data/validation.json` | Counts, checks, lookups and hashes | — | generated report |

Ward properties: `{ id, number, name_en, name_kn, zone, corporation, assembly }`. Display properties add `{ lx, ly }` and optional `aka` (semicolon-delimited sourced aliases). `corporation` is the full official English label. API labels are `{ [wardId]: { lat, lng } }`.

Attribution: **Ward boundaries: Greater Bengaluru Authority (2025 delimitation), via OpenCity.** Tiles need their own provider/OpenStreetMap attribution. Namma Civic is an independent prototype; GBA endorsement is not implied.

## Landmark checks

All twelve points hit exactly one API ward. These are point tests, not claims that entire neighbourhoods belong to one ward.

| Point | Latitude | Longitude | Ward ID | Source name |
|---|---:|---:|---|---|
| MG Road | 12.9756 | 77.6066 | w-central-25 | Ashokanagar |
| Koramangala | 12.9352 | 77.6245 | w-south-28 | Kormangala East |
| Indiranagar | 12.9784 | 77.6408 | w-central-9 | Hoysala Nagara Central |
| Jayanagar | 12.9250 | 77.5938 | w-south-8 | Tilak Nagara |
| Whitefield | 12.9698 | 77.7500 | w-east-39 | Hagaduru |
| Yelahanka | 13.1007 | 77.5963 | w-north-1 | Raja Kempegowda Ward |
| Malleshwaram | 13.0031 | 77.5643 | w-west-53 | Malleshwaram |
| HSR Layout | 12.9116 | 77.6473 | w-south-71 | Agara |
| Hebbal | 13.0358 | 77.5970 | w-north-56 | Hebbal |
| KR Market | 12.9634 | 77.5770 | w-central-34 | D.V Gundappa Ward |
| BTM Layout | 12.9166 | 77.6101 | w-south-19 | New Tavarekere |
| Rajajinagar | 12.9937 | 77.5544 | w-west-63 | Rajajinagara |

## Reproduce and verify

```powershell
node scripts/geo/build-wards.mjs --wards ../LeadNet-raw/wards/gba_369_wards_dec2025_with_population.kml --corporations ../LeadNet-raw/wards/gba_five_corporations_sep2025.kml --zones ../LeadNet-raw/wards/gba_zones_2025.kml --mapping ../LeadNet-raw/wards/gba_wards_divisions_mapping.csv --official ../LeadNet-raw/wards/official/gba_geoserver_ward_369_final.geojson --previous ../LeadNet-raw/wards/gba_369_wards_nov2025_final.kml --out-api apps/api/data/wards.geojson --out-web apps/web/public/data
node --test scripts/geo/geo.test.mjs
node scripts/geo/validate.mjs
```

Checks cover polygon structure, intersections, winding, holes, bounds, unique IDs, corporation totals, interior labels, simplification area delta and landmark uniqueness. They do not establish legal accuracy or prove absence of inter-ward gaps/overlaps everywhere. Unknown points must remain unassigned.
