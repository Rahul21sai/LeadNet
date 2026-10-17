import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSpatialGeometry, type WardFeature } from '../src/components/spatial/geometry.ts';

const rectangle = (left: number, bottom: number, right: number, top: number) => [
  [left, bottom], [right, bottom], [right, top], [left, top], [left, bottom],
];

const feature = (geometry: WardFeature['geometry'], properties = {}): WardFeature => ({
  type: 'Feature',
  properties: { id: 'ward-1', name_en: 'Test ward', name_kn: 'ವಾರ್ಡ್', corporation: 'Test corporation', lx: 0.5, ly: 0.5, ...properties },
  geometry,
});

const collection = (...features: WardFeature[]) => ({ type: 'FeatureCollection', features });

describe('spatial ward geometry', () => {
  it('fits the city centrally with north upward and geographic aspect correction', () => {
    const model = buildSpatialGeometry(collection(feature({ type: 'Polygon', coordinates: [rectangle(0, 59, 2, 61)] }, { lx: 1, ly: 60 })));
    const southWest = model.project(0, 59);
    const northEast = model.project(2, 61);

    expect(model.viewBox).toBe('0 0 1000 1000');
    expect(model.width).toBe(1000);
    expect(model.height).toBe(1000);
    expect(southWest.x).toBeCloseTo(285);
    expect(southWest.y).toBeCloseTo(930);
    expect(northEast.x).toBeCloseTo(715);
    expect(northEast.y).toBeCloseTo(70);
    expect(model.wards[0]!.label).toEqual({ x: 500, y: 500 });
  });

  it('retains every exterior and hole as a closed subpath for evenodd fill', () => {
    const model = buildSpatialGeometry(collection(feature({ type: 'MultiPolygon', coordinates: [
      [rectangle(0, 0, 4, 4), rectangle(1, 1, 3, 3)],
      [rectangle(6, 0, 7, 1)],
    ] }, { lx: 0.5, ly: 0.5 })));
    const ward = model.wards[0]!;

    expect(ward.path.match(/M/g)).toHaveLength(3);
    expect(ward.path.match(/Z/g)).toHaveLength(3);
    expect(ward.path.match(/L/g)).toHaveLength(12);
    expect(ward.path).not.toMatch(/NaN|Infinity/);
    const projectedWidth = model.project(7, 0).x - model.project(0, 0).x;
    const projectedHeight = model.project(0, 1).y - model.project(0, 0).y;
    expect(ward.area).toBeCloseTo((13 / 7) * projectedWidth * Math.abs(projectedHeight));
  });

  it('uses the supplied interior label point and preserves bilingual ward identity', () => {
    const model = buildSpatialGeometry(collection(feature({ type: 'Polygon', coordinates: [rectangle(0, 0, 4, 4)] }, { lx: 1, ly: 3 })));
    expect(model.wards[0]).toMatchObject({ id: 'ward-1', name: 'Test ward', kn: 'ವಾರ್ಡ್', corporation: 'Test corporation', label: model.project(1, 3) });
  });

  it('places a missing label inside the ward instead of inside its central hole', () => {
    const model = buildSpatialGeometry(collection(feature({ type: 'Polygon', coordinates: [rectangle(0, 0, 4, 4), rectangle(1, 1, 3, 3)] }, { lx: undefined, ly: undefined })));
    const label = model.wards[0]!.label;
    expect(label.y).toBe(500);
    expect(label.x).toBeGreaterThan(model.project(0, 2).x);
    expect(label.x).toBeLessThan(model.project(4, 2).x);
    expect(label.x < model.project(1, 2).x || label.x > model.project(3, 2).x).toBe(true);
  });

  it('rejects missing or empty ward collections with a useful error', () => {
    for (const input of [null, {}, { type: 'FeatureCollection', features: [] }]) {
      expect(() => buildSpatialGeometry(input)).toThrow(/ward.*collection|collection.*ward/i);
    }
  });

  it('rejects malformed rings and non-finite coordinates before generating SVG', () => {
    for (const coordinates of [[], [[]], [[[0, 0], [1, 0], [1, 1], [Number.NaN, 0]]], [[[0, 0], [1, 0], [1, 1], [0, 1]]]]) {
      expect(() => buildSpatialGeometry(collection(feature({ type: 'Polygon', coordinates })))).toThrow(/ward-1.*(ring|coordinate|polygon)/i);
    }
  });

  it('rejects zero-area geometry and non-finite projection inputs', () => {
    expect(() => buildSpatialGeometry(collection(feature({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [2, 0], [0, 0]]] })))).toThrow(/area|bounds/i);
    const model = buildSpatialGeometry(collection(feature({ type: 'Polygon', coordinates: [rectangle(0, 0, 1, 1)] })));
    expect(() => model.project(Number.POSITIVE_INFINITY, 0)).toThrow(/coordinate/i);
  });

  it('projects all 369 bundled wards and retains the source polygon and hole count', () => {
    const source = JSON.parse(readFileSync(new URL('../public/data/wards.geojson', import.meta.url), 'utf8')) as { features: WardFeature[] };
    const model = buildSpatialGeometry(source);
    expect(model.wards).toHaveLength(369);
    expect(new Set(model.wards.map((ward) => ward.id)).size).toBe(369);
    expect(model.wards.reduce((count, ward) => count + (ward.path.match(/M/g)?.length ?? 0), 0)).toBe(375);
    expect(model.wards.every((ward) => ward.area > 0 && Number.isFinite(ward.area))).toBe(true);
    expect(model.wards.every((ward) => ward.label.x >= 70 && ward.label.x <= 930 && ward.label.y >= 70 && ward.label.y <= 930)).toBe(true);
    expect(model.wards.map((ward) => ward.id)).toEqual(source.features.map((ward) => ward.properties.id));
  });
});
