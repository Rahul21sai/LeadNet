import type { FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import type { IssueDoc, Status } from '@leadnet/shared';
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';
import { buildSpatialGeometry, type SpatialGeometry } from '../spatial/geometry.ts';

export type WardCollection = FeatureCollection<Polygon | MultiPolygon>;
export type CivicBounds = [[number, number], [number, number]];
export interface CivicAtlas { collection: WardCollection; geometry: SpatialGeometry; bounds: CivicBounds }
export const civicStatusTokens: Record<Status, string> = { reported: 'st-reported', acknowledged: 'st-ack', in_progress: 'st-progress', resolved_pending_verification: 'st-awaiting', verified: 'st-verified', reopened: 'st-reopened', rejected: 'st-closed', duplicate: 'st-closed' };

export function civicBounds(collection: WardCollection, wardId?: string): CivicBounds | null {
  const features = wardId ? collection.features.filter((feature) => feature.properties?.id === wardId) : collection.features;
  let west = Infinity; let south = Infinity; let east = -Infinity; let north = -Infinity;
  for (const feature of features) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const polygon of polygons) for (const ring of polygon) for (const [lng, lat] of ring) {
      if (lng === undefined || lat === undefined || !Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      west = Math.min(west, lng); south = Math.min(south, lat); east = Math.max(east, lng); north = Math.max(north, lat);
    }
  }
  return Number.isFinite(west) && east > west && north > south ? [[west, south], [east, north]] : null;
}

export function buildCivicAtlas(value: unknown): CivicAtlas {
  const geometry = buildSpatialGeometry(value);
  const collection = value as WardCollection;
  const bounds = civicBounds(collection);
  if (!bounds) throw new Error('The ward atlas has no geographic extent.');
  return { collection, geometry, bounds };
}

export function civicIssueGeo(issues: IssueDoc[]): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: issues.filter((issue) => Number.isFinite(issue.location.lng) && Number.isFinite(issue.location.lat) && Math.abs(issue.location.lng) <= 180 && Math.abs(issue.location.lat) <= 90).map((issue) => ({ type: 'Feature', id: issue.id, geometry: { type: 'Point', coordinates: [issue.location.lng, issue.location.lat] }, properties: { id: issue.id, status: issue.status, title: issue.title.en } })) };
}

export function civicAtlasStyle(collection: WardCollection, issues: IssueDoc[], color: (name: string) => string): StyleSpecification {
  const statuses = Object.entries(civicStatusTokens).flatMap(([status, token]) => [status, color(token)]);
  return {
    version: 8,
    sources: {
      wards: { type: 'geojson', data: collection },
      issues: { type: 'geojson', data: civicIssueGeo(issues), cluster: true, clusterRadius: 34, clusterMaxZoom: 13 },
    },
    layers: [
      { id: 'atlas-background', type: 'background', paint: { 'background-color': color('canvas') } },
      { id: 'ward-fill', type: 'fill', source: 'wards', paint: { 'fill-color': color('surface-2'), 'fill-opacity': 1 } },
      { id: 'ward-selected', type: 'fill', source: 'wards', filter: ['==', ['get', 'id'], ''], paint: { 'fill-color': color('st-ack'), 'fill-opacity': 0.18 } },
      { id: 'ward-lines', type: 'line', source: 'wards', paint: { 'line-color': color('ink-3'), 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 14, 1.2], 'line-opacity': 0.38 } },
      { id: 'clusters', type: 'circle', source: 'issues', filter: ['has', 'point_count'], paint: { 'circle-color': color('primary'), 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 21, 40, 26], 'circle-stroke-width': 4, 'circle-stroke-color': color('surface') } },
      { id: 'issue-points', type: 'circle', source: 'issues', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['match', ['get', 'status'], ...statuses, color('ink-3')] as unknown as ExpressionSpecification, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 5, 15, 8], 'circle-stroke-color': color('surface'), 'circle-stroke-width': 2.5 } },
      { id: 'selected-issue', type: 'circle', source: 'issues', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], '']], paint: { 'circle-radius': 14, 'circle-opacity': 0, 'circle-stroke-width': 2.5, 'circle-stroke-color': color('primary') } },
    ],
  };
}
