import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { AnimatePresence, animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionStyle } from 'motion/react';
import { ArrowDown, ArrowUpRight, Check, CheckCheck, ChevronLeft, ChevronRight, Circle, Clock3, Copy, Layers3, MapPin, RotateCcw, RotateCw, Square, Wrench, X, type LucideIcon } from 'lucide-react';
import { CATEGORY_META, STATUS_META, type IssueDoc, type Status } from '@leadnet/shared';
import { buildSpatialGeometry, type SpatialGeometry } from './geometry.ts';
import './spatial.css';

export interface SpatialCityProps {
  issues: IssueDoc[];
  loading?: boolean;
  onSelectIssue?: (id: string) => void;
  className?: string;
}

const statusTokens: Record<Status, string> = { reported: 'reported', acknowledged: 'ack', in_progress: 'progress', resolved_pending_verification: 'awaiting', verified: 'verified', reopened: 'reopened', rejected: 'closed', duplicate: 'closed' };
const statusIcons: Record<Status, LucideIcon> = { reported: Circle, acknowledged: CheckCheck, in_progress: Wrench, resolved_pending_verification: Clock3, verified: Check, reopened: RotateCcw, rejected: X, duplicate: Copy };
const filters = [{ value: 'all', label: 'All records' }, { value: 'resolved_pending_verification', label: 'Awaiting check' }, { value: 'verified', label: 'Verified' }, { value: 'reopened', label: 'Reopened' }] as const;
type Filter = (typeof filters)[number]['value'];
let geometryPromise: Promise<SpatialGeometry> | undefined;

function loadGeometry(): Promise<SpatialGeometry> {
  geometryPromise ??= fetch('/data/wards.geojson').then(async (response) => {
    if (!response.ok) throw new Error('Ward boundaries could not be loaded.');
    return buildSpatialGeometry(await response.json());
  }).catch((error: unknown) => { geometryPromise = undefined; throw error; });
  return geometryPromise;
}

function statusStyle(status: Status): CSSProperties {
  return { '--spatial-status': `var(--color-st-${statusTokens[status]})`, '--spatial-status-tint': `var(--color-st-${statusTokens[status]}-tint)` } as CSSProperties;
}

function visiblePins(records: IssueDoc[], geometry: SpatialGeometry): IssueDoc[] {
  const cells = new Set<string>();
  return records.filter((record) => {
    const point = geometry.project(record.location.lng, record.location.lat);
    const cell = `${Math.floor(point.x / 105)}:${Math.floor(point.y / 105)}`;
    if (cells.has(cell)) return false;
    cells.add(cell); return true;
  }).slice(0, 42);
}

export function SpatialCity({ issues, loading = false, onSelectIssue, className = '' }: SpatialCityProps) {
  const prefix = `spatial-city-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const reducedMotion = useReducedMotion();
  const [geometry, setGeometry] = useState<SpatialGeometry | null>(null);
  const [geometryError, setGeometryError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'spatial' | 'overhead'>('spatial');
  const [rotationStep, setRotationStep] = useState(0);
  const [finePointer, setFinePointer] = useState(false);
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const pointerBounds = useRef<DOMRect | null>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const baseX = useMotionValue(49);
  const baseZ = useMotionValue(-19);
  const targetX = useTransform([baseX, pointerY], ([base, pointer]) => Number(base) + Number(pointer) * 3.5);
  const targetZ = useTransform([baseZ, pointerX], ([base, pointer]) => Number(base) + Number(pointer) * 3.5);
  const rotateX = useSpring(targetX, { stiffness: 240, damping: 34, mass: 0.8 });
  const rotateZ = useSpring(targetZ, { stiffness: 240, damping: 34, mass: 0.8 });
  const rotationX = useMotionTemplate`${rotateX}deg`;
  const rotationZ = useMotionTemplate`${rotateZ}deg`;

  useEffect(() => {
    let active = true; setGeometryError('');
    void loadGeometry().then((data) => { if (active) setGeometry(data); }, (error: unknown) => { if (active) setGeometryError(error instanceof Error ? error.message : 'The ward model is unavailable.'); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFinePointer(media.matches); update();
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const duration = reducedMotion ? 0 : 0.45;
    const x = animate(baseX, view === 'overhead' ? 0 : 49, { duration, ease: [0.32, 0.72, 0, 1] });
    const z = animate(baseZ, -19 + rotationStep * 18, { duration, ease: [0.32, 0.72, 0, 1] });
    pointerX.set(0); pointerY.set(0);
    return () => { x.stop(); z.stop(); };
  }, [view, rotationStep, reducedMotion, baseX, baseZ, pointerX, pointerY]);

  const records = useMemo(() => issues.filter((issue) => issue.status !== 'duplicate' && Number.isFinite(issue.location.lat) && Number.isFinite(issue.location.lng)), [issues]);
  const filtered = useMemo(() => records.filter((issue) => filter === 'all' || issue.status === filter), [records, filter]);
  const selected = filtered.find((issue) => issue.id === selectedId) ?? filtered[0] ?? null;
  const pins = useMemo(() => {
    if (!geometry) return [];
    const candidates = visiblePins(filtered, geometry);
    if (selected && !candidates.some((issue) => issue.id === selected.id)) return [selected, ...candidates.slice(0, 41)];
    return candidates;
  }, [filtered, geometry, selected]);
  const corporationIds = useMemo(() => [...new Set(geometry?.wards.map((ward) => ward.corporation) ?? [])].sort(), [geometry]);
  const selectedWard = geometry?.wards.find((ward) => ward.id === selected?.wardId);

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotion || !finePointer || event.pointerType !== 'mouse' || view === 'overhead') return;
    const bounds = pointerBounds.current ?? event.currentTarget.getBoundingClientRect();
    pointerX.set(Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2)));
    pointerY.set(Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2)));
  }
  function resetView() { setView('spatial'); setRotationStep(0); pointerX.set(0); pointerY.set(0); }
  function stepRecord(direction: number) {
    if (!filtered.length) return;
    const index = Math.max(0, filtered.findIndex((issue) => issue.id === selected?.id));
    setSelectedId(filtered[(index + direction + filtered.length) % filtered.length]!.id);
  }
  function markerKey(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!direction && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const index = pins.findIndex((issue) => issue.id === id);
    const next = pins[event.key === 'Home' ? 0 : event.key === 'End' ? pins.length - 1 : (index + direction + pins.length) % pins.length];
    if (next) { setSelectedId(next.id); markerRefs.current.get(next.id)?.focus({ preventScroll: true }); }
  }
  function openRecord() { if (!selected) return; if (onSelectIssue) onSelectIssue(selected.id); else window.location.assign(`/issue/${encodeURIComponent(selected.id)}`); }
  const planeStyle = { '--spatial-rotate-x': reducedMotion ? `${view === 'overhead' ? 0 : 49}deg` : rotationX, '--spatial-rotate-z': reducedMotion ? `${-19 + rotationStep * 18}deg` : rotationZ } as MotionStyle;
  const recordIndex = Math.max(0, filtered.findIndex((issue) => issue.id === selected?.id));

  return <section className={`spatial-city ${className}`} aria-label="Interactive spatial model of Bengaluru">
    <p className="spatial-city-announcement" role="status" aria-live="polite">{selected ? `Selected record: ${selected.title.en}. ${STATUS_META[selected.status].short}.${selected.isDemo ? ' Fictional demo record.' : ''}` : loading ? 'Loading civic records.' : 'No civic records match this view.'}</p>
    <div className="spatial-city-stage" data-view={view} onPointerEnter={(event) => { pointerBounds.current = event.currentTarget.getBoundingClientRect(); }} onPointerMove={movePointer} onPointerLeave={() => { pointerBounds.current = null; pointerX.set(0); pointerY.set(0); }}>
      <div className="spatial-city-map-label"><span className="spatial-city-location"><MapPin size={14} aria-hidden="true" />Bengaluru</span><p>Real boundaries. A shared record.</p></div>
      <div className="spatial-city-view-controls" role="group" aria-label="City view">
        <button type="button" aria-label="Perspective view" aria-pressed={view === 'spatial'} onClick={() => setView('spatial')} title="Perspective view"><Layers3 size={15} aria-hidden="true" /><span>Spatial</span></button>
        <button type="button" aria-label="Overhead view" aria-pressed={view === 'overhead'} onClick={() => setView('overhead')} title="Overhead view"><Square size={14} aria-hidden="true" /><span>Overhead</span></button>
      </div>

      <div className="spatial-city-world">
        <motion.div className="spatial-city-plane" style={planeStyle}>
          <div className="spatial-city-ground-shadow" aria-hidden="true" />
          {geometry && <>
            {[0, 1, 2, 3].map((level) => <svg key={level} className={`spatial-city-land-layer spatial-city-land-layer-${level}`} viewBox={geometry.viewBox} aria-hidden="true"><use href={`#${prefix}-land`} /></svg>)}
            <svg className="spatial-city-surface" viewBox={geometry.viewBox} aria-label={`Bengaluru source geometry with ${geometry.wards.length} wards`} role="img">
              <defs><g id={`${prefix}-land`}>{geometry.wards.map((ward) => <path key={ward.id} d={ward.path} fillRule="evenodd" />)}</g></defs>
              <title>Greater Bengaluru Authority ward boundaries, 2025 delimitation, via OpenCity.</title>
              {geometry.wards.map((ward) => <path key={ward.id} d={ward.path} fillRule="evenodd" vectorEffect="non-scaling-stroke" className={`spatial-city-ward spatial-city-corporation-${corporationIds.indexOf(ward.corporation)}`} data-selected={ward.id === selected?.wardId || undefined} style={selected && ward.id === selected.wardId ? statusStyle(selected.status) : undefined}><title>{ward.name}{ward.kn ? ` / ${ward.kn}` : ''}</title></path>)}
              <g className="spatial-city-flat-points" aria-hidden="true">{filtered.map((issue) => { const point = geometry.project(issue.location.lng, issue.location.lat); return <circle key={issue.id} cx={point.x} cy={point.y} r={issue.id === selected?.id ? 6 : 3.4} style={statusStyle(issue.status)} />; })}</g>
            </svg>
            <div className="spatial-city-north" aria-hidden="true"><ArrowDown size={16} /><span>N</span></div>
            {selectedWard && <div className="spatial-city-ward-label" style={{ left: `${selectedWard.label.x / 10}%`, top: `${selectedWard.label.y / 10}%` }} aria-hidden="true"><span>{selectedWard.name}</span></div>}
            <div className="spatial-city-pin-field" role="group" aria-label="Civic issue pins. Use arrow keys to move between pins, or select any record below.">
              {pins.map((issue) => {
                const point = geometry.project(issue.location.lng, issue.location.lat); const Icon = statusIcons[issue.status]; const active = issue.id === selected?.id;
                return <div key={issue.id} className="spatial-city-pin-anchor" data-selected={active || undefined} style={{ left: `${point.x / 10}%`, top: `${point.y / 10}%`, '--spatial-pin-height': `${active ? 70 : 46}px`, ...statusStyle(issue.status) } as CSSProperties}>
                  <span className="spatial-city-pin-stem" aria-hidden="true" />
                  <button ref={(node) => { if (node) markerRefs.current.set(issue.id, node); else markerRefs.current.delete(issue.id); }} type="button" className="spatial-city-pin" aria-label={`${STATUS_META[issue.status].short}: ${issue.title.en}${issue.isDemo ? '. Fictional demo record' : ''}`} aria-pressed={active} tabIndex={active ? 0 : -1} onClick={() => setSelectedId(issue.id)} onKeyDown={(event) => markerKey(event, issue.id)}><span className="spatial-city-pin-face"><Icon size={active ? 15 : 12} strokeWidth={2.2} aria-hidden="true" /></span></button>
                </div>;
              })}
            </div>
          </>}
        </motion.div>
      </div>

      {!geometry && !geometryError && <div className="spatial-city-model-status" role="status"><Layers3 size={25} /><p>Building the city view…</p><span>Loading bundled ward boundaries</span></div>}
      {geometryError && <div className="spatial-city-model-status" role="alert"><MapPin size={25} /><p>The ward model is unavailable.</p><span>Records remain available in the selector below.</span><button type="button" onClick={() => setRetry((value) => value + 1)}>Retry boundaries</button></div>}

      <AnimatePresence mode="wait" initial={false}>
        {selected && <motion.article key={selected.id} className="spatial-city-inspector" style={statusStyle(selected.status)} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -5 }} transition={{ duration: reducedMotion ? 0 : 0.17 }} aria-label="Selected civic record">
          <div className="spatial-city-inspector-meta"><span className="spatial-city-status"><span aria-hidden="true" />{STATUS_META[selected.status].short}</span>{selected.isDemo && <span className="spatial-city-demo">Demo record</span>}</div>
          <div className="spatial-city-inspector-content">{selected.coverPhotoUrl && <img src={selected.coverPhotoUrl} alt={`${CATEGORY_META[selected.category].en} evidence${selected.isDemo ? ' illustration' : ''}`} />}<div><h3>{selected.title.en}</h3><p><MapPin size={11} aria-hidden="true" />{selected.wardName ?? 'Bengaluru'}</p></div></div>
          <div className="spatial-city-inspector-footer"><span>{selected.reportCount} {selected.reportCount === 1 ? 'report' : 'reports'}</span><button type="button" onClick={openRecord}>Open record<ArrowUpRight size={14} aria-hidden="true" /></button></div>
        </motion.article>}
      </AnimatePresence>

      <div className="spatial-city-orientation" role="group" aria-label="Rotate city model"><button type="button" aria-label="Rotate city left" onClick={() => setRotationStep((value) => value - 1)}><RotateCcw size={16} /></button><button type="button" className="spatial-city-reset" onClick={resetView}>Reset view</button><button type="button" aria-label="Rotate city right" onClick={() => setRotationStep((value) => value + 1)}><RotateCw size={16} /></button></div>
      <p className="spatial-city-map-footnote">{geometry ? `${geometry.wards.length} source wards` : 'Bengaluru ward model'}<span aria-hidden="true"> / </span>{finePointer && !reducedMotion ? 'Move to explore the depth' : 'Tap a pin or choose a record'}</p>
    </div>

    <div className="spatial-city-filter-bar" role="group" aria-label="Filter civic records by status">{filters.map((option) => <button key={option.value} type="button" aria-pressed={filter === option.value} style={option.value === 'all' ? undefined : statusStyle(option.value)} onClick={() => { setFilter(option.value); setSelectedId(null); }}>{option.value !== 'all' && <span className="spatial-city-filter-dot" aria-hidden="true" />}{option.label}</button>)}</div>
    <div className="spatial-city-record-picker"><div className="spatial-city-select-wrap"><label htmlFor={`${prefix}-record`}>Explore a civic record</label><select id={`${prefix}-record`} value={selected?.id ?? ''} disabled={loading || !filtered.length} onChange={(event) => setSelectedId(event.target.value)}>{filtered.length ? filtered.map((issue) => <option key={issue.id} value={issue.id}>{STATUS_META[issue.status].short} · {issue.title.en}{issue.isDemo ? ' (demo)' : ''}</option>) : <option value="">{loading ? 'Loading records…' : 'No records in this view'}</option>}</select></div><div className="spatial-city-record-stepper"><button type="button" aria-label="Previous record" disabled={!filtered.length} onClick={() => stepRecord(-1)}><ChevronLeft size={18} /></button><span aria-label={`Record ${filtered.length ? recordIndex + 1 : 0} of ${filtered.length}`}>{filtered.length ? recordIndex + 1 : 0}<span> / {filtered.length}</span></span><button type="button" aria-label="Next record" disabled={!filtered.length} onClick={() => stepRecord(1)}><ChevronRight size={18} /></button></div></div>
    <p className="spatial-city-attribution">Boundaries: GBA 2025 delimitation, via <a href="https://data.opencity.in/dataset/gba-wards-delimitation-2025" target="_blank" rel="noreferrer">OpenCity</a>. Positions and photos marked Demo are illustrative.</p>
  </section>;
}
