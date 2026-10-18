import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Layers3, RotateCcw, Search } from 'lucide-react';
import { METRIC_DEFINITIONS, SMALL_SAMPLE_N, type AskResponse, type LedgerMetrics, type MetricKey } from '@leadnet/shared';
import { useLedger } from '../../lib/data.ts';
import { api } from '../../lib/api.ts';
import { formatDateTime, formatHours, formatNumber } from '../../lib/format.ts';
import { Button, DemoBadge, EmptyState, LoadingState, MetricCard, PageHeading, RecordedValue } from '../../components/ui/index.tsx';
import './ledger.css';

const keys: MetricKey[] = ['reports', 'issues', 'duplicatesMerged', 'open', 'overdue', 'medianAckHours', 'awaitingCheck', 'verifiedRate', 'reopenRate', 'overrides', 'medianDaysToVerified'];

function OutcomeComparison({ metrics }: { metrics: LedgerMetrics }) {
  const [depth, setDepth] = useState(true);
  const reducedMotion = useReducedMotion();
  const spatial = depth && !reducedMotion;
  const angleX = useMotionValue(8);
  const angleY = useMotionValue(-8);
  const rotateX = useSpring(angleX, { stiffness: 260, damping: 32 });
  const rotateY = useSpring(angleY, { stiffness: 260, damping: 32 });
  const rows = [
    { key: 'claimed', metric: metrics.claimed, name: 'Fixes claimed', className: 'claimed' },
    { key: 'verified', metric: metrics.verified, name: 'Citizen verified', className: 'verified' },
    { key: 'unverifiedClaims', metric: metrics.unverifiedClaims, name: 'Still unverified', className: 'unverified' },
  ] as const;
  const maximum = Math.max(1, ...rows.map((row) => row.metric.value ?? 0));
  const reset = () => { angleX.set(8); angleY.set(-8); };

  return <section className="ledger-comparison mt-10" aria-labelledby="outcome-comparison-title">
    <div className="ledger-comparison__heading">
      <div><h2 id="outcome-comparison-title" className="text-[21px] font-semibold tracking-tight">The distance between a claim and a fix.</h2><p lang="kn" className="mt-2 text-[15px] text-ink-3">ಹಕ್ಕು ಮತ್ತು ದೃಢೀಕೃತ ಪರಿಹಾರದ ನಡುವಿನ ಅಂತರ.</p></div>
      <button type="button" className="ledger-view-control" aria-label="3D depth" aria-pressed={spatial} disabled={Boolean(reducedMotion)} onClick={() => { setDepth((value) => !value); reset(); }}><Layers3 size={16} aria-hidden="true" />{spatial ? '3D on' : '3D off'}</button>
    </div>
    <figure className="ledger-comparison__figure">
      <div className="ledger-stage" data-depth={spatial} aria-hidden="true" onPointerMove={(event) => {
        if (!spatial || event.pointerType !== 'mouse' || event.buttons !== 0) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        angleX.set(8 - ((event.clientY - bounds.top) / bounds.height - 0.5) * 6);
        angleY.set(-8 + ((event.clientX - bounds.left) / bounds.width - 0.5) * 10);
      }} onPointerLeave={reset}>
        <motion.div className="ledger-stage__columns" style={{ rotateX: spatial ? rotateX : 0, rotateY: spatial ? rotateY : 0 }}>
          <div className="ledger-stage__floor" />
          {rows.map((row) => <div key={row.key} className={`ledger-column-slot ledger-column-slot--${row.className}`}><div className="ledger-column" data-has-value={(row.metric.value ?? 0) > 0} style={{ '--column-height': `${Math.max(0, (row.metric.value ?? 0) / maximum) * 100}%` } as CSSProperties} /><span className="ledger-column-baseline" /></div>)}
        </motion.div>
      </div>
      <dl className="ledger-comparison__values">{rows.map((row) => <div key={row.key} className={`ledger-outcome ledger-outcome--${row.className}`}>
        <dt className="ledger-outcome__label"><span aria-hidden="true" />{row.name}</dt>
        <dd className="ledger-outcome__value"><RecordedValue value={row.metric.value} /></dd>
        <dd lang="kn" className="ledger-outcome__kannada">{METRIC_DEFINITIONS[row.key].kn}</dd>
        <dd className="ledger-outcome__sample">n = {row.metric.n.toLocaleString('en-IN')}{row.metric.n < SMALL_SAMPLE_N ? ' · Small sample' : ''}</dd>
      </div>)}</dl>
      <figcaption className="ledger-comparison__caption"><p>Columns share one scale. Every count comes from the public record.</p><p>{reducedMotion ? 'A flat view follows your reduced-motion preference.' : 'Change the view without changing the record.'}</p></figcaption>
      {spatial && <div className="ledger-view-buttons" role="group" aria-label="Comparison viewpoint">
        <button type="button" onClick={() => { angleX.set(8); angleY.set(-18); }} aria-label="View comparison from the left"><ChevronLeft size={18} aria-hidden="true" /></button>
        <button type="button" onClick={reset} aria-label="Reset comparison view"><RotateCcw size={16} aria-hidden="true" /></button>
        <button type="button" onClick={() => { angleX.set(8); angleY.set(8); }} aria-label="View comparison from the right"><ChevronRight size={18} aria-hidden="true" /></button>
      </div>}
    </figure>
    <details className="ledger-comparison__definitions"><summary>What these counts mean</summary><div className="grid gap-5 pt-4 md:grid-cols-3">{rows.map((row) => <div key={row.key}><p className="text-sm font-medium">{METRIC_DEFINITIONS[row.key].en}</p><p className="mt-2 text-xs leading-relaxed text-ink-3">{METRIC_DEFINITIONS[row.key].definition}</p></div>)}</div></details>
  </section>;
}
export function Component() {
  const { data, loading, error } = useLedger(); const [search, setSearch] = useState(''); const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState<AskResponse | null>(null); const [asking, setAsking] = useState(false); const [askError, setAskError] = useState('');
  async function ask(event: FormEvent) { event.preventDefault(); if (question.trim().length < 3) return; setAsking(true); setAskError(''); setAnswer(null); try { setAnswer(await api.post<AskResponse>('/ask', { question: question.trim() })); } catch (err) { setAskError(err instanceof Error ? err.message : 'The ledger answer is unavailable. The facts below are still available.'); } finally { setAsking(false); } }
  if (loading) return <LoadingState />;
  if (error || !data) return <div className="mx-auto max-w-2xl px-5 py-20"><EmptyState title="The ledger is not ready yet." description={error?.message ?? 'The city snapshot appears after records are added. No outcomes are assumed.'}><Link to="/map" className="text-link">Explore the civic map</Link></EmptyState></div>;
  const wards = data.wards.filter((ward) => `${ward.name.en} ${ward.name.kn}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-16"><div className="flex flex-wrap items-start justify-between gap-5"><PageHeading title="The outcome ledger." kn="ಫಲಿತಾಂಶಗಳ ದಾಖಲೆ." description="What was claimed. What citizens confirmed. The gap stays visible." /><DemoBadge>Prototype city data</DemoBadge></div>
    <p className="mt-5 text-[12px] text-ink-3">Live snapshot updated {formatDateTime(data.updatedAt)}. Demo records illustrate the workflow; these are not Bengaluru performance statistics.</p>
    <OutcomeComparison metrics={data.city} />
    <section className="mt-12"><div className="flex flex-wrap items-end justify-between gap-4"><h2 className="text-[28px] font-semibold tracking-tight">Every number has a definition.</h2><Link to="/how-it-works#metrics" className="inline-flex min-h-11 items-center gap-1 text-[13px] text-link">Read the methodology<ArrowUpRight size={15} /></Link></div><div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">{keys.map((key) => <div key={key} className="bg-surface px-5"><MetricCard metricKey={key} metric={data.city[key]} /></div>)}</div></section>
    <section className="mt-14"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-[28px] font-semibold tracking-tight">Ward by ward.</h2><p lang="kn" className="mt-1 text-[19px] text-ink-3">ವಾರ್ಡ್‌ವಾರು ಫಲಿತಾಂಶಗಳು.</p></div><label className="flex min-h-11 items-center gap-2 rounded-pill border border-hairline bg-surface px-4 text-[13px]"><Search size={15} className="text-ink-3" /><span className="sr-only">Find a ward</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a ward" className="min-w-0 bg-transparent" /></label></div><p className="mt-3 text-[13px] text-ink-3">An outcome record, with sample sizes. Ward order is alphabetical.</p><div className="mt-6 overflow-x-auto rounded-lg border border-hairline bg-surface"><table className="w-full min-w-[680px] text-left text-[13px]"><thead className="border-b border-hairline text-ink-3"><tr><th className="px-5 py-4 font-medium">Ward</th><th className="px-4 py-4 font-medium">Unique issues</th><th className="px-4 py-4 font-medium">Claimed</th><th className="px-4 py-4 font-medium">Verified</th><th className="px-4 py-4 font-medium">Verified rate</th><th className="px-4 py-4 font-medium">Acknowledge</th></tr></thead><tbody>{[...wards].sort((a, b) => a.name.en.localeCompare(b.name.en)).map((ward) => <tr key={ward.wardId} className="border-b border-hairline last:border-0"><th className="px-5 py-4 font-medium"><Link to={`/ward/${ward.wardId}`} className="inline-flex min-h-11 flex-col justify-center text-link"><span>{ward.name.en}</span><span lang="kn" className="mt-1 text-[11px] font-normal text-ink-3">{ward.name.kn}</span></Link></th><td className="px-4 py-4 tabular-nums">{formatNumber(ward.metrics.issues.value)}</td><td className="px-4 py-4 tabular-nums">{formatNumber(ward.metrics.claimed.value)}</td><td className="px-4 py-4 tabular-nums text-st-verified">{formatNumber(ward.metrics.verified.value)}</td><td className="px-4 py-4 tabular-nums">{formatNumber(ward.metrics.verifiedRate.value, '%')}<span className="mt-1 block text-[11px] text-ink-3">n={ward.metrics.verifiedRate.n}{ward.metrics.verifiedRate.n < SMALL_SAMPLE_N ? ' · small sample' : ''}</span></td><td className="px-4 py-4 tabular-nums">{formatHours(ward.metrics.medianAckHours.value)}<span className="mt-1 block text-[11px] text-ink-3">n={ward.metrics.medianAckHours.n}</span></td></tr>)}</tbody></table>{wards.length === 0 && <p className="p-8 text-[15px] text-ink-3">No ward matches this search.</p>}</div></section>
    <section className="mt-14 grid gap-8 border-t border-hairline pt-10 md:grid-cols-[280px_minmax(0,1fr)]"><div><h2 className="text-[28px] font-semibold tracking-tight">Ask the record.</h2><p lang="kn" className="mt-2 text-[19px] text-ink-3">ದಾಖಲೆಯನ್ನು ಕೇಳಿ.</p><p className="mt-3 text-[15px] text-ink-3">Gemini selects relevant ledger facts. Code writes every label, value, and sample size.</p></div><div><form onSubmit={ask}><label htmlFor="ledger-question" className="mb-2 block text-[13px] font-medium">Your question</label><div className="flex flex-col gap-3 sm:flex-row"><input id="ledger-question" value={question} minLength={3} maxLength={300} required onChange={(event) => setQuestion(event.target.value)} placeholder="How many claimed fixes are still unverified?" className="min-h-12 min-w-0 flex-1 rounded-md border border-hairline bg-surface px-4 text-[15px]" /><Button type="submit" disabled={asking}>{asking ? 'Reading the ledger…' : 'Ask Namma Civic'}</Button></div></form>{askError && <p role="alert" className="mt-4 text-[15px] text-st-reopened">{askError}</p>}{answer && <div className="mt-5 rounded-lg bg-surface p-6"><p className="text-[17px] leading-relaxed">{answer.answer.en}</p><p lang="kn" className="mt-4 text-[15px] text-ink-3">{answer.answer.kn}</p><details className="mt-5 border-t border-hairline pt-3 text-[12px]"><summary className="min-h-11 cursor-pointer text-link">View source facts and checks</summary><dl className="mt-3 space-y-2">{Object.entries(answer.facts).map(([key, value]) => <div key={key} className="flex justify-between gap-4"><dt className="text-ink-3">{key.replaceAll('_', ' ')}</dt><dd className="text-right tabular-nums">{value ?? 'Not available'}</dd></div>)}</dl><ul className="mt-4 space-y-2">{answer.checks.map((check, index) => <li key={`${check.name}-${index}`} className="flex items-center gap-2"><Check size={13} className={check.passed ? 'text-st-verified' : 'text-st-awaiting'} />{check.name}: {check.passed ? 'passed' : 'fallback'}</li>)}</ul>{answer.fallbackUsed && <p className="mt-3 text-st-awaiting">A deterministic explanation was used.</p>}</details></div>}</div></section>
  </div>;
}
