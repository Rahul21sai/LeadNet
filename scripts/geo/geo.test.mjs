import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanGeometry, pointInPolygonGeom, validateGeometry, simplifyTopology } from './geo.mjs';
import { parseKml } from './kml.mjs';

test('KML parses namespaced polygons, multiple parts and interior holes without evaluating source', () => {
  const result = parseKml(`<kml:kml><Placemark><name>A &amp; B</name><ExtendedData><Data name="ward_name_kn"><value>ವಾರ್ಡ್</value></Data></ExtendedData><MultiGeometry><Polygon><outerBoundaryIs><LinearRing><coordinates>77.5,12.9 77.6,12.9 77.6,13 77.5,13 77.5,12.9</coordinates></LinearRing></outerBoundaryIs><innerBoundaryIs><LinearRing><coordinates>77.52,12.92 77.52,12.93 77.53,12.93 77.53,12.92 77.52,12.92</coordinates></LinearRing></innerBoundaryIs></Polygon><Polygon><outerBoundaryIs><LinearRing><coordinates>77.7,12.9 77.71,12.9 77.71,12.91 77.7,12.9</coordinates></LinearRing></outerBoundaryIs></Polygon></MultiGeometry></Placemark></kml:kml>`);
  assert.equal(result.features[0].properties.name, 'A & B');
  const geometry = cleanGeometry(result.features[0].geometry, 6);
  assert.deepEqual(validateGeometry(geometry), []);
  assert.equal(pointInPolygonGeom(77.525, 12.925, geometry), false);
  assert.equal(pointInPolygonGeom(77.55, 12.95, geometry), true);
});

test('coordinate normalization removes tiny retraced spikes but retains material polygon area', () => {
  const geometry = cleanGeometry({ type: 'Polygon', coordinates: [[[77.5, 12.9], [77.6, 12.9], [77.600001, 12.9], [77.6, 12.9], [77.6, 13], [77.5, 13], [77.5, 12.9]]] }, 6);
  assert.deepEqual(validateGeometry(geometry), []);
  assert.equal(pointInPolygonGeom(77.55, 12.95, geometry), true);
  assert.equal(geometry.coordinates[0].length, 5);
});

test('topological simplification retains the shared boundary between adjacent wards', () => {
  const a = { type: 'Polygon', coordinates: [[[77.5, 12.9], [77.55, 12.9], [77.550001, 12.95], [77.55, 13], [77.5, 13], [77.5, 12.9]]] };
  const b = { type: 'Polygon', coordinates: [[[77.55, 12.9], [77.6, 12.9], [77.6, 13], [77.55, 13], [77.550001, 12.95], [77.55, 12.9]]] };
  const simplified = simplifyTopology([a, b], 0.00006).map((g) => cleanGeometry(g, 6));
  for (const g of simplified) assert.deepEqual(validateGeometry(g), []);
  const border = (g) => g.coordinates[0].filter(([lng]) => Math.abs(lng - 77.55) < 0.001).map((p) => p.join(',')).sort();
  assert.deepEqual([...new Set(border(simplified[0]))], [...new Set(border(simplified[1]))]);
});
