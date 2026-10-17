import { useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, ArrowUpRight, AudioLines, CircleDot, FileImage, Info, MapPin, ShieldCheck, Users } from 'lucide-react';
import { CATEGORY_META, METRIC_DEFINITIONS, type Category, type IssueDoc } from '@leadnet/shared';
import { SpatialCity } from '../../components/spatial/SpatialCity.tsx';
import { DemoBadge, EmptyState, IssueCard, LoadingState, RecordedValue, StatusPill, buttonClass } from '../../components/ui/index.tsx';
import { useIssue, useIssues, useLedger, useMyProfile } from '../../lib/data.ts';
import { isOfflineDemo } from '../../lib/demo.ts';
import { formatNumber, timeAgo } from '../../lib/format.ts';
import { EvidenceStory } from './EvidenceStory.tsx';
import { selectPreviewRecords } from './presentation.ts';
import './home.css';

const categories: Array<{ id: Category | 'all'; label: string }> = [
  { id: 'all', label: 'Across categories' }, { id: 'pothole', label: 'Roads' }, { id: 'garbage', label: 'Waste' },
  { id: 'drainage', label: 'Drainage' }, { id: 'streetlight', label: 'Streetlights' },
];

function OlderFollowedRecord({ id }: { id: string }) {
  const issue = useIssue(id);
  if (issue.loading) return <LoadingState />;
  if (!issue.data || issue.error) return <p className="border-b border-hairline py-5 text-sm text-ink-3">A saved record is currently unavailable.</p>;
  return <IssueCard issue={issue.data} compact />;
}

function PreviewCard({ issue, featured = false }: { issue: IssueDoc; featured?: boolean }) {
  return <Link to={`/issue/${issue.id}`} className={`home-preview-card ${featured ? 'home-preview-card-featured' : ''}`}>
    <div className="home-preview-photo">{issue.coverPhotoUrl ? <img src={issue.coverPhotoUrl} alt={CATEGORY_META[issue.category].en} loading="lazy" /> : <FileImage size={28} strokeWidth={1.3} />}<span className="home-preview-category">{CATEGORY_META[issue.category].en}</span></div>
    <div className="home-preview-body"><div className="home-preview-meta"><StatusPill status={issue.status} />{issue.isDemo && <span>Demo</span>}<ArrowUpRight size={17} aria-hidden="true" /></div><h3>{issue.title.en}</h3><p lang="kn" className="home-preview-kn">{issue.title.kn}</p><div className="home-preview-location"><span><MapPin size={13} />{issue.wardName ?? 'Bengaluru'}</span><span><Users size={13} />{issue.supporterCount} supporters</span></div><p className="home-preview-time">Updated {timeAgo(issue.lastEventAt)}</p></div>
  </Link>;
}

export function HomePage() {
  const issues = useIssues(); const ledger = useLedger(); const profile = useMyProfile(); const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const metrics = ledger.data?.city;
  const records = useMemo(() => issues.data.filter((issue) => issue.status !== 'duplicate' && issue.status !== 'rejected'), [issues.data]);
  const preview = useMemo(() => selectPreviewRecords(records, category), [records, category]);
  const evidenceRecord = records.find((issue) => issue.status === 'verified' && issue.category === 'pothole') ?? records.find((issue) => issue.status === 'verified') ?? records.find((issue) => issue.status === 'resolved_pending_verification') ?? records[0];
  const followedIds = profile.data?.followedIssueIds ?? [];
  const comparisonMaximum = Math.max(1, metrics?.claimed.value ?? 0, metrics?.verified.value ?? 0);

  return <div className="home-page">
    <section className="home-hero" aria-labelledby="home-title">
      <motion.div className="home-hero-copy" initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <p className="home-location"><MapPin size={14} aria-hidden="true" />Bengaluru, Karnataka<span className="home-location-rule" />A shared public record</p>
        <h1 id="home-title" className="home-hero-title">Every fix.<br />Proven by people.</h1>
        <p lang="kn" className="home-hero-kn">ನಮ್ಮ ನಗರ. ನಮ್ಮ ಹೊಣೆ.</p>
        <p className="home-hero-description">Report a problem. Follow the repair. Let the people affected confirm what changed.</p>
        <div className="home-hero-actions"><Link to="/report" className={`${buttonClass} home-primary-action bg-primary text-on-primary`}>Report an issue<ArrowUpRight size={16} /></Link><a href="#evidence" className="home-text-action">See the proof<ArrowRight size={16} /></a></div>
        <div className="home-report-methods"><span><FileImage size={14} />Photo</span><span><AudioLines size={14} />Voice</span><span lang="kn">ಕನ್ನಡ</span><span>English</span></div>
        <div className="home-citizen-note"><ShieldCheck size={18} strokeWidth={1.6} /><p>A claim starts the check.<br /><strong>Only citizens can verify the outcome.</strong></p></div>
      </motion.div>
      <div className="home-hero-scene"><SpatialCity issues={records} loading={issues.loading} onSelectIssue={(id) => navigate(`/issue/${id}`)} /></div>
    </section>

    <section className="home-ledger-strip" aria-label="City outcome snapshot"><div className="home-ledger-intro"><p><CircleDot size={15} aria-hidden="true" />The record so far</p><span>Counts from {isOfflineDemo ? 'fictional demo' : 'the public'} records</span><Link to="/ledger">Explore the ledger<ArrowUpRight size={14} /></Link></div>
      <div className="home-ledger-values">{[{ key: 'issues' as const, label: 'Unique issues' }, { key: 'claimed' as const, label: 'Fixes claimed' }, { key: 'verified' as const, label: 'Citizen verified' }].map(({ key, label }) => <div className={`home-ledger-value home-ledger-value-${key}`} key={key}><p className="home-metric-number"><RecordedValue value={metrics?.[key].value ?? null} /></p><p>{label}</p><details><summary aria-label={`Definition of ${label}`}><Info size={11} aria-hidden="true" />n = {metrics ? formatNumber(metrics[key].n) : '—'}</summary><p>{METRIC_DEFINITIONS[key].definition}</p></details></div>)}</div>
    </section>

    <section id="evidence" className="home-section home-evidence" aria-labelledby="evidence-heading"><div className="home-section-heading"><div><p className="home-section-context"><ShieldCheck size={15} />Evidence before outcomes</p><h2 id="evidence-heading">A repair you can check.</h2><p lang="kn" className="home-section-kn">ವರದಿಯಿಂದ ದೃಢೀಕರಣದವರೆಗೆ.</p></div><p>Look beyond the status label. Compare the photos, inspect the trail, and see who confirmed the fix.</p></div>
      {evidenceRecord ? <EvidenceStory key={evidenceRecord.id} issue={evidenceRecord} /> : issues.loading ? <LoadingState /> : <EmptyState title={issues.error ? 'The record could not connect.' : 'The first record starts with you.'} description={issues.error ? 'Open the city explorer to retry the record connection.' : 'Evidence, officer actions and citizen checks will appear together when an issue is recorded.'}><Link to={issues.error ? '/map' : '/report'} className={`${buttonClass} bg-primary text-on-primary`}>{issues.error ? 'Open city explorer' : 'Report an issue'}<ArrowUpRight size={15} /></Link></EmptyState>}
    </section>

    {followedIds.length > 0 && <section className="home-section home-followed"><h2 className="text-2xl font-semibold tracking-tight">Your followed records</h2><p className="mt-2 text-sm text-ink-3">Private to this account. Open a record to see its latest evidence and updates.</p><div className="mt-4 grid gap-x-8 md:grid-cols-2">{followedIds.map((id) => { const known = issues.data.find((issue) => issue.id === id); return known ? <IssueCard key={id} issue={known} compact /> : <OlderFollowedRecord key={id} id={id} />; })}</div></section>}

    <section className="home-section home-neighbourhood" aria-labelledby="neighbourhood-heading"><div className="home-section-heading"><div><p className="home-section-context"><MapPin size={15} />From the city record</p><h2 id="neighbourhood-heading">Closer to home.</h2><p lang="kn" className="home-section-kn">ನಿಮ್ಮ ಸುತ್ತಲಿನ ಸಮಸ್ಯೆಗಳು.</p></div><Link to="/map" className="home-text-action">Open the city explorer<ArrowUpRight size={16} /></Link></div>
      <div className="home-feed-toolbar"><div className="home-feed-filters" aria-label="Filter preview records">{categories.map((item) => <button type="button" key={item.id} onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={category === item.id ? 'is-selected' : ''}>{item.label}</button>)}</div><span>{issues.loading ? 'Loading records' : `${preview.length} selected records`}</span></div>
      <AnimatePresence mode="wait" initial={false}><motion.div key={category} initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }} className="home-issue-feed">{issues.loading ? <LoadingState /> : preview.length ? <><PreviewCard issue={preview[0]!} featured /><div className="home-preview-list">{preview.slice(1).map((issue) => <PreviewCard key={issue.id} issue={issue} />)}</div></> : <EmptyState title={issues.error ? 'The record could not connect.' : 'No records in this category yet.'} description="Choose another category or open the full city explorer."><Link to="/map" className="home-text-action">Explore the city<ArrowRight size={15} /></Link></EmptyState>}</motion.div></AnimatePresence>
      <p className="home-data-note">{category === 'all' ? 'A recent selection across available categories. ' : 'Recent records in the selected category. '}Demo labels identify fictional records and illustration photos.</p>
    </section>

    <section className="home-accountability" aria-labelledby="accountability-heading"><div><p className="home-section-context"><CircleDot size={15} />The accountability gap</p><h2 id="accountability-heading">A claim is the beginning.</h2><p lang="kn" className="home-section-kn">ದೃಢೀಕೃತ ಪರಿಹಾರವೇ ಫಲಿತಾಂಶ.</p><p className="home-accountability-copy">{metrics?.unverifiedClaims.value === null || !metrics ? 'See what citizens confirmed, with definitions and sample sizes.' : <><strong>{formatNumber(metrics.unverifiedClaims.value)}</strong> claimed fixes still lack citizen verification in this snapshot.</>}</p><Link to="/ledger" className="home-text-action">Read the public ledger<ArrowUpRight size={16} /></Link></div>
      <div className="home-accountability-chart" aria-label="Recorded fix claims compared with citizen-verified fixes">{[{ key: 'claimed' as const, label: 'Fixes claimed' }, { key: 'verified' as const, label: 'Citizen verified' }].map(({ key, label }) => <div key={key} className={`home-outcome-row home-outcome-row-${key}`}><div><span>{label}</span><strong><RecordedValue value={metrics?.[key].value ?? null} /></strong></div><div className="home-outcome-track"><span style={{ '--outcome-width': `${Math.max(0, metrics?.[key].value ?? 0) / comparisonMaximum * 100}%` } as CSSProperties} /></div><p>n = {metrics ? formatNumber(metrics[key].n) : '—'}</p></div>)}<p className="home-chart-note">{ledger.error ? 'The snapshot could not connect. Open the ledger to retry.' : !metrics ? 'Waiting for the record snapshot.' : 'Counts from one snapshot. Full definitions in the ledger.'}</p><DemoBadge>{isOfflineDemo ? 'Fictional demo outcomes' : 'Prototype outcomes'}</DemoBadge></div>
    </section>
  </div>;
}
