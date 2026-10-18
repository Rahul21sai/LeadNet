import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, ChevronRight, Clock3, List, Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_META, computeLedger, STATUS_META, STATUSES, type IssueDoc } from '@leadnet/shared';
import { CivicMap } from '../../components/map/CivicMap.tsx';
import { civicStatusTokens } from '../../components/map/civicAtlas.ts';
import { DemoBadge, LoadingState, StatusPill } from '../../components/ui/index.tsx';
import { useIssues, useWards } from '../../lib/data.ts';
import { timeAgo } from '../../lib/format.ts';
import './explorer.css';

export function Component() {
  const [params] = useSearchParams();
  const [ward, setWard] = useState(params.get('ward') ?? params.get('wardId') ?? '');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileList, setMobileList] = useState(false);
  const mapPanel = useRef<HTMLDivElement>(null);
  const selectedHeading = useRef<HTMLHeadingElement>(null);
  const selectionOrigin = useRef<{ element: HTMLElement | null; wasMobileList: boolean } | null>(null);
  const pendingRestore = useRef<HTMLElement | null>(null);
  const pendingSelectionFocus = useRef(false);
  const reduceMotion = useReducedMotion();
  const issues = useIssues();
  const wards = useWards();
  const filtered = useMemo(() => issues.data.filter((issue) => issue.status !== 'duplicate' && (!ward || issue.wardId === ward) && (!category || issue.category === category) && (!status || issue.status === status) && (!search.trim() || `${issue.title.en} ${issue.title.kn} ${issue.wardName ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))), [issues.data, ward, category, status, search]);
  const metrics = useMemo(() => computeLedger(filtered, Date.now()), [filtered]);
  const selectedIssue = filtered.find((issue) => issue.id === selected);
  const activeWard = wards.data.find((record) => record.id === ward);
  const hasFilters = Boolean(ward || category || status || search);

  const closeSelection = useCallback(() => {
    pendingRestore.current = selectionOrigin.current?.element ?? null;
    if (selectionOrigin.current?.wasMobileList) setMobileList(true);
    selectionOrigin.current = null;
    pendingSelectionFocus.current = false;
    setSelected(null);
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && selected) { event.preventDefault(); closeSelection(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selected, closeSelection]);

  useEffect(() => {
    if (selected && !mobileList && pendingSelectionFocus.current && selectedHeading.current) {
      selectedHeading.current.focus({ preventScroll: true });
      pendingSelectionFocus.current = false;
    } else if (!selected && pendingRestore.current) {
      const target = pendingRestore.current.isConnected && pendingRestore.current !== document.body ? pendingRestore.current : mapPanel.current;
      target?.focus({ preventScroll: true });
      pendingRestore.current = null;
    }
  }, [selected, mobileList]);

  function clearFilters() { setWard(''); setCategory(''); setStatus(''); setSearch(''); setSelected(null); }
  function selectIssue(id: string, element?: HTMLElement) {
    selectionOrigin.current = { element: element ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null), wasMobileList: mobileList && window.matchMedia('(max-width: 800px)').matches };
    pendingSelectionFocus.current = true;
    setSelected(id); setMobileList(false);
  }
  function changeFilter(set: (value: string) => void, value: string) { set(value); setSelected(null); }

  return <section className="civic-explorer" aria-labelledby="explorer-title">
    <header className="civic-explorer-header">
      <div><div className="civic-explorer-heading"><h1 id="explorer-title">The city, in view.</h1><DemoBadge>Prototype</DemoBadge></div><p lang="kn">ನಮ್ಮ ನಗರದ ಸಮಸ್ಯೆಗಳು.</p></div>
      <div className="civic-explorer-summary" aria-label="Outcomes in the filtered records">
        <span><span className="civic-explorer-summary__dot" />{issues.loading ? '—' : metrics.open.value}<small>Open</small></span>
        <span><Clock3 size={14} />{issues.loading ? '—' : metrics.awaitingCheck.value}<small>Awaiting check</small></span>
        <span><Check size={14} />{issues.loading ? '—' : metrics.verified.value}<small>Verified</small></span>
      </div>
    </header>
    <div className="civic-explorer-filters" role="search" aria-label="Find civic records">
      <label className="civic-explorer-search"><Search size={17} aria-hidden="true" /><input value={search} onChange={(event) => changeFilter(setSearch, event.target.value)} placeholder="Find an issue or neighbourhood" aria-label="Search issues" />{search && <button type="button" aria-label="Clear search" onClick={() => changeFilter(setSearch, '')}><X size={14} /></button>}</label>
      <div className="civic-explorer-selects"><SlidersHorizontal size={15} aria-hidden="true" /><select aria-label="Filter by ward" value={ward} onChange={(event) => changeFilter(setWard, event.target.value)}><option value="">All wards</option>{wards.data.slice().sort((a, b) => a.name.en.localeCompare(b.name.en)).map((record) => <option value={record.id} key={record.id}>{record.name.en}</option>)}</select><select aria-label="Filter by category" value={category} onChange={(event) => changeFilter(setCategory, event.target.value)}><option value="">All categories</option>{CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_META[value].en}</option>)}</select><select aria-label="Filter by status" value={status} onChange={(event) => changeFilter(setStatus, event.target.value)}><option value="">All statuses</option>{STATUSES.filter((value) => value !== 'duplicate').map((value) => <option key={value} value={value}>{STATUS_META[value].short}</option>)}</select></div>
    </div>
    <div className="civic-explorer-context"><p aria-live="polite"><strong>{issues.loading ? 'Loading' : filtered.length}</strong> {issues.loading ? 'civic records' : 'matching records'}<span> / {activeWard?.name.en ?? 'Bengaluru'}</span></p>{hasFilters && <button type="button" onClick={clearFilters}>Clear filters<X size={13} /></button>}<div className="civic-explorer-mobile-view" role="group" aria-label="Explorer view"><button type="button" onClick={() => setMobileList(false)} aria-pressed={!mobileList} aria-controls="civic-map-panel"><MapIcon size={14} />Map</button><button type="button" onClick={() => setMobileList(true)} aria-pressed={mobileList} aria-controls="civic-issue-list"><List size={14} />List</button></div></div>
    <div className={`civic-workspace ${mobileList ? 'is-list-view' : 'is-map-view'}`}>
      <aside id="civic-issue-list" className="civic-explorer-list" aria-label="Civic issue list">
        <div className="civic-explorer-list__heading"><p>On the public record</p><span>Most recently updated</span></div>
        <div className="civic-explorer-list__records">
          {issues.loading ? <LoadingState /> : issues.error ? <div className="civic-explorer-empty"><p>Records are unavailable</p><span>The civic record could not connect. Try again when the service is available.</span></div> : filtered.length ? filtered.map((issue) => <RecordRow key={issue.id} issue={issue} selected={issue.id === selected} onSelect={selectIssue} />) : <div className="civic-explorer-empty"><Search size={24} strokeWidth={1.3} /><p>No matching issues</p><span>Try another neighbourhood or category.</span>{hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}</div>}
        </div>
        <div className="civic-explorer-list__foot">Every claim has a record. Every verified fix has a citizen check.</div>
      </aside>
      <div id="civic-map-panel" className="civic-explorer-map-panel" ref={mapPanel} tabIndex={-1}>
        <CivicMap issues={filtered} onSelect={selectIssue} selectedId={selected} wardId={ward} initialView="2d" />
        <div className="civic-explorer-legend" aria-label="Map marker legend"><span><i className="is-open" />Reported</span><span><i className="is-awaiting" />Awaiting check</span><span><i className="is-verified" />Verified</span><span><i className="is-reopened" />Reopened</span></div>
        <AnimatePresence initial={false}>
          {selectedIssue && <motion.section key={selectedIssue.id} role="region" aria-labelledby="selected-issue-title" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }} className="civic-explorer-selected">
            <div className="civic-explorer-selected__heading"><span>{selectedIssue.passCode}{selectedIssue.isDemo ? ' · Demo record' : ''}</span><button type="button" onClick={closeSelection} aria-label="Close selected issue"><X size={16} /></button></div>
            <div className="civic-explorer-selected__body"><div className="civic-explorer-selected__top">{selectedIssue.coverPhotoUrl && <img src={selectedIssue.coverPhotoUrl} alt={CATEGORY_META[selectedIssue.category].en} />}<div><StatusPill status={selectedIssue.status} /><h2 id="selected-issue-title" ref={selectedHeading} tabIndex={-1}>{selectedIssue.title.en}</h2></div></div><p lang="kn">{selectedIssue.title.kn}</p><p className="civic-explorer-selected__location"><MapPin size={12} />{selectedIssue.wardName ?? 'Bengaluru'}<span>{selectedIssue.reportCount} reports</span></p><Link to={`/issue/${selectedIssue.id}`} className="civic-explorer-selected__link">Open public record<ArrowUpRight size={16} /></Link></div>
          </motion.section>}
        </AnimatePresence>
      </div>
    </div>
    <p className="civic-explorer-note">Map positions and photos marked Demo are illustrative. <Link to="/how-it-works">How the public record works<ArrowUpRight size={12} /></Link></p>
  </section>;
}

function RecordRow({ issue, selected, onSelect }: { issue: IssueDoc; selected: boolean; onSelect: (id: string, element: HTMLButtonElement) => void }) {
  return <button type="button" className={`civic-record-row ${selected ? 'is-selected' : ''}`} onClick={(event) => onSelect(issue.id, event.currentTarget)} aria-pressed={selected} aria-label={`Select ${issue.title.en}`} style={{ '--record-status': `var(--color-${civicStatusTokens[issue.status]})` } as CSSProperties}>
    {issue.coverPhotoUrl ? <img src={issue.coverPhotoUrl} alt="" loading="lazy" /> : <span className="civic-record-row__placeholder"><MapPin size={20} strokeWidth={1.3} /></span>}
    <span className="civic-record-row__content"><span className="civic-record-row__status"><i />{STATUS_META[issue.status].short}{issue.isDemo && <small>Demo</small>}</span><span className="civic-record-row__title">{issue.title.en}</span><span className="civic-record-row__meta">{issue.wardName ?? 'Bengaluru'}<span>{timeAgo(issue.lastEventAt)}</span></span></span><ChevronRight size={14} className="civic-record-row__arrow" />
  </button>;
}
