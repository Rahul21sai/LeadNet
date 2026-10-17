import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { cleanGeometry, pointInPolygonGeom, polygonsOf, signedArea, validateGeometry } from './geo.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const exact = read('apps/api/data/wards.geojson');
const display = read('apps/web/public/data/wards.geojson');
const corporations = read('apps/web/public/data/corporations.geojson');
const labels = read('apps/api/data/ward-labels.json');
const area = (g) => polygonsOf(g).reduce((sum, poly) => sum + Math.abs(signedArea(poly[0])) - poly.slice(1).reduce((holes, ring) => holes + Math.abs(signedArea(ring)), 0), 0);
const expected = { central: 63, north: 72, east: 50, south: 72, west: 112 };
assert.equal(exact.features.length, 369);
assert.equal(display.features.length, 369);
assert.equal(corporations.features.length, 5);
assert.equal(new Set(exact.features.map((f) => f.properties.id)).size, 369);
assert.equal(Object.keys(labels).length, 369);
let maxAreaChangePercent = 0;
for (const [corp, count] of Object.entries(expected)) {
  assert.equal(exact.features.filter((f) => f.properties.id.startsWith(`w-${corp}-`)).length, count);
}
for (const [index, feature] of exact.features.entries()) {
  const rendered = display.features[index];
  assert.equal(rendered.properties.id, feature.properties.id);
  assert.deepEqual(validateGeometry(feature.geometry), [], feature.properties.id);
  assert.deepEqual(validateGeometry(rendered.geometry), [], `${feature.properties.id} display`);
  const { lx, ly, name_en, name_kn } = rendered.properties;
  assert.ok(name_en && typeof name_en === 'string');
  assert.ok(name_kn === null || /[\u0c80-\u0cff]/u.test(name_kn));
  assert.ok(pointInPolygonGeom(lx, ly, feature.geometry), `${feature.properties.id} exact label`);
  assert.ok(pointInPolygonGeom(lx, ly, rendered.geometry), `${feature.properties.id} display label`);
  assert.deepEqual(labels[feature.properties.id], { lat: ly, lng: lx });
  const delta = Math.abs(area(rendered.geometry) - area(feature.geometry)) / area(feature.geometry) * 100;
  maxAreaChangePercent = Math.max(maxAreaChangePercent, delta);
  assert.ok(delta < 2, `${feature.properties.id}: display changed area ${delta}%`);
}
for (const feature of corporations.features) assert.deepEqual(validateGeometry(feature.geometry), [], feature.properties.id);
const landmarks = [
  ['MG Road', 12.9756, 77.6066], ['Koramangala', 12.9352, 77.6245],
  ['Indiranagar', 12.9784, 77.6408], ['Jayanagar', 12.925, 77.5938],
  ['Whitefield', 12.9698, 77.75], ['Yelahanka', 13.1007, 77.5963],
  ['Malleshwaram', 13.0031, 77.5643], ['HSR Layout', 12.9116, 77.6473],
  ['Hebbal', 13.0358, 77.597], ['KR Market', 12.9634, 77.577],
  ['BTM Layout', 12.9166, 77.6101], ['Rajajinagar', 12.9937, 77.5544],
].map(([place, lat, lng]) => {
  const hits = exact.features.filter((f) => pointInPolygonGeom(lng, lat, f.geometry));
  assert.equal(hits.length, 1, `${place}: expected exactly one ward`);
  return { place, lat, lng, wardId: hits[0].properties.id, ward: hits[0].properties.name_en, corporation: hits[0].properties.corporation };
});
const files = ['apps/api/data/wards.geojson', 'apps/api/data/ward-labels.json', 'apps/web/public/data/wards.geojson', 'apps/web/public/data/corporations.geojson'].map((path) => ({
  path, bytes: statSync(resolve(root, path)).size,
  sha256: createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex'),
}));
const report = { wards: 369, corporations: 5, byCorporation: expected, invalidGeometries: 0, labelPointsOutside: 0,
  nameKnPresent: exact.features.filter((f) => f.properties.name_kn).length,
  maxDisplayAreaChangePercent: Number(maxAreaChangePercent.toFixed(4)), landmarks, files };
writeFileSync(resolve(root, 'apps/api/data/validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
