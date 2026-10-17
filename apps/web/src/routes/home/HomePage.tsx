import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, CircleDot, FileText, MapPin, ShieldCheck } from 'lucide-react';
import { CATEGORY_META, STATUS_META, type Category, type IssueDoc, type Status } from '@leadnet/shared';
import { SpatialCity } from '../../components/spatial/SpatialCity.tsx';
import { DemoBadge, EmptyState, IssueCard, LoadingState, StatusPill, buttonClass } from '../../components/ui/index.tsx';
import { useIssue, useIssues, useLedger, useMyProfile } from '../../lib/data.ts';
import { formatNumber } from '../../lib/format.ts';
import './home.css';

const stages: Array<{ label: string; kn: string; heading: string; description: string; detail: string; statuses: Status[]; link: string; action: string }> = [
  { label: 'Report', kn: 'ವರದಿ', heading: 'One place to start.', description: 'A photo, a few words, or your voice. Put the problem on the map and check the draft before it becomes public.', detail: 'Nearby reports can join one issue. Every original report stays on the record.', statuses: ['reported'], link: '/report', action: 'Start a report' },
  { label: 'Act', kn: 'ಕ್ರಮ', heading: 'See the work take shape.', description: 'Follow acknowledgement, work in progress, and the repair evidence. Each action becomes part of the public timeline.', detail: 'An officer can claim a fix. A suspicious photo is held for review, with any override visible.', statuses: ['acknowledged', 'in_progress'], link: '/officer', action: 'Explore the officer demo' },
  { label: 'Verify', kn: 'ಪರಿಶೀಲನೆ', heading: 'The people affected check the fix.', description: 'Reporters and supporters confirm whether the repair worked. A disputed claim can reopen the issue.', detail: 'Only eligible citizens vote. Silence never counts as a verified fix.', statuses: ['resolved_pending_verification', 'verified', 'reopened'], link: '/map', action: 'Find a public record' },
  { label: 'Measure', kn: 'ಫಲಿತಾಂಶ', heading: 'Keep the gap in view.', description: 'Compare fixes claimed with fixes citizens verified. Open the definition behind every metric and its sample size.', detail: 'The ledger uses the issue records. Every public number comes from code.', statuses: ['verified', 'reopened'], link: '/ledger', action: 'Read the outcome ledger' },
];

const categories: Array<{ id: Category | 'all'; label: string }> = [
  { id: 'all', label: 'All issues' }, { id: 'pothole', label: 'Roads' }, { id: 'garbage', label: 'Waste' },
  { id: 'drainage', label: 'Drainage' }, { id: 'streetlight', label: 'Streetlights' },
];

function WalkthroughRecord({ issue }: { issue: IssueDoc | undefined }) {
  if (!issue) return <div className="home-record-empty"><MapPin size={24} strokeWidth={1.25} /><p>Every report starts a public trail.</p><Link to="/report" className="text-link">Start the first record</Link></div>;
  return <Link to={`/issue/${issue.id}`} className="home-proof-record group">
    <div className="home-proof-photo">{issue.coverPhotoUrl ? <img src={issue.coverPhotoUrl} alt={CATEGORY_META[issue.category].en} loading="lazy" /> : <MapPin size={32} strokeWidth={1.25} />}<div className="home-proof-stamp"><StatusPill status={issue.status} /></div></div>
    <div className="home-proof-body"><div className="flex items-center justify-between gap-3"><p className="text-xs text-ink-3">{issue.passCode}</p>{issue.isDemo && <DemoBadge />}</div><h3 className="mt-3 text-xl font-semibold leading-snug tracking-tight">{issue.title.en}</h3><p className="mt-3 flex items-start gap-1.5 text-xs text-ink-3"><MapPin size={13} className="mt-0.5 shrink-0" />{issue.wardName ?? 'Bengaluru'}</p><span className="mt-5 flex min-h-11 items-center justify-between border-t border-hairline pt-3 text-sm text-link">Open the record<ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" /></span></div>
  </Link>;
}

function OlderFollowedRecord({ id }: { id: string }) {
  const issue = useIssue(id);
  if (issue.loading) return <LoadingState />;
  if (!issue.data || issue.error) return <p className="border-b border-hairline py-5 text-sm text-ink-3">A saved record is currently unavailable.</p>;
  return <IssueCard issue={issue.data} compact />;
}

export function HomePage() {
  const issues = useIssues(); const ledger = useLedger(); const profile = useMyProfile(); const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [stageIndex, setStageIndex] = useState(0);
  const metrics = ledger.data?.city;
  const activeStage = stages[stageIndex]!;
  const records = useMemo(() => issues.data.filter((issue) => issue.status !== 'duplicate' && issue.status !== 'rejected'), [issues.data]);
  const recent = useMemo(() => records.filter((issue) => category === 'all' || issue.category === category).slice(0, 4), [records, category]);
  const followedIds = profile.data?.followedIssueIds ?? [];
  const stageRecord = records.find((issue) => activeStage.statuses.includes(issue.status));
  const transition = { duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] as const };

  return <>
    <section className="home-hero">
      <div className="home-hero-copy">
        <motion.p initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transition} className="home-location"><MapPin size={14} /><span>Bengaluru, Karnataka</span><span className="home-location-divider" /><span>On the record</span></motion.p>
        <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition, delay: reduceMotion ? 0 : 0.05 }} className="home-hero-title">Your city.<br />On the record.</motion.h1>
        <p lang="kn" className="home-hero-kn">ನಮ್ಮ ನಗರ. ನಮ್ಮ ಹೊಣೆ.</p>
        <p className="home-hero-description">Report what needs fixing.<br className="hidden sm:block" /> Follow the work. Verify the change.</p>
        <div className="home-hero-actions"><Link to="/report" className={`${buttonClass} home-primary-action bg-primary text-on-primary`}>Report an issue<ArrowUpRight size={16} /></Link><Link to="/map" className="home-explore-link">Explore the city<ArrowRight size={16} /></Link></div>
        <div className="home-citizen-note"><span className="home-note-icon"><ShieldCheck size={17} strokeWidth={1.6} /></span><p>Officials claim the fix.<br /><strong>Citizens verify it.</strong></p></div>
      </div>
      <div className="home-hero-scene"><SpatialCity issues={records} loading={issues.loading} onSelectIssue={(id) => navigate(`/issue/${id}`)} /></div>
    </section>

    <section className="home-ledger-strip" aria-label="City outcome snapshot">
      <div className="home-ledger-intro"><p className="flex items-center gap-2 text-sm font-medium"><CircleDot size={15} className="text-st-verified" />The public record</p><p className="mt-2 text-xs text-ink-3">A claim is just the beginning.</p><div className="mt-3"><DemoBadge>Prototype records</DemoBadge></div></div>
      <div className="home-ledger-values">{[{ key: 'issues' as const, label: 'Unique issues' }, { key: 'claimed' as const, label: 'Fixes claimed' }, { key: 'verified' as const, label: 'Citizen-verified fixes' }].map(({ key, label }) => <div className="home-ledger-value" key={key}><AnimatePresence mode="wait" initial={false}><motion.p key={metrics?.[key].value ?? 'empty'} initial={{ opacity: 0, y: reduceMotion ? 0 : 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} className={`home-metric-number ${key === 'verified' ? 'text-st-verified' : ''}`}>{formatNumber(metrics?.[key].value ?? null)}</motion.p></AnimatePresence><p className="mt-2 text-xs text-ink-3">{label}</p><p className="mt-1 text-[11px] text-ink-3">{metrics ? `n = ${formatNumber(metrics[key].n)}` : 'Awaiting records'}</p></div>)}</div>
      <Link to="/ledger" className="home-ledger-link" aria-label="Explore the public ledger"><ArrowUpRight size={22} /></Link>
    </section>

    <section className="home-walkthrough" aria-labelledby="walkthrough-heading">
      <div className="home-section-heading"><div><h2 id="walkthrough-heading">Every issue.<br />A way forward.</h2><p lang="kn" className="mt-4 text-lg text-ink-3">ವರದಿಯಿಂದ ದೃಢೀಕರಣದವರೆಗೆ.</p></div><p className="max-w-sm text-sm leading-relaxed text-ink-3">An open trail connects a report to a repair. Explore how a record moves through LeadNet.</p></div>
      <div className="home-walkthrough-grid">
        <div>
          <div className="home-step-tabs" role="tablist" aria-label="Explore the issue lifecycle">{stages.map((stage, index) => <button key={stage.label} id={`stage-tab-${index}`} role="tab" aria-selected={stageIndex === index} aria-controls="stage-panel" tabIndex={stageIndex === index ? 0 : -1} onClick={() => setStageIndex(index)} onKeyDown={(event) => { let next: number | null = null; if (event.key === 'ArrowRight') next = (index + 1) % stages.length; if (event.key === 'ArrowLeft') next = (index - 1 + stages.length) % stages.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = stages.length - 1; if (next !== null) { event.preventDefault(); setStageIndex(next); document.getElementById(`stage-tab-${next}`)?.focus(); } }} className={`home-step-tab ${stageIndex === index ? 'is-selected' : ''}`}>{stageIndex === index && <motion.span layoutId="home-step-active" className="home-step-active" transition={reduceMotion ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 360, damping: 32 }} />}<span className="relative">{stage.label}</span></button>)}</div>
          <div id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${stageIndex}`} tabIndex={0} className="home-step-panel"><AnimatePresence mode="wait" initial={false}><motion.div key={stageIndex} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }} transition={{ duration: reduceMotion ? 0 : 0.22 }}><p lang="kn" className="text-sm text-ink-3">{activeStage.kn}</p><h3 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">{activeStage.heading}</h3><p className="mt-5 max-w-md text-base leading-relaxed text-ink-3">{activeStage.description}</p><p className="home-step-detail"><Check size={16} className="mt-0.5 shrink-0 text-st-verified" />{activeStage.detail}</p><Link to={activeStage.link} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-link">{activeStage.action}<ArrowRight size={16} /></Link></motion.div></AnimatePresence></div>
        </div>
        <div className="home-record-stage"><div className="home-record-underlay home-record-underlay-back" /><div className="home-record-underlay home-record-underlay-front" /><AnimatePresence mode="wait" initial={false}><motion.div key={stageRecord?.id ?? 'empty'} className="home-record-top" initial={{ opacity: 0, rotateX: reduceMotion ? 0 : 4, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} transition={{ duration: reduceMotion ? 0 : 0.28 }}><WalkthroughRecord issue={stageRecord} /></motion.div></AnimatePresence><p className="home-record-caption"><FileText size={13} />{stageRecord ? `${STATUS_META[stageRecord.status].short} record${stageRecord.isDemo ? ' · Fictional demo' : ''}` : 'The public issue record'}</p></div>
      </div>
    </section>

    {followedIds.length > 0 && <section className="home-followed"><h2 className="text-2xl font-semibold tracking-tight">Your followed records</h2><p className="mt-2 text-sm text-ink-3">Private to this account. Open a record to see its latest evidence and updates.</p><div className="mt-4 grid gap-x-8 md:grid-cols-2">{followedIds.map((id) => { const known = issues.data.find((issue) => issue.id === id); return known ? <IssueCard key={id} issue={known} compact /> : <OlderFollowedRecord key={id} id={id} />; })}</div></section>}

    <section className="home-neighbourhood" aria-labelledby="neighbourhood-heading"><div className="home-section-heading"><div><h2 id="neighbourhood-heading">Closer to home.</h2><p lang="kn" className="mt-3 text-lg text-ink-3">ನಿಮ್ಮ ಸುತ್ತಲಿನ ಸಮಸ್ಯೆಗಳು.</p></div><Link to="/map" className="home-explore-link">Explore every issue<ArrowUpRight size={16} /></Link></div><div className="home-feed-toolbar"><div className="home-feed-filters" aria-label="Filter recent issues">{categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={`home-feed-filter ${category === item.id ? 'is-selected' : ''}`}>{item.label}</button>)}</div><p className="text-xs text-ink-3">{issues.loading ? 'Loading the record' : `${recent.length} recent records`}</p></div><AnimatePresence mode="wait" initial={false}><motion.div key={category} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} className="home-issue-feed">{issues.loading ? <LoadingState /> : recent.length ? recent.map((issue) => <IssueCard key={issue.id} issue={issue} />) : <EmptyState title={issues.error ? 'The record could not connect' : 'A new record starts here'} description={issues.error ? 'You can still explore the city and see how citizen verification works.' : 'No recent issues match this category. Try another filter or start a report.'}><Link to="/report" className={`${buttonClass} bg-fill text-ink`}>Start a report<ArrowUpRight size={16} /></Link></EmptyState>}</motion.div></AnimatePresence><p className="home-data-note">Demo labels identify fictional records with illustration photos. These records do not describe Bengaluru municipal performance.</p></section>

    <section className="home-closing"><div className="home-closing-mark"><CheckCheck size={36} strokeWidth={1.3} /></div><div><h2>A fix worth<br />standing behind.</h2><p>See the difference between what was claimed and what citizens confirmed. Every number has a definition. Every change has a record.</p><Link to="/ledger" className="home-closing-link">Read the public ledger<ChevronRight size={18} /></Link></div></section>
  </>;
}
