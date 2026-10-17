import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, List, Map as MapIcon, MapPin, Search, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_META, STATUS_META, STATUSES } from '@leadnet/shared';
import { CivicMap } from '../../components/map/CivicMap.tsx';
import { DemoBadge, EmptyState, IssueCard, LoadingState, StatusPill } from '../../components/ui/index.tsx';
import { useIssues, useWards } from '../../lib/data.ts';

const filterClass = 'min-h-11 min-w-0 w-full rounded-pill border border-hairline bg-surface px-4 text-[13px] text-ink-2';

export function Component() {
  const [params] = useSearchParams();
  const [ward, setWard] = useState(params.get('ward') ?? params.get('wardId') ?? '');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileList, setMobileList] = useState(false);
  const reduceMotion = useReducedMotion();
  const issues = useIssues();
  const wards = useWards();
  const filtered = useMemo(() => issues.data.filter((issue) => issue.status !== 'duplicate' && (!ward || issue.wardId === ward) && (!category || issue.category === category) && (!status || issue.status === status) && (!search || `${issue.title.en} ${issue.title.kn} ${issue.wardName ?? ''}`.toLowerCase().includes(search.toLowerCase()))), [issues.data, ward, category, status, search]);
  const selectedIssue = filtered.find((issue) => issue.id === selected);
  const activeWard = wards.data.find((record) => record.id === ward);
  const hasFilters = Boolean(ward || category || status || search);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  function clearFilters() { setWard(''); setCategory(''); setStatus(''); setSearch(''); setSelected(null); }

  return <section className="isolate flex h-[calc(100svh-76px)] min-h-[720px] flex-col overflow-hidden bg-canvas">
    <header className="relative z-10 border-b border-hairline px-5 pb-5 pt-6 sm:px-8 sm:pt-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">City explorer</p><h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">The city, in view.</h1><p lang="kn" className="mt-1 text-[14px] text-ink-3 sm:text-[16px]">ನಮ್ಮ ನಗರದ ಸಮಸ್ಯೆಗಳು.</p></div><div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:items-center"><DemoBadge>Prototype</DemoBadge><button type="button" className="flex min-h-11 items-center gap-2 rounded-pill border border-hairline bg-surface px-4 text-[13px] font-medium lg:hidden" onClick={() => setMobileList(!mobileList)} aria-controls="civic-issue-list" aria-pressed={mobileList}>{mobileList ? <MapIcon size={16} /> : <List size={16} />}{mobileList ? 'Show map' : 'Issue list'}</button></div></div>
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-[minmax(200px,1fr)_minmax(120px,200px)_minmax(120px,180px)_minmax(120px,180px)]"><label className="col-span-2 flex min-h-11 items-center gap-2.5 rounded-pill border border-hairline bg-surface px-4 md:col-span-1"><Search size={16} className="shrink-0 text-ink-3" /><input value={search} onChange={(event) => { setSearch(event.target.value); setSelected(null); }} placeholder="Find an issue or neighbourhood" aria-label="Search issues" className="w-full min-w-0 bg-transparent text-[13px]" /></label><select aria-label="Filter by ward" value={ward} onChange={(event) => { setWard(event.target.value); setSelected(null); }} className={filterClass}><option value="">All wards</option>{wards.data.slice().sort((a, b) => a.name.en.localeCompare(b.name.en)).map((record) => <option value={record.id} key={record.id}>{record.name.en}</option>)}</select><select aria-label="Filter by category" value={category} onChange={(event) => { setCategory(event.target.value); setSelected(null); }} className={filterClass}><option value="">All categories</option>{CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_META[value].en}</option>)}</select><select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setSelected(null); }} className={`${filterClass} col-span-2 md:col-span-1`}><option value="">All statuses</option>{STATUSES.filter((value) => value !== 'duplicate').map((value) => <option key={value} value={value}>{STATUS_META[value].short}</option>)}</select></div>
    </header>
    <div className="relative min-h-0 flex-1">
      <CivicMap issues={filtered} onSelect={setSelected} selectedId={selected} wardId={ward} initialView="3d" className={`${mobileList ? 'hidden' : 'block'} absolute inset-0 lg:block lg:[--civic-map-inset-left:360px]`} />
      <aside id="civic-issue-list" className={`${mobileList ? 'flex' : 'hidden'} absolute inset-0 z-10 flex-col overflow-hidden bg-surface lg:inset-y-4 lg:left-4 lg:right-auto lg:flex lg:w-[336px] lg:rounded-xl lg:border lg:border-hairline lg:shadow-card`} aria-label="Civic issue list"><div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-5 py-4"><div><p className="text-[15px] font-semibold tracking-tight">{activeWard?.name.en ?? 'On the public record'}</p><p className="mt-1 text-[12px] tabular-nums text-ink-3">{issues.loading ? 'Loading civic records' : `${filtered.length} matching records`}</p></div>{hasFilters && <button type="button" onClick={clearFilters} className="flex min-h-11 shrink-0 items-center gap-1 rounded-pill px-2 text-[12px] text-link">Clear<X size={13} /></button>}</div><div className="min-h-0 flex-1 overflow-y-auto px-5">{issues.loading ? <LoadingState /> : issues.error ? <div className="py-6"><EmptyState title="Records are unavailable" description="The civic record could not connect. Try again when the service is available." /></div> : filtered.length ? filtered.map((issue) => <IssueCard key={issue.id} issue={issue} compact />) : <div className="py-6"><EmptyState title="No matching issues" description="Try another ward or clear your filters.">{hasFilters && <button type="button" onClick={clearFilters} className="min-h-11 text-[13px] text-link">Clear filters</button>}</EmptyState></div>}</div><p className="shrink-0 border-t border-hairline px-5 py-3 text-[11px] leading-relaxed text-ink-3">Demo labels identify fictional reports and illustration photos.</p></aside>
      <AnimatePresence initial={false}>
        {selectedIssue && !mobileList && <motion.section key={selectedIssue.id} role="region" aria-labelledby="selected-issue-title" initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.99 }} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34, mass: 0.85 }} className="absolute bottom-12 left-4 right-4 z-20 max-h-[calc(100%_-_80px)] overflow-y-auto rounded-xl border border-hairline bg-surface shadow-float lg:left-[372px] lg:right-auto lg:w-[360px]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-1"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Selected issue</p><button type="button" onClick={() => setSelected(null)} aria-label="Close selected issue" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-pill text-ink-3 transition-colors hover:bg-fill"><X size={18} /></button></div>
          <div className="p-4"><div className="flex items-start gap-4">{selectedIssue.coverPhotoUrl && <img src={selectedIssue.coverPhotoUrl} alt={CATEGORY_META[selectedIssue.category].en} className="h-16 w-16 shrink-0 rounded-md object-cover" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><StatusPill status={selectedIssue.status} />{selectedIssue.isDemo && <span className="text-[11px] text-ink-3">Demo</span>}</div><h2 id="selected-issue-title" className="mt-2 line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight">{selectedIssue.title.en}</h2></div></div><p lang="kn" className="mt-2 line-clamp-1 text-[13px] text-ink-3">{selectedIssue.title.kn}</p><p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-3"><MapPin size={13} />{selectedIssue.wardName ?? 'Bengaluru'}</p><div className="mt-3 flex items-center gap-4"><Link to={`/issue/${selectedIssue.id}`} className="flex min-h-11 flex-1 items-center justify-between rounded-pill bg-primary px-5 text-[13px] font-medium text-on-primary">Open public record<ArrowUpRight size={16} /></Link><Link to={`/pass/${selectedIssue.id}`} className="flex min-h-11 items-center text-[12px] text-link">Issue Pass</Link></div></div>
        </motion.section>}
      </AnimatePresence>
    </div>
  </section>;
}
