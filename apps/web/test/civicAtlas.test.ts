import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import type { IssueDoc } from '@leadnet/shared';
import { buildCivicAtlas, civicAtlasStyle, civicBounds, civicIssueGeo, type WardCollection } from '../src/components/map/civicAtlas.ts';
import { refreshCivicCluster } from '../src/components/map/clusterSnapshot.ts';

const boundaries = JSON.parse(readFileSync(new URL('../public/data/wards.geojson', import.meta.url), 'utf8')) as WardCollection;
const demo = JSON.parse(readFileSync(new URL('../public/data/demo-city.json', import.meta.url), 'utf8')) as { issues: IssueDoc[] };
const color = () => 'rgb(60, 70, 80)';

describe('bundled civic atlas', () => {
  it('creates a complete renderable MapLibre style without a remote tile, style, glyph or sprite service', () => {
    const style = civicAtlasStyle(boundaries, demo.issues, color);
    expect(validateStyleMin(style).map((error) => error.message)).toEqual([]);
    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    expect(Object.values(style.sources).every((source) => source.type === 'geojson' && typeof source.data !== 'string')).toBe(true);
    expect(style.layers.some((layer) => layer.id === 'issue-points')).toBe(true);
    expect(style.layers.some((layer) => layer.id === 'ward-lines')).toBe(true);
  });

  it('retains every real ward in both the WebGL source and independent SVG fallback', () => {
    const atlas = buildCivicAtlas(boundaries);
    expect(atlas.collection.features).toHaveLength(369);
    expect(atlas.geometry.wards).toHaveLength(369);
    expect(atlas.geometry.wards.every((ward) => ward.path && !/NaN|Infinity/.test(ward.path))).toBe(true);
    const [[west, south], [east, north]] = atlas.bounds;
    expect(west).toBeLessThan(77.5);
    expect(east).toBeGreaterThan(77.75);
    expect(south).toBeLessThan(12.85);
    expect(north).toBeGreaterThan(13.1);
  });

  it('frames a selected ward using its actual ring coordinates and falls back cleanly for an unknown id', () => {
    const first = boundaries.features[0]!;
    const bounds = civicBounds(boundaries, String(first.properties!.id))!;
    const coordinates = first.geometry.type === 'Polygon' ? first.geometry.coordinates.flat() : first.geometry.coordinates.flat(2);
    expect(bounds).toEqual([[Math.min(...coordinates.map((point) => point[0]!)), Math.min(...coordinates.map((point) => point[1]!))], [Math.max(...coordinates.map((point) => point[0]!)), Math.max(...coordinates.map((point) => point[1]!))]]);
    expect(civicBounds(boundaries, 'missing-ward')).toBeNull();
  });

  it('preserves public record identities and geographic positions for map/list selection', () => {
    const source = civicIssueGeo(demo.issues);
    expect(source.features).toHaveLength(demo.issues.length);
    for (const [index, feature] of source.features.entries()) {
      const issue = demo.issues[index]!;
      expect(feature.id).toBe(issue.id);
      expect(feature.properties?.id).toBe(issue.id);
      expect(feature.properties?.status).toBe(issue.status);
      expect(feature.geometry.coordinates).toEqual([issue.location.lng, issue.location.lat]);
    }
  });

  it('excludes invalid coordinates instead of letting one malformed record hide the whole map', () => {
    const valid = demo.issues[0]!;
    const invalid = [{ ...valid, id: 'nan', location: { ...valid.location, lng: Number.NaN } }, { ...valid, id: 'beyond-world', location: { ...valid.location, lat: 95 } }];
    expect(civicIssueGeo([valid, ...invalid]).features.map((feature) => feature.id)).toEqual([valid.id]);
    expect(() => buildCivicAtlas({ type: 'FeatureCollection', features: [] })).toThrow();
  });

  it('refreshes a reused cluster id after filtering, including its current expansion target and accessible count', () => {
    const positions: Array<[number, number]> = [];
    const attributes = new Map<string, string>();
    const record = {
      coordinates: [77.5, 12.9] as [number, number],
      marker: { setLngLat: (coordinates: [number, number]) => { positions.push(coordinates); } },
      button: { textContent: null as string | null, setAttribute: (name: string, value: string) => { attributes.set(name, value); } },
    };
    const clickTarget = () => record.coordinates;
    refreshCivicCluster(record, { coordinates: [77.5, 12.9], count: 14, abbreviatedCount: 14 });
    refreshCivicCluster(record, { coordinates: [77.7, 13.1], count: 32, abbreviatedCount: '32' });
    expect(positions).toEqual([[77.5, 12.9], [77.7, 13.1]]);
    expect(clickTarget()).toEqual([77.7, 13.1]);
    expect(record.button.textContent).toBe('32');
    expect(attributes.get('aria-label')).toBe('Zoom into 32 civic records');
  });
});
