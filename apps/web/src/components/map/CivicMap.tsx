import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { IssueDoc } from '@leadnet/shared';
import { Compass, Layers3, Minus, Plus, RotateCcw } from 'lucide-react';
import { buildCivicAtlas, civicAtlasStyle, civicBounds, civicIssueGeo, civicStatusTokens, type CivicAtlas } from './civicAtlas.ts';
import { refreshCivicCluster } from './clusterSnapshot.ts';
import './civicMap.css';

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

let atlasPromise: Promise<CivicAtlas> | undefined;
function loadAtlas() {
  atlasPromise ??= fetch('/data/wards.geojson').then(async (response) => {
    if (!response.ok) throw new Error('The bundled ward atlas is unavailable.');
    return buildCivicAtlas(await response.json());
  }).catch((error: unknown) => { atlasPromise = undefined; throw error; });
  return atlasPromise;
}
const duration = (milliseconds: number) => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : milliseconds;

export function CivicMap({ issues, onSelect, selectedId, wardId, interactive = true, initialView = '2d', showViewToggle = true, className = '' }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const latest = useRef({ issues, onSelect, wardId, selectedId });
  latest.current = { issues, onSelect, wardId, selectedId };
  const [atlas, setAtlas] = useState<CivicAtlas | null>(null);
  const [atlasError, setAtlasError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState(initialView);
  const viewRef = useRef(view); viewRef.current = view;
  const [ready, setReady] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [boundaries, setBoundaries] = useState(true);
  const [fallbackZoom, setFallbackZoom] = useState(1);
  const [theme, setTheme] = useState(document.documentElement.dataset.theme);
  const savedCamera = useRef<{ center: [number, number]; zoom: number; pitch: number; bearing: number } | null>(null);
  const fallbackPoints = useMemo(() => atlas ? issues.filter((issue) => Number.isFinite(issue.location.lng) && Number.isFinite(issue.location.lat) && Math.abs(issue.location.lng) <= 180 && Math.abs(issue.location.lat) <= 90).map((issue) => ({ issue, point: atlas.geometry.project(issue.location.lng, issue.location.lat) })) : [], [atlas, issues]);

  useEffect(() => {
    let active = true; setAtlasError(false);
    void loadAtlas().then((data) => { if (active) setAtlas(data); }, () => { if (active) setAtlasError(true); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!container.current || !atlas) return;
    setReady(false); setWebglFailed(false);
    let disposed = false;
    const clusters = new Map<number, { marker: maplibregl.Marker; button: HTMLButtonElement; coordinates: [number, number] }>();
    const css = getComputedStyle(document.documentElement);
    const color = (name: string) => css.getPropertyValue(`--color-${name}`).trim();
    let instance: maplibregl.Map;
    try {
      // Local geometry is the complete basemap, so tile, style and glyph servers cannot hide civic records.
      instance = new maplibregl.Map({ container: container.current, style: civicAtlasStyle(atlas.collection, latest.current.issues, color), center: [77.5946, 12.9716], zoom: 10.3, pitch: viewRef.current === '3d' ? 40 : 0, bearing: viewRef.current === '3d' ? -12 : 0, minZoom: 8.5, maxZoom: 18, maxPitch: 55, interactive, attributionControl: false });
    } catch { setWebglFailed(true); return; }
    map.current = instance;
    const padding = () => ({ top: 84, right: (container.current?.clientWidth ?? 0) < 500 ? 58 : 80, bottom: 66, left: 38 });
    const resize = new ResizeObserver(() => { if (!disposed && container.current?.clientWidth && container.current.clientHeight) instance.resize(); });
    resize.observe(container.current);
    const fail = () => { if (!disposed) { setReady(false); setWebglFailed(true); } };
    const timer = window.setTimeout(() => { if (!instance.loaded()) fail(); }, 8000);
    const expandCluster = async (clusterId: number, coordinates: [number, number]) => {
      try {
        const zoom = await (instance.getSource('issues') as GeoJSONSource).getClusterExpansionZoom(clusterId);
        if (!disposed) instance.easeTo({ center: coordinates, zoom, duration: duration(450) });
      } catch { /* A cluster can disappear when live records change. */ }
    };
    const updateClusters = () => {
      if (disposed || !instance.isSourceLoaded('issues')) return;
      const visible = new Set<number>();
      for (const feature of instance.querySourceFeatures('issues')) {
        if (!feature.properties?.cluster || feature.geometry.type !== 'Point') continue;
        const id = Number(feature.properties.cluster_id);
        if (visible.has(id)) continue;
        visible.add(id);
        const coordinates = feature.geometry.coordinates as [number, number];
        if (!clusters.has(id)) {
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'civic-map-cluster';
          button.disabled = !interactive;
          const record = { marker: new maplibregl.Marker({ element: button }).setLngLat(coordinates).addTo(instance), button, coordinates };
          button.addEventListener('click', () => { void expandCluster(id, record.coordinates); });
          clusters.set(id, record);
        }
        refreshCivicCluster(clusters.get(id)!, { coordinates, count: Number(feature.properties.point_count), abbreviatedCount: feature.properties.point_count_abbreviated as string | number });
      }
      for (const [id, record] of clusters) if (!visible.has(id)) { record.marker.remove(); clusters.delete(id); }
    };
    instance.on('load', () => {
      if (disposed) return;
      window.clearTimeout(timer);
      if (savedCamera.current) instance.jumpTo(savedCamera.current);
      else instance.fitBounds(civicBounds(atlas.collection, latest.current.wardId) ?? atlas.bounds, { padding: padding(), duration: 0, bearing: viewRef.current === '3d' ? -12 : 0, pitch: viewRef.current === '3d' ? 40 : 0 });
      instance.on('click', 'issue-points', (event) => { const id = event.features?.[0]?.properties?.id; if (id) latest.current.onSelect?.(String(id)); });
      instance.on('click', 'clusters', (event) => {
        const feature = event.features?.[0];
        if (feature?.geometry.type === 'Point') void expandCluster(Number(feature.properties?.cluster_id), feature.geometry.coordinates as [number, number]);
      });
      for (const layer of ['issue-points', 'clusters']) {
        instance.on('mouseenter', layer, () => { instance.getCanvas().style.cursor = 'pointer'; });
        instance.on('mouseleave', layer, () => { instance.getCanvas().style.cursor = ''; });
      }
      setReady(true); updateClusters();
    });
    instance.on('moveend', updateClusters);
    instance.on('sourcedata', (event) => { if (event.sourceId === 'issues' && event.isSourceLoaded) updateClusters(); });
    instance.on('error', fail);
    instance.getCanvas().addEventListener('webglcontextlost', fail);
    return () => {
      disposed = true; window.clearTimeout(timer); resize.disconnect();
      savedCamera.current = { center: instance.getCenter().toArray(), zoom: instance.getZoom(), pitch: instance.getPitch(), bearing: instance.getBearing() };
      for (const record of clusters.values()) record.marker.remove();
      instance.getCanvas().removeEventListener('webglcontextlost', fail);
      instance.remove(); map.current = null;
    };
  }, [atlas, interactive, theme]);

  useEffect(() => { if (ready) (map.current?.getSource('issues') as GeoJSONSource | undefined)?.setData(civicIssueGeo(issues)); }, [issues, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    map.current.easeTo({ pitch: view === '3d' ? 40 : 0, bearing: view === '3d' ? -12 : 0, duration: duration(600) });
  }, [view, ready]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !atlas) return;
    instance.setFilter('ward-selected', ['==', ['get', 'id'], wardId ?? '']);
    instance.fitBounds(civicBounds(atlas.collection, wardId) ?? atlas.bounds, { padding: { top: 84, right: 74, bottom: 66, left: 38 }, maxZoom: 14.5, bearing: viewRef.current === '3d' ? -12 : 0, pitch: viewRef.current === '3d' ? 40 : 0, duration: duration(650) });
  }, [wardId, atlas, ready]);
  useEffect(() => { if (ready) map.current?.setLayoutProperty('ward-lines', 'visibility', boundaries ? 'visible' : 'none'); }, [boundaries, ready]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    instance.setFilter('selected-issue', ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedId ?? '']]);
    const issue = latest.current.issues.find((item) => item.id === selectedId);
    if (issue) instance.easeTo({ center: [issue.location.lng, issue.location.lat], zoom: Math.max(instance.getZoom(), 14.5), offset: [0, (container.current?.clientWidth ?? 0) < 600 ? -90 : 0], duration: duration(500) });
  }, [selectedId, ready]);

  const reset = () => {
    setFallbackZoom(1);
    if (atlas) map.current?.fitBounds(civicBounds(atlas.collection, wardId) ?? atlas.bounds, { padding: { top: 84, right: 74, bottom: 66, left: 38 }, bearing: view === '3d' ? -12 : 0, pitch: view === '3d' ? 40 : 0, duration: duration(600) });
  };
  const zoom = (direction: number) => {
    if (ready) map.current?.easeTo({ zoom: map.current.getZoom() + direction, duration: duration(220) });
    else setFallbackZoom((value) => Math.max(1, Math.min(3, value + direction * 0.35)));
  };

  return <div className={`civic-map ${className}`}>
    {!ready && atlas && <div className="civic-map-fallback" aria-label="Bundled Bengaluru ward atlas. Select a record in the issue list for full details.">
      <div className="civic-map-fallback__plane" style={{ transform: `scale(${fallbackZoom})` }}>
        <svg viewBox={atlas.geometry.viewBox} role="img" aria-label="Real Bengaluru ward boundaries" className="civic-map-fallback__wards"><g fillRule="evenodd">{atlas.geometry.wards.map((record) => <path key={record.id} d={record.path} className={`${boundaries ? 'is-outlined' : ''} ${record.id === wardId ? 'is-selected' : ''}`}><title>{record.name}</title></path>)}</g></svg>
        {fallbackPoints.map(({ issue, point }) => <button key={issue.id} type="button" disabled={!interactive} onClick={() => onSelect?.(issue.id)} className={`civic-map-fallback__pin ${issue.id === selectedId ? 'is-selected' : ''}`} style={{ left: `${point.x / 10}%`, top: `${point.y / 10}%`, '--civic-pin-color': `var(--color-${civicStatusTokens[issue.status]})` } as CSSProperties} aria-label={`Select ${issue.title.en}`} aria-pressed={issue.id === selectedId}><span /></button>)}
      </div>
    </div>}
    <div ref={container} className={`civic-map-canvas ${!ready ? 'is-pending' : ''}`} role="region" aria-label={`Interactive ${view === '3d' ? '3D' : '2D'} Bengaluru ward atlas. Every record is also available in the issue list.`} />
    <div className="civic-map-title"><span className="civic-map-title__symbol"><Compass size={18} strokeWidth={1.5} /></span><div><p>Bengaluru<span>Ward atlas</span></p><small>{ready ? 'Drag to explore · Select a record' : webglFailed ? 'Atlas overview · Use the list to explore' : 'Real geography, a shared record'}</small></div></div>
    {!atlas && <div className="civic-map-message" role="status"><Compass size={28} strokeWidth={1.2} /><p>{atlasError ? 'Ward atlas unavailable' : 'Opening Bengaluru'}</p><span>{atlasError ? 'All civic records remain available in the list.' : 'Preparing real ward boundaries and civic records.'}</span>{atlasError && <button type="button" onClick={() => setRetry((value) => value + 1)}><RotateCcw size={15} />Retry atlas</button>}</div>}
    {interactive && <div className="civic-map-controls">
      {showViewToggle && <div role="group" aria-label="Map perspective" className="civic-map-view">{(['2d', '3d'] as const).map((option) => <button key={option} type="button" onClick={() => setView(option)} aria-label={`Show ${option.toUpperCase()} map`} aria-pressed={view === option} disabled={!ready}>{option.toUpperCase()}</button>)}</div>}
      <div className="civic-map-tools"><button type="button" onClick={reset} disabled={!atlas} aria-label="Reset to city overview" title="City overview"><Compass size={18} /></button><button type="button" onClick={() => zoom(1)} disabled={!atlas} aria-label="Zoom in"><Plus size={18} /></button><button type="button" onClick={() => zoom(-1)} disabled={!atlas} aria-label="Zoom out"><Minus size={18} /></button></div>
      <button type="button" onClick={() => setBoundaries(!boundaries)} disabled={!atlas} aria-pressed={boundaries} aria-label="Show ward boundaries" title="Ward boundaries" className={`civic-map-boundaries ${boundaries ? 'is-active' : ''}`}><Layers3 size={18} /></button>
    </div>}
    <div className="civic-map-credit"><span>GBA 2025 ward boundaries · OpenCity</span><span>{atlas ? `${atlas.geometry.wards.length} source wards` : 'Bundled geographic data'} · No street basemap</span></div>
  </div>;
}
