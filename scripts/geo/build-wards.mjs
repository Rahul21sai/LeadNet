#!/usr/bin/env node
// Build LeadNet's ward datasets from the GBA 2025 delimitation KML.
//
//   node scripts/geo/build-wards.mjs \
//     --wards <gba_369_wards_*.kml> --corporations <gba_five_corporations_*.kml> \
//     --zones <gba_zones_*.kml> --mapping <gba_wards_divisions_mapping.csv> \
//     [--assembly <AC map.kml>] [--previous <earlier ward KML, for former names>] \
//     --out-api <apps/api/data/wards.geojson> --out-web <apps/web/public/data> [--tolerance 0.00006]
//
// Output A (API, exact): properties { id, number, name_en, name_kn, zone, corporation, assembly },
//   coordinates 6 dp, rings closed, RFC 7946 winding.
// Output B (web, display): same properties + label point { lx, ly } + optional `aka`
//   (sourced alternate spellings / former names, for search), topology-preserving
//   Douglas–Peucker, 5 dp. Plus corporations.geojson.
//
// Every attribute comes from the source files or the gazette corrigenda listed in
// CORRIGENDA below. Nothing is translated or invented.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseKml } from './kml.mjs';
import { cleanGeometry, labelPoint, pointInPolygonGeom, polygonsOf, round, simplifyTopology, validateGeometry } from './geo.mjs';

/* ---------------- args ---------------- */
const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) {
  if (!argv[i].startsWith('--')) throw new Error(`Unexpected argument ${argv[i]}`);
  opt[argv[i].slice(2)] = argv[i + 1];
}
for (const k of ['wards', 'corporations', 'zones', 'mapping', 'out-api', 'out-web'])
  if (!opt[k]) {
    console.error(`missing --${k}\n` + readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n'));
    process.exit(2);
  }
const TOL = Number(opt.tolerance ?? 0.00006);

/* ---------------- reference data ---------------- */
const CORPS = {
  central: { order: 1, short: 'Central', official: 'Bengaluru Central City Corporation' },
  north: { order: 2, short: 'North', official: 'Bengaluru North City Corporation' },
  east: { order: 3, short: 'East', official: 'Bengaluru East City Corporation' },
  south: { order: 4, short: 'South', official: 'Bengaluru South City Corporation' },
  west: { order: 5, short: 'West', official: 'Bengaluru West City Corporation' },
};
const corpCode = (s) => {
  const c = String(s ?? '').trim().toLowerCase();
  if (!CORPS[c]) throw new Error(`Unknown corporation "${s}"`);
  return c;
};

/**
 * Gazette corrigenda (UDD 289–293 BBS 2025, 01-12-2025) not yet reflected in the
 * source KML. Kannada is set to null because no Unicode Kannada source exists
 * for the new name (the gazette PDF uses a legacy font encoding).
 */
const CORRIGENDA = {
  'east-49': { name_en: 'Doddakannelli Ward', name_kn: null, ref: 'UDD 290 BBS 2025 (01-12-2025): 49 Shivanasamudra Ward → Doddakannelli Ward' },
};

/** Source casing fixes only (no spelling changes): lower-case words are capitalised; "PARK" → "Park". */
function tidyName(name) {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (/^[a-z]/.test(w) ? w[0].toUpperCase() + w.slice(1) : w === 'PARK' ? 'Park' : w))
    .join(' ');
}

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const kannadaShare = (s) => {
  const t = [...String(s ?? '').replace(/[\s\p{P}\p{N}‌‍]/gu, '')];
  return t.length ? t.filter((ch) => /[ಀ-೿]/.test(ch)).length / t.length : 0;
};

function parseCsv(text) {
  const rows = [];
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++;
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') cells.push(cur), (cur = '');
      else cur += ch;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

const read = (p) => readFileSync(p, 'utf8');
const log = (...a) => console.log(...a);
const problems = [];
const notices = [];
const precisionFallbacks = [];

/* ---------------- load ---------------- */
const src = parseKml(read(opt.wards));
const corpFc = parseKml(read(opt.corporations));
const zoneFc = parseKml(read(opt.zones));
const acFc = opt.assembly ? parseKml(read(opt.assembly)) : null;
const prevFc = opt.previous ? parseKml(read(opt.previous)) : null;
const officialFc = opt.official ? JSON.parse(read(opt.official)) : null;
log(`source wards: ${src.features.length} placemarks with polygons (${src.skipped} without)`);

// Mapping CSV: blank Corporation/Zone/Division/Sub-division cells repeat the row above.
const csvRows = parseCsv(read(opt.mapping));
const header = csvRows.shift().map((h) => h.toLowerCase());
const col = (name) => header.findIndex((h) => h.startsWith(name));
const [cCorp, cZone, cNo, cName] = [col('corporation'), col('zone'), col('ward no'), col('ward name')];
const mapping = new Map();
let carry = {};
for (const r of csvRows) {
  if (r[cCorp]) carry.corp = r[cCorp];
  if (r[cZone]) carry.zone = r[cZone];
  const k = `${corpCode(carry.corp)}-${Number(r[cNo])}`;
  if (mapping.has(k)) problems.push(`mapping CSV: duplicate ${k}`);
  mapping.set(k, { zone: carry.zone, name: r[cName] });
}

/* ---------------- wards ---------------- */
const wards = src.features.map((f) => {
  const p = f.properties;
  const corp = corpCode(p.Corporation);
  const number = Number(p.ward_id);
  if (!Number.isInteger(number) || number < 1) throw new Error(`Bad ward number "${p.ward_id}"`);
  const id = `w-${corp}-${number}`;
  const fix = CORRIGENDA[`${corp}-${number}`];
  const nameEn = fix ? fix.name_en : tidyName(p.ward_name ?? '');
  const official = officialFc?.features.find((candidate) =>
    String(candidate.properties.Corporation).toLowerCase() === corp && Number(candidate.properties.ward_id) === number);
  let nameKn = (official?.properties.ward_name_kn ?? (fix ? fix.name_kn : p.ward_name_kn) ?? '').trim() || null;
  if (nameKn && kannadaShare(nameKn) < 0.9) {
    problems.push(`${id}: name_kn "${nameKn}" is not Kannada script — dropped`);
    nameKn = null;
  }
  let exact = cleanGeometry(f.geometry, 6);
  if (exact && validateGeometry(exact).length) {
    for (const dp of [7, 8, 9, 10]) {
      const candidate = cleanGeometry(f.geometry, dp);
      if (candidate && !validateGeometry(candidate).length) {
        exact = candidate;
        precisionFallbacks.push({ id, decimals: dp });
        break;
      }
    }
  }
  if (!exact) throw new Error(`${id}: geometry collapsed`);
  return {
    id,
    corp,
    number,
    srcName: (p.ward_name ?? '').trim(),
    props: {
      id,
      number,
      name_en: nameEn,
      name_kn: nameKn,
      zone: (p.zone_name ?? '').trim() || null,
      corporation: CORPS[corp].official,
      assembly: (p.ac ?? '').trim() || null,
    },
    srcZoneCode: (p.zone ?? '').trim(),
    acNo: Number(p.ac_no),
    exact,
  };
});
wards.sort((a, b) => CORPS[a.corp].order - CORPS[b.corp].order || a.number - b.number);

const ids = new Set();
for (const w of wards) {
  if (ids.has(w.id)) problems.push(`duplicate id ${w.id}`);
  ids.add(w.id);
}

/* ---------------- label points (on exact geometry) ---------------- */
for (const w of wards) {
  const { point, dist } = labelPoint(w.exact, 0.00002);
  w.label = point;
  w.labelClearanceM = Math.round(dist * 111_320);
  if (!pointInPolygonGeom(point[0], point[1], w.exact)) problems.push(`${w.id}: label point outside ward`);
}

/* ---------------- attribute cross-checks ---------------- */
const pipName = (fc, pt, prop) => fc.features.filter((f) => pointInPolygonGeom(pt[0], pt[1], f.geometry)).map((f) => f.properties[prop]);
let zoneCsvOk = 0, zoneKmlOk = 0, corpKmlOk = 0, acOk = 0, acChecked = 0;
const ZONE_ALIASES = { gandhinagar: 'gandhinagara', malleswaram: 'malleshwaram', rajarajeshwarinagara: 'rajarajeshwarinagar' };
const zoneKey = (s) => ZONE_ALIASES[norm(s)] ?? norm(s);
for (const w of wards) {
  const m = mapping.get(`${w.corp}-${w.number}`);
  if (!m) problems.push(`${w.id}: not in mapping CSV`);
  else if (zoneKey(m.zone) === zoneKey(w.props.zone)) zoneCsvOk++;
  else problems.push(`${w.id}: zone "${w.props.zone}" ≠ mapping CSV "${m.zone}"`);

  const zHits = zoneFc.features.filter((f) => pointInPolygonGeom(w.label[0], w.label[1], f.geometry));
  if (zHits.length === 1 && corpCode(zHits[0].properties.Corporatio) === w.corp && zHits[0].properties.Zone === w.srcZoneCode) zoneKmlOk++;
  else notices.push(`${w.id}: zones KML says ${zHits.map((z) => `${z.properties.Corporatio}/${z.properties.Zone}`).join(',') || 'none'}, ward says ${w.corp}/${w.srcZoneCode}; retained ward attribute confirmed by mapping CSV`);

  const cHits = pipName(corpFc, w.label, 'corporatio');
  if (cHits.length === 1 && corpCode(cHits[0]) === w.corp) corpKmlOk++;
  else problems.push(`${w.id}: corporations KML says ${cHits.join(',') || 'none'}`);

  if (acFc) {
    acChecked++;
    const aHits = pipName(acFc, w.label, 'AC_CODE').map(Number);
    if (aHits.length === 1 && aHits[0] === w.acNo) acOk++;
    else problems.push(`${w.id}: AC map says ${aHits.join(',') || 'none'}, ward says ${w.acNo} ${w.props.assembly}`);
  }
}
log(`zone vs mapping CSV: ${zoneCsvOk}/${wards.length}; zone vs zones KML: ${zoneKmlOk}/${wards.length}; corporation vs corporations KML: ${corpKmlOk}/${wards.length}` + (acFc ? `; assembly vs 2018 AC map: ${acOk}/${acChecked}` : ''));

/* ---------------- search aliases (display file only) ---------------- */
for (const w of wards) {
  const aka = [];
  const add = (s) => {
    if (s && norm(s) !== norm(w.props.name_en) && !aka.some((a) => norm(a) === norm(s))) aka.push(tidyName(s));
  };
  if (CORRIGENDA[`${w.corp}-${w.number}`]) add(w.srcName);
  add(mapping.get(`${w.corp}-${w.number}`)?.name);
  if (prevFc) {
    const prev = prevFc.features.find((f) => pointInPolygonGeom(w.label[0], w.label[1], f.geometry));
    if (prev) add(prev.properties.ward_name);
  }
  w.aka = aka;
}

/* ---------------- validate exact geometry ---------------- */
let invalid = 0;
for (const w of wards) {
  const errs = validateGeometry(w.exact);
  if (errs.length) {
    invalid++;
    problems.push(`${w.id} (exact): ${errs.join('; ')}`);
  }
}

/* ---------------- display geometry ---------------- */
const simplified = simplifyTopology(wards.map((w) => w.exact), TOL);
let invalidDisplay = 0;
wards.forEach((w, i) => {
  w.display = cleanGeometry(simplified[i], 5);
  if (validateGeometry(w.display).length) {
    w.display = cleanGeometry(simplified[i], 6);
    notices.push(`${w.id}: display precision retained at 6 decimals to avoid rounding intersections`);
  }
  if (validateGeometry(w.display).length) {
    w.display = w.exact;
    notices.push(`${w.id}: exact geometry retained for display to preserve valid topology`);
  }
  const errs = validateGeometry(w.display);
  if (errs.length) {
    invalidDisplay++;
    problems.push(`${w.id} (display): ${errs.join('; ')}`);
  }
  if (!pointInPolygonGeom(w.label[0], w.label[1], w.display)) problems.push(`${w.id}: label point outside display geometry`);
});

const corpFeatures = corpFc.features.map((f) => {
  const code = corpCode(f.properties.corporatio);
  return { code, exact: cleanGeometry(f.geometry, 6) };
});
const corpSimplified = simplifyTopology(corpFeatures.map((c) => c.exact), TOL * 2);

/* ---------------- write ---------------- */
const meta = {
  source: 'Greater Bengaluru Authority, ward delimitation 2025 (369 wards, notified 19-11-2025, with corrigenda of 01-12-2025), via OpenCity data.opencity.in/dataset/gba-wards-delimitation-2025',
  license: 'Public domain (OpenCity licence field: "Other (Public Domain)")',
  attribution: 'Ward boundaries: Greater Bengaluru Authority (2025 delimitation), via OpenCity',
};
const countVerts = (g) => polygonsOf(g).reduce((s, p) => s + p.reduce((t, r) => t + r.length, 0), 0);

const outA = {
  type: 'FeatureCollection',
  name: 'leadnet_wards_exact',
  ...meta,
  features: wards.map((w) => ({ type: 'Feature', properties: w.props, geometry: w.exact })),
};
const outB = {
  type: 'FeatureCollection',
  name: 'leadnet_wards_display',
  ...meta,
  features: wards.map((w) => ({
    type: 'Feature',
    properties: { ...w.props, lx: round(w.label[0], 5), ly: round(w.label[1], 5), ...(w.aka.length ? { aka: w.aka.join('; ') } : {}) },
    geometry: w.display,
  })),
};
const outC = {
  type: 'FeatureCollection',
  name: 'leadnet_corporations_display',
  source: 'Greater Bengaluru Authority, five city corporations delimitation (Sep 2025), via OpenCity',
  license: meta.license,
  attribution: 'Corporation boundaries: Greater Bengaluru Authority, via OpenCity',
  features: corpFeatures
    .map((c, i) => {
      const sampleWard = wards.find((w) => w.corp === c.code);
      const kn = src.features.find((f) => corpCode(f.properties.Corporation) === c.code)?.properties.corporation_kn?.trim() || null;
      return {
        type: 'Feature',
        properties: { id: c.code, name_en: CORPS[c.code].short, name_kn: kn, official_en: CORPS[c.code].official, wards: wards.filter((w) => w.corp === c.code).length },
        geometry: cleanGeometry(corpSimplified[i], 5),
        _order: CORPS[sampleWard?.corp ?? c.code].order,
      };
    })
    .sort((a, b) => a._order - b._order)
    .map(({ _order, ...f }) => f),
};

mkdirSync(opt['out-web'], { recursive: true });
const wA = JSON.stringify(outA);
const wB = JSON.stringify(outB);
const wC = JSON.stringify(outC);
writeFileSync(opt['out-api'], wA + '\n');
writeFileSync(join(dirname(opt['out-api']), 'ward-labels.json'), JSON.stringify(Object.fromEntries(wards.map((w) => [w.id, { lat: round(w.label[1], 5), lng: round(w.label[0], 5) }]))) + '\n');
writeFileSync(join(opt['out-web'], 'wards.geojson'), wB + '\n');
writeFileSync(join(opt['out-web'], 'corporations.geojson'), wC + '\n');

const vA = wards.reduce((s, w) => s + countVerts(w.exact), 0);
const vB = wards.reduce((s, w) => s + countVerts(w.display), 0);
log(`A ${opt['out-api']}: ${wards.length} features, ${vA} positions, ${(wA.length / 1024).toFixed(0)} KB, invalid ${invalid}`);
log(`B ${join(opt['out-web'], 'wards.geojson')}: ${wards.length} features, ${vB} positions (${((vB / vA) * 100).toFixed(1)}%), ${(wB.length / 1024).toFixed(0)} KB, tolerance ${TOL}°, invalid ${invalidDisplay}`);
log(`C ${join(opt['out-web'], 'corporations.geojson')}: ${outC.features.length} features, ${(wC.length / 1024).toFixed(0)} KB`);
log(`per corporation: ${Object.keys(CORPS).map((c) => `${c} ${wards.filter((w) => w.corp === c).length}`).join(', ')}`);
log(`name_kn present: ${wards.filter((w) => w.props.name_kn).length}/${wards.length}; aka present: ${wards.filter((w) => w.aka.length).length}`);
log(`min label clearance: ${Math.min(...wards.map((w) => w.labelClearanceM))} m`);
log(`precision fallbacks: ${JSON.stringify(precisionFallbacks)}`);
if (notices.length) {
  log(`\n${notices.length} source/simplification notice(s):`);
  for (const n of notices) log(' - ' + n);
}
if (problems.length) {
  log(`\n${problems.length} problem(s):`);
  for (const p of problems) log(' - ' + p);
  process.exitCode = 1;
} else log('no geometry or attribute errors');
