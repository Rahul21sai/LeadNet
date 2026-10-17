import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Point } from 'geojson';
import type { IssueDoc, Status } from '@leadnet/shared';
import { Layers3, MapPin, Minus, Plus } from 'lucide-react';

interface Props { issues: IssueDoc[]; onSelect?: (id: string) => void; selectedId?: string | null; wardId?: string; interactive?: boolean; className?: string }
const colorTokens: Record<Status, string> = { reported: 'st-reported', acknowledged: 'st-ack', in_progress: 'st-progress', resolved_pending_verification: 'st-awaiting', verified: 'st-verified', reopened: 'st-reopened', rejected: 'st-closed', duplicate: 'st-closed' };
function issueGeo(issues: IssueDoc[]): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: issues.map((issue) => ({ type: 'Feature', id: issue.id,
    geometry: { type: 'Point', coordinates: [issue.location.lng, issue.location.lat] }, properties: { id: issue.id, status: issue.status, title: issue.title.en } })) };
}

export function CivicMap({ issues, onSelect, selectedId, wardId, interactive = true, className = '' }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const latest = useRef({ issues, onSelect });
  latest.current = { issues, onSelect };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [boundaries, setBoundaries] = useState(true);
  const [theme, setTheme] = useState(document.documentElement.dataset.theme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!container.current) return;
    setReady(false); setError(false);
    let disposed = false;
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(`--color-${name}`).trim();
    const matches: string[] = [];
    for (const [status, name] of Object.entries(colorTokens)) matches.push(status, token(name));
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({ container: container.current, style: 'https://tiles.openfreemap.org/styles/positron', center: [77.5946, 12.9716], zoom: 11.1, maxZoom: 19, minZoom: 8.5, interactive, attributionControl: false });
    } catch { setError(true); return; }
    map.current = instance;
    let styleLoaded = false;
    const styleTimeout = window.setTimeout(() => { if (!styleLoaded && !disposed) setError(true); }, 12000);
    const resize = new ResizeObserver((entries) => {
      if (entries.some((entry) => entry.contentRect.width > 0 && entry.contentRect.height > 0)) instance.resize();
    });
    resize.observe(container.current);
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    instance.on('load', async () => {
      if (disposed) return;
      styleLoaded = true; window.clearTimeout(styleTimeout); setError(false);
      instance.addSource('issues', { type: 'geojson', data: issueGeo(latest.current.issues), cluster: true, clusterRadius: 38, clusterMaxZoom: 14 });
      instance.addLayer({ id: 'clusters', type: 'circle', source: 'issues', filter: ['has', 'point_count'], paint: { 'circle-color': token('primary'), 'circle-radius': ['step', ['get', 'point_count'], 17, 10, 22, 40, 28], 'circle-stroke-width': 3, 'circle-stroke-color': token('surface') } });
      instance.addLayer({ id: 'cluster-label', type: 'symbol', source: 'issues', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': token('on-primary') } });
      instance.addLayer({ id: 'issue-points', type: 'circle', source: 'issues', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['match', ['get', 'status'], ...matches, token('ink-3')] as unknown as maplibregl.ExpressionSpecification, 'circle-radius': 7, 'circle-stroke-color': token('surface'), 'circle-stroke-width': 2.5 } });
      instance.on('click', 'issue-points', (event) => { const id = event.features?.[0]?.properties?.id; if (id) latest.current.onSelect?.(String(id)); });
      instance.on('click', 'clusters', async (event) => { const feature = event.features?.[0]; if (!feature || feature.geometry.type !== 'Point') return; const zoom = await (instance.getSource('issues') as GeoJSONSource).getClusterExpansionZoom(Number(feature.properties?.cluster_id)); instance.easeTo({ center: feature.geometry.coordinates as [number, number], zoom, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450 }); });
      for (const layer of ['issue-points', 'clusters']) { instance.on('mouseenter', layer, () => { instance.getCanvas().style.cursor = 'pointer'; }); instance.on('mouseleave', layer, () => { instance.getCanvas().style.cursor = ''; }); }
      try {
        const response = await fetch('/data/wards.geojson'); if (!response.ok) throw new Error('Ward boundaries unavailable');
        const wards = await response.json() as FeatureCollection; if (disposed) return;
        instance.addSource('wards', { type: 'geojson', data: wards });
        instance.addLayer({ id: 'ward-fill', type: 'fill', source: 'wards', paint: { 'fill-color': token('st-ack'), 'fill-opacity': 0.035 } }, 'clusters');
        instance.addLayer({ id: 'ward-lines', type: 'line', source: 'wards', paint: { 'line-color': token('ink-3'), 'line-width': 0.8, 'line-opacity': 0.4 } }, 'clusters');
      } catch { /* Issue discovery remains available if ward overlays cannot load. */ }
      setReady(true);
    });
    instance.on('error', (event) => { if (!styleLoaded || event.error?.message?.includes('WebGL')) setError(true); });
    return () => { disposed = true; window.clearTimeout(styleTimeout); resize.disconnect(); instance.remove(); map.current = null; };
  }, [interactive, theme]);
  useEffect(() => { if (ready) (map.current?.getSource('issues') as GeoJSONSource | undefined)?.setData(issueGeo(issues)); }, [issues, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    for (const layer of ['ward-lines', 'ward-fill']) if (map.current.getLayer(layer)) map.current.setLayoutProperty(layer, 'visibility', boundaries ? 'visible' : 'none');
    if (map.current.getLayer('ward-fill')) map.current.setPaintProperty('ward-fill', 'fill-opacity', wardId ? ['case', ['==', ['get', 'id'], wardId], 0.16, 0.015] : 0.035);
  }, [ready, boundaries, wardId]);
  useEffect(() => {
    const issue = issues.find((i) => i.id === selectedId);
    if (issue && ready) map.current?.easeTo({ center: [issue.location.lng, issue.location.lat], zoom: Math.max(map.current.getZoom(), 14), duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 });
  }, [selectedId, ready]);
  return <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
    <div ref={container} className="absolute inset-0" role="region" aria-label="Interactive civic issue map of Bengaluru. All issues are also available in the list." />
    {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2 p-6 text-center"><MapPin size={28} className="text-ink-3" /><p className="font-medium">The map could not load</p><p className="max-w-xs text-sm text-ink-3">Use the issue list to explore every record. Your browser may have WebGL disabled.</p></div>}
    {interactive && !error && <div className="absolute bottom-10 right-4 flex flex-col gap-2"><div className="overflow-hidden rounded-pill border border-hairline bg-surface shadow-card"><button onClick={() => map.current?.zoomIn()} aria-label="Zoom in" className="flex h-11 w-11 items-center justify-center hover:bg-fill"><Plus size={18} /></button><button onClick={() => map.current?.zoomOut()} aria-label="Zoom out" className="flex h-11 w-11 items-center justify-center border-t border-hairline hover:bg-fill"><Minus size={18} /></button></div><button onClick={() => setBoundaries(!boundaries)} aria-pressed={boundaries} aria-label="Toggle ward boundaries" className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface shadow-card"><Layers3 size={18} /></button></div>}
    <p className="absolute bottom-2 left-3 max-w-[65%] rounded-sm bg-surface/90 px-2 py-1 text-[9px] leading-relaxed text-ink-3">Ward boundaries: GBA 2025, via OpenCity</p>
  </div>;
}
