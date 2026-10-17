import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';

export type WardFeature = Feature<Polygon | MultiPolygon, {
  id: string;
  name_en: string;
  name_kn?: string;
  corporation?: string;
  lx?: number;
  ly?: number;
  [key: string]: unknown;
}>;

export interface SpatialWard {
  id: string;
  name: string;
  kn: string;
  corporation: string;
  path: string;
  label: { x: number; y: number };
  /** Display area in SVG square units, excluding holes. */
  area: number;
}

export interface SpatialGeometry {
  wards: SpatialWard[];
  project(lng: number, lat: number): { x: number; y: number };
  viewBox: string;
  width: number;
  height: number;
}

type Point = { x: number; y: number };
type ProjectedPolygon = Point[][];

const SIZE = 1000;
const PADDING = 70;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCoordinate(lng: unknown, lat: unknown): lng is number {
  return typeof lng === 'number' && typeof lat === 'number'
    && Number.isFinite(lng) && Number.isFinite(lat)
    && Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
}

function readWard(value: unknown, index: number): WardFeature {
  if (!isRecord(value) || value.type !== 'Feature' || !isRecord(value.properties)) {
    throw new Error(`Ward feature ${index + 1} is missing its properties`);
  }
  const properties = value.properties;
  if (typeof properties.id !== 'string' || !properties.id.trim()
    || typeof properties.name_en !== 'string' || !properties.name_en.trim()) {
    throw new Error(`Ward feature ${index + 1} needs an id and English name`);
  }
  const context = `Ward ${properties.id}`;
  const geometry = value.geometry;
  if (!isRecord(geometry) || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')
    || !Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    throw new Error(`${context} needs non-empty Polygon or MultiPolygon coordinates`);
  }
  const polygons: unknown[] = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) throw new Error(`${context} has an empty polygon`);
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) throw new Error(`${context} has a ring with fewer than four coordinates`);
      for (const point of ring) {
        if (!Array.isArray(point) || !isCoordinate(point[0], point[1])) {
          throw new Error(`${context} has invalid geographic coordinates`);
        }
      }
      const first = ring[0] as Position;
      const last = ring[ring.length - 1] as Position;
      if (first[0] !== last[0] || first[1] !== last[1]) throw new Error(`${context} has an unclosed ring`);
    }
  }
  if ((properties.lx !== undefined || properties.ly !== undefined) && !isCoordinate(properties.lx, properties.ly)) {
    throw new Error(`${context} has invalid label coordinates`);
  }
  return value as unknown as WardFeature;
}

function polygonsOf(ward: WardFeature): Position[][][] {
  return ward.geometry.type === 'Polygon' ? [ward.geometry.coordinates] : ward.geometry.coordinates;
}

function ringArea(ring: Point[]): number {
  let twiceArea = 0;
  for (let i = 1; i < ring.length; i++) {
    const previous = ring[i - 1]!;
    const point = ring[i]!;
    twiceArea += previous.x * point.y - point.x * previous.y;
  }
  return Math.abs(twiceArea) / 2;
}

function polygonArea(polygon: ProjectedPolygon): number {
  return ringArea(polygon[0]!) - polygon.slice(1).reduce((area, ring) => area + ringArea(ring), 0);
}

function interiorLabel(polygon: ProjectedPolygon): Point {
  const exterior = polygon[0]!;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of exterior) {
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const y = (minY + maxY) / 2;
  const crossings: number[] = [];
  for (const ring of polygon) {
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1]!;
      const b = ring[i]!;
      if ((a.y > y) !== (b.y > y)) crossings.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
    }
  }
  crossings.sort((a, b) => a - b);
  let bestWidth = -Infinity;
  let x = exterior[0]!.x;
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const left = crossings[i]!;
    const right = crossings[i + 1]!;
    if (right - left > bestWidth) {
      bestWidth = right - left;
      x = (left + right) / 2;
    }
  }
  return { x, y };
}

export function buildSpatialGeometry(collection: unknown): SpatialGeometry {
  if (!isRecord(collection) || collection.type !== 'FeatureCollection'
    || !Array.isArray(collection.features) || collection.features.length === 0) {
    throw new Error('Ward collection must be a non-empty GeoJSON FeatureCollection');
  }
  const features = collection.features.map(readWard);
  const ids = new Set<string>();
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const ward of features) {
    if (ids.has(ward.properties.id)) throw new Error(`Ward collection has duplicate id ${ward.properties.id}`);
    ids.add(ward.properties.id);
    for (const polygon of polygonsOf(ward)) {
      for (const ring of polygon) {
        for (const point of ring) {
          minLng = Math.min(minLng, point[0]!);
          maxLng = Math.max(maxLng, point[0]!);
          minLat = Math.min(minLat, point[1]!);
          maxLat = Math.max(maxLat, point[1]!);
        }
      }
    }
  }
  const aspect = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  const spanX = (maxLng - minLng) * aspect;
  const spanY = maxLat - minLat;
  if (!Number.isFinite(spanX) || !Number.isFinite(spanY) || spanX <= 0 || spanY <= 0) {
    throw new Error('Ward collection has invalid or zero-area geographic bounds');
  }
  const scale = (SIZE - PADDING * 2) / Math.max(spanX, spanY);
  const offsetX = (SIZE - spanX * scale) / 2;
  const offsetY = (SIZE - spanY * scale) / 2;
  const project = (lng: number, lat: number): Point => {
    if (!isCoordinate(lng, lat)) throw new Error('Cannot project invalid geographic coordinates');
    return { x: offsetX + (lng - minLng) * aspect * scale, y: offsetY + (maxLat - lat) * scale };
  };
  const wards = features.map((ward): SpatialWard => {
    const polygons = polygonsOf(ward).map((polygon) => polygon.map((ring) => ring.map((point) => project(point[0]!, point[1]!))));
    const areas = polygons.map(polygonArea);
    if (areas.some((area) => !Number.isFinite(area) || area <= 0)) throw new Error(`Ward ${ward.properties.id} has invalid polygon area`);
    const largest = areas.indexOf(Math.max(...areas));
    const { lx, ly } = ward.properties;
    return {
      id: ward.properties.id,
      name: ward.properties.name_en,
      kn: typeof ward.properties.name_kn === 'string' ? ward.properties.name_kn : '',
      corporation: typeof ward.properties.corporation === 'string' ? ward.properties.corporation : '',
      // Every ring remains a subpath; consumers use fillRule="evenodd" to retain holes.
      path: polygons.flatMap((polygon) => polygon.map((ring) => ring.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join('') + 'Z')).join(''),
      label: typeof lx === 'number' && typeof ly === 'number' ? project(lx, ly) : interiorLabel(polygons[largest]!),
      area: areas.reduce((sum, area) => sum + area, 0),
    };
  });
  return { wards, project, viewBox: '0 0 1000 1000', width: SIZE, height: SIZE };
}
