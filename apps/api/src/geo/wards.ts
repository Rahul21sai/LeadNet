import { existsSync, readFileSync } from 'node:fs';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { WardDoc } from '@leadnet/shared';
import { ApiFault } from '../services/errors.ts';

export interface WardLookup {
  lookup(lat: number, lng: number): WardDoc | null;
  get(id: string): WardDoc | null;
}

let boundaries: FeatureCollection<Polygon | MultiPolygon> | undefined;
let labels: Record<string, { lat: number; lng: number }> | undefined;
function dataset() {
  if (boundaries) return boundaries;
  const paths = [new URL('../../data/wards.geojson', import.meta.url), new URL('../data/wards.geojson', import.meta.url)];
  const path = paths.find((candidate) => existsSync(candidate));
  if (!path) throw new ApiFault(503, 'geography_unavailable', 'Ward boundaries are unavailable. Please try again later.');
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as FeatureCollection<Polygon | MultiPolygon>;
  if (!parsed.features.length) throw new ApiFault(503, 'geography_unavailable', 'Ward boundaries are not loaded yet.');
  boundaries = parsed;
  const labelPaths = [new URL('../../data/ward-labels.json', import.meta.url), new URL('../data/ward-labels.json', import.meta.url)];
  const labelPath = labelPaths.find((candidate) => existsSync(candidate));
  if (!labelPath) { boundaries = undefined; throw new ApiFault(503, 'geography_unavailable', 'Ward representative points are unavailable.'); }
  labels = JSON.parse(readFileSync(labelPath, 'utf8')) as Record<string, { lat: number; lng: number }>;
  return parsed;
}

function ward(properties: GeoJSON.GeoJsonProperties): WardDoc {
  const p = properties ?? {};
  const centroid = labels?.[String(p.id)];
  if (!centroid || !Number.isFinite(centroid.lat) || !Number.isFinite(centroid.lng) || typeof p.name_en !== 'string' || typeof p.name_kn !== 'string' || !p.name_kn) throw new ApiFault(503, 'geography_unavailable', 'Ward metadata is incomplete.');
  return { id: String(p.id), number: Number(p.number) || null, name: { en: p.name_en, kn: p.name_kn }, zone: p.zone ?? null, corporation: p.corporation ?? null, assembly: p.assembly ?? null, centroid, officerLeaderId: null, stats: null, statsUpdatedAt: null };
}

export const wardLookup: WardLookup = {
  lookup(lat, lng) {
    const candidate = point([lng, lat]);
    const hits = dataset().features.filter((feature) => booleanPointInPolygon(candidate, feature)).sort((a, b) => String(a.properties?.id).localeCompare(String(b.properties?.id)));
    return hits[0] ? ward(hits[0].properties) : null;
  },
  get(id) { const found = dataset().features.find((feature) => feature.properties?.id === id); return found ? ward(found.properties) : null; },
};
