import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Point } from 'geojson';
import type { IssueDoc, Status } from '@leadnet/shared';
import { Compass, Layers3, MapPin, Minus, Plus } from 'lucide-react';

interface Props {
  issues: IssueDoc[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  wardId?: string;
  interactive?: boolean;
  initialView?: '2d' | '3d';
  showViewToggle?: boolean;
  className?: string;
}

const CITY_CENTER: [number, number] = [77.5946, 12.9716];
const colorTokens: Record<Status, string> = { reported: 'st-reported', acknowledged: 'st-ack', in_progress: 'st-progress', resolved_pending_verification: 'st-awaiting', verified: 'st-verified', reopened: 'st-reopened', rejected: 'st-closed', duplicate: 'st-closed' };
const duration = (milliseconds: number) => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : milliseconds;

function issueGeo(issues: IssueDoc[]): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: issues.map((issue) => ({ type: 'Feature', id: issue.id,
    geometry: { type: 'Point', coordinates: [issue.location.lng, issue.location.lat] }, properties: { id: issue.id, status: issue.status, title: issue.title.en } })) };
}

function boundaryBounds(wards: FeatureCollection | null, id: string): maplibregl.LngLatBounds | null {
  const geometry = wards?.features.find((feature) => feature.properties?.id === id)?.geometry;
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return null;
  const rings = geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
  const bounds = new maplibregl.LngLatBounds();
  for (const ring of rings) for (const position of ring) {
    const [lng, lat] = position;
    if (typeof lng === 'number' && typeof lat === 'number' && Number.isFinite(lng) && Number.isFinite(lat)) bounds.extend([lng, lat]);
  }
  return bounds.isEmpty() ? null : bounds;
}

function framePadding(element: HTMLElement | null) {
  const inset = element ? Number.parseFloat(getComputedStyle(element).getPropertyValue('--civic-map-inset-left')) || 0 : 0;
  return { top: 70, right: 84, bottom: 70, left: 32 + Math.max(0, inset) };
}

export function CivicMap({ issues, onSelect, selectedId, wardId, interactive = true, initialView = '2d', showViewToggle = true, className = '' }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const latest = useRef({ issues, onSelect });
  latest.current = { issues, onSelect };
  const [view, setView] = useState(initialView);
  const appliedView = useRef(initialView);
  const viewRef = useRef(view);
  viewRef.current = view;
  const camera = useRef({ center: initialView === '3d' ? [77.6033, 12.9758] as [number, number] : CITY_CENTER, zoom: initialView === '3d' ? 14.2 : 11.1, pitch: initialView === '3d' ? 45 : 0, bearing: initialView === '3d' ? -15 : 0 });
  const wardGeometry = useRef<FeatureCollection | null>(null);
  const focusedWard = useRef<string | undefined>(undefined);
  const [wardVersion, setWardVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [boundaries, setBoundaries] = useState(true);
  const [buildingLayer, setBuildingLayer] = useState(false);
  const [theme, setTheme] = useState(document.documentElement.dataset.theme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!container.current) return;
    setReady(false); setError(false); setBuildingLayer(false);
    let disposed = false;
    const abort = new AbortController();
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(`--color-${name}`).trim();
    const matches: string[] = [];
    for (const [status, name] of Object.entries(colorTokens)) matches.push(status, token(name));
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({ container: container.current, style: 'https://tiles.openfreemap.org/styles/positron', ...camera.current, maxZoom: 19, minZoom: 8.5, maxPitch: 65, interactive, attributionControl: false });
    } catch { setError(true); return; }
    map.current = instance;
    let styleLoaded = false;
    const styleTimeout = window.setTimeout(() => { if (!styleLoaded && !disposed) setError(true); }, 12000);
    const resize = new ResizeObserver((entries) => {
      if (!disposed && entries.some((entry) => entry.contentRect.width > 0 && entry.contentRect.height > 0)) instance.resize();
    });
    resize.observe(container.current);
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    instance.on('load', async () => {
      if (disposed) return;
      styleLoaded = true; window.clearTimeout(styleTimeout); setError(false);
      try {
        const style = instance.getStyle();
        const building = style.layers.find((layer) => (layer.type === 'fill' || layer.type === 'fill-extrusion') && layer['source-layer'] === 'building' && style.sources[layer.source]?.type === 'vector');
        if (building && 'source' in building && 'source-layer' in building && typeof building.source === 'string') {
          // Missing height data produces no extrusion; no assumed building heights are added.
          const height: maplibregl.ExpressionSpecification = ['max', 0, ['to-number', ['coalesce', ['get', 'render_height'], ['get', 'height']], 0]];
          const base: maplibregl.ExpressionSpecification = ['min', height, ['max', 0, ['to-number', ['coalesce', ['get', 'render_min_height'], ['get', 'min_height']], 0]]];
          try {
            instance.addLayer({ id: 'civic-buildings-3d', type: 'fill-extrusion', source: building.source, 'source-layer': building['source-layer'], minzoom: 12, filter: ['>', height, 0], layout: { visibility: viewRef.current === '3d' ? 'visible' : 'none' }, paint: { 'fill-extrusion-color': token('surface-2'), 'fill-extrusion-height': height, 'fill-extrusion-base': base, 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true } }, style.layers.find((layer) => layer.type === 'symbol')?.id);
            setBuildingLayer(Boolean(instance.getLayer('civic-buildings-3d')));
          } catch { /* Optional building data must not block civic records. */ }
        }
        instance.addSource('issues', { type: 'geojson', data: issueGeo(latest.current.issues), cluster: true, clusterRadius: 38, clusterMaxZoom: 14 });
        instance.addLayer({ id: 'clusters', type: 'circle', source: 'issues', filter: ['has', 'point_count'], paint: { 'circle-color': token('primary'), 'circle-radius': ['step', ['get', 'point_count'], 17, 10, 22, 40, 28], 'circle-stroke-width': 3, 'circle-stroke-color': token('surface') } });
        instance.addLayer({ id: 'cluster-label', type: 'symbol', source: 'issues', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': token('on-primary') } });
        instance.addLayer({ id: 'issue-points', type: 'circle', source: 'issues', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['match', ['get', 'status'], ...matches, token('ink-3')] as unknown as maplibregl.ExpressionSpecification, 'circle-radius': 7, 'circle-stroke-color': token('surface'), 'circle-stroke-width': 2.5 } });
        instance.addLayer({ id: 'selected-issue', type: 'circle', source: 'issues', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], '']], paint: { 'circle-radius': 12, 'circle-color': token('surface'), 'circle-opacity': 0, 'circle-stroke-width': 2, 'circle-stroke-color': token('primary') } });
        instance.on('click', 'issue-points', (event) => { const id = event.features?.[0]?.properties?.id; if (id) latest.current.onSelect?.(String(id)); });
        instance.on('click', 'clusters', async (event) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== 'Point') return;
          try {
            const zoom = await (instance.getSource('issues') as GeoJSONSource).getClusterExpansionZoom(Number(feature.properties?.cluster_id));
            if (!disposed) instance.easeTo({ center: feature.geometry.coordinates as [number, number], zoom, padding: framePadding(container.current), duration: duration(450) });
          } catch { /* A cluster can disappear while live records update. */ }
        });
        for (const layer of ['issue-points', 'clusters']) {
          instance.on('mouseenter', layer, () => { instance.getCanvas().style.cursor = 'pointer'; });
          instance.on('mouseleave', layer, () => { instance.getCanvas().style.cursor = ''; });
        }
        setReady(true);
      } catch { if (!disposed) setError(true); return; }
      try {
        const response = await fetch('/data/wards.geojson', { signal: abort.signal });
        if (!response.ok) throw new Error('Ward boundaries unavailable');
        const wards = await response.json() as FeatureCollection;
        if (disposed) return;
        wardGeometry.current = wards;
        instance.addSource('wards', { type: 'geojson', data: wards });
        const below = instance.getLayer('civic-buildings-3d') ? 'civic-buildings-3d' : 'clusters';
        instance.addLayer({ id: 'ward-fill', type: 'fill', source: 'wards', paint: { 'fill-color': token('st-ack'), 'fill-opacity': 0.035 } }, below);
        instance.addLayer({ id: 'ward-lines', type: 'line', source: 'wards', paint: { 'line-color': token('ink-3'), 'line-width': 0.8, 'line-opacity': 0.4 } }, below);
        setWardVersion((version) => version + 1);
      } catch { /* Issue discovery remains available if ward overlays cannot load. */ }
    });
    instance.on('error', (event) => { if (!disposed && (!styleLoaded || event.error?.message?.includes('WebGL'))) setError(true); });
    return () => {
      disposed = true; abort.abort(); window.clearTimeout(styleTimeout); resize.disconnect();
      camera.current = { center: instance.getCenter().toArray(), zoom: instance.getZoom(), pitch: instance.getPitch(), bearing: instance.getBearing() };
      instance.remove(); map.current = null;
    };
  }, [interactive, theme]);

  useEffect(() => { if (ready) (map.current?.getSource('issues') as GeoJSONSource | undefined)?.setData(issueGeo(issues)); }, [issues, ready]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    if (appliedView.current !== view) instance.easeTo({ pitch: view === '3d' ? 45 : 0, bearing: view === '3d' ? -15 : 0, ...(view === '3d' ? { zoom: Math.max(instance.getZoom(), 14.2) } : {}), duration: duration(700) });
    appliedView.current = view;
    if (instance.getLayer('civic-buildings-3d')) instance.setLayoutProperty('civic-buildings-3d', 'visibility', view === '3d' ? 'visible' : 'none');
  }, [view, ready]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    for (const layer of ['ward-lines', 'ward-fill']) if (instance.getLayer(layer)) instance.setLayoutProperty(layer, 'visibility', boundaries ? 'visible' : 'none');
    if (instance.getLayer('ward-fill')) instance.setPaintProperty('ward-fill', 'fill-opacity', wardId ? ['case', ['==', ['get', 'id'], wardId], 0.16, 0.015] : 0.035);
  }, [ready, boundaries, wardId, wardVersion]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    if (!wardId) {
      if (focusedWard.current) instance.easeTo({ center: CITY_CENTER, zoom: 11.1, padding: framePadding(container.current), duration: duration(700) });
      focusedWard.current = undefined;
      return;
    }
    if (focusedWard.current === wardId) return;
    const bounds = boundaryBounds(wardGeometry.current, wardId);
    if (!bounds) return;
    instance.fitBounds(bounds, { padding: framePadding(container.current), maxZoom: 15, duration: duration(750), bearing: viewRef.current === '3d' ? -15 : 0 });
    focusedWard.current = wardId;
  }, [ready, wardId, wardVersion]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    if (instance.getLayer('selected-issue')) instance.setFilter('selected-issue', ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedId ?? '']]);
    const issue = latest.current.issues.find((item) => item.id === selectedId);
    if (issue) instance.easeTo({ center: [issue.location.lng, issue.location.lat], zoom: Math.max(instance.getZoom(), 15), padding: framePadding(container.current), offset: [0, (container.current?.clientWidth ?? 0) < 768 ? -Math.min(120, (container.current?.clientHeight ?? 0) / 4) : 0], duration: duration(600) });
  }, [selectedId, ready]);

  function resetOverview() {
    map.current?.easeTo({ center: CITY_CENTER, zoom: 11.1, pitch: view === '3d' ? 45 : 0, bearing: view === '3d' ? -15 : 0, padding: framePadding(container.current), duration: duration(750) });
  }

  return <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
    <div ref={container} className="absolute inset-0" role="region" aria-label={`Interactive ${view === '3d' ? '3D' : '2D'} civic issue map of Bengaluru. All issues are also available in the list.`} />
    {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2 p-6 text-center"><MapPin size={28} className="text-ink-3" /><p className="font-medium">The map could not load</p><p className="max-w-xs text-sm text-ink-3">Open the issue list to explore the records. Your browser may have WebGL disabled.</p></div>}
    {interactive && !error && <div className="absolute right-4 top-4 flex flex-col items-end gap-3">
      {showViewToggle && <div role="group" aria-label="Map perspective" className="material-chrome flex rounded-pill p-1 shadow-card">{(['2d', '3d'] as const).map((option) => <button key={option} type="button" onClick={() => setView(option)} aria-label={`Show ${option.toUpperCase()} map`} aria-pressed={view === option} disabled={!ready} className={`min-h-11 min-w-12 rounded-pill px-3 text-[13px] font-semibold transition-colors disabled:opacity-50 ${view === option ? 'bg-primary text-on-primary' : 'text-ink-2 hover:bg-fill'}`}>{option.toUpperCase()}</button>)}</div>}
      <div className="material-chrome overflow-hidden rounded-pill shadow-card"><button type="button" onClick={resetOverview} disabled={!ready} aria-label="Reset to city overview" title="City overview" className="flex h-11 w-11 items-center justify-center text-ink-2 transition-colors hover:bg-fill disabled:opacity-50"><Compass size={19} strokeWidth={1.6} /></button><button type="button" onClick={() => map.current?.zoomIn({ duration: duration(220) })} disabled={!ready} aria-label="Zoom in" className="flex h-11 w-11 items-center justify-center border-t border-hairline text-ink-2 transition-colors hover:bg-fill disabled:opacity-50"><Plus size={18} /></button><button type="button" onClick={() => map.current?.zoomOut({ duration: duration(220) })} disabled={!ready} aria-label="Zoom out" className="flex h-11 w-11 items-center justify-center border-t border-hairline text-ink-2 transition-colors hover:bg-fill disabled:opacity-50"><Minus size={18} /></button></div>
      <button type="button" onClick={() => setBoundaries(!boundaries)} disabled={!ready} aria-pressed={boundaries} aria-label="Show ward boundaries" title="Ward boundaries" className={`material-chrome flex h-11 w-11 items-center justify-center rounded-pill shadow-card transition-colors disabled:opacity-50 ${boundaries ? 'text-link' : 'text-ink-3'}`}><Layers3 size={18} /></button>
    </div>}
    <div className="pointer-events-none absolute bottom-2 left-3 max-w-[65%] rounded-sm bg-surface px-2 py-1 text-[9px] leading-relaxed text-ink-3"><p>Ward boundaries: GBA 2025, via OpenCity</p>{view === '3d' && buildingLayer && <p>Building heights shown where provided by map data.</p>}</div>
  </div>;
}
