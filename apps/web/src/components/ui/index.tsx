import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, Circle, Clock3, Info, MapPin, ShieldCheck, Users } from 'lucide-react';
import { CATEGORY_META, METRIC_DEFINITIONS, SMALL_SAMPLE_N, STATUS_META, type IssueDoc, type MetricKey, type MetricValue, type Status } from '@leadnet/shared';
import { formatNumber, timeAgo } from '../../lib/format.ts';
import './motion.css';

const MotionLink = motion.create(Link);
const pressSpring = { type: 'spring' as const, stiffness: 420, damping: 30 };

export const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-50';
export function Button({ variant = 'primary', className = '', disabled, onPointerEnter, onPointerLeave, onPointerDown, onPointerUp, onPointerCancel, onKeyDown, onKeyUp, onBlur, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'plain' | 'danger' }) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const reducedMotion = useReducedMotion();
  const respond = (scale: number, y = 0) => {
    if (!scope.current || disabled || reducedMotion) return;
    void animate(scope.current, { scale, y }, pressSpring);
  };
  useEffect(() => {
    if ((disabled || reducedMotion) && scope.current) void animate(scope.current, { scale: 1, y: 0 }, { duration: 0 });
  }, [animate, disabled, reducedMotion, scope]);
  const colors = { primary: 'bg-primary text-on-primary hover:opacity-85', secondary: 'bg-fill text-ink hover:bg-fill-strong', plain: 'text-link hover:bg-fill', danger: 'bg-st-reopened-tint text-st-reopened' };
  return <button {...props} ref={scope} disabled={disabled} className={`${buttonClass} civic-button ${colors[variant]} ${className}`}
    onPointerEnter={(event) => { onPointerEnter?.(event); if (!event.defaultPrevented && event.pointerType !== 'touch') respond(1.018); }}
    onPointerLeave={(event) => { onPointerLeave?.(event); respond(1); }}
    onPointerDown={(event) => { onPointerDown?.(event); if (!event.defaultPrevented && event.button === 0) respond(0.975, 1); }}
    onPointerUp={(event) => { onPointerUp?.(event); respond(event.pointerType === 'mouse' ? 1.018 : 1); }}
    onPointerCancel={(event) => { onPointerCancel?.(event); respond(1); }}
    onKeyDown={(event) => { onKeyDown?.(event); if (!event.defaultPrevented && (event.key === ' ' || event.key === 'Enter')) respond(0.975, 1); }}
    onKeyUp={(event) => { onKeyUp?.(event); respond(1); }}
    onBlur={(event) => { onBlur?.(event); respond(1); }} />;
}

export function RecordedValue({ value, unit = '', className = '' }: { value: number | null; unit?: '' | '%' | 'h' | 'd'; className?: string }) {
  const reducedMotion = useReducedMotion();
  const text = formatNumber(value, unit);
  return <span className={`recorded-value ${className}`}>
    <span className="sr-only" aria-live="polite" aria-atomic="true">{text}</span>
    <span className="recorded-value__visual" aria-hidden="true"><AnimatePresence initial={false}>
      <motion.span key={text} className="recorded-value__number" initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.16 }}>{text}</motion.span>
    </AnimatePresence></span>
  </span>;
}

export function BilingualHeading({ en, kn, as: Tag = 'h2', className = '' }: { en: string; kn?: string; as?: 'h1' | 'h2' | 'h3'; className?: string }) {
  return <Tag className={`font-semibold tracking-tight ${className}`}>{en}{kn && <span lang="kn" className="mt-2 block text-[0.58em] font-normal text-ink-3">{kn}</span>}</Tag>;
}

export function PageHeading({ title, kn, description, children }: { title: string; kn?: string; description?: string; children?: ReactNode }) {
  return <div className="mb-10 flex flex-wrap items-end justify-between gap-6"><div className="max-w-2xl"><BilingualHeading as="h1" en={title} kn={kn} className="text-4xl sm:text-5xl" />{description && <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-3">{description}</p>}</div>{children}</div>;
}

const statusColors: Record<Status, string> = {
  reported: 'bg-st-reported-tint text-st-reported', acknowledged: 'bg-st-ack-tint text-st-ack', in_progress: 'bg-st-progress-tint text-st-progress',
  resolved_pending_verification: 'bg-st-awaiting-tint text-st-awaiting', verified: 'bg-st-verified-tint text-st-verified', reopened: 'bg-st-reopened-tint text-st-reopened',
  rejected: 'bg-st-closed-tint text-st-closed', duplicate: 'bg-st-closed-tint text-st-closed',
};
export function StatusPill({ status }: { status: Status }) {
  const Icon = status === 'verified' ? Check : status === 'resolved_pending_verification' ? Clock3 : Circle;
  return <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium ${statusColors[status]}`}><Icon size={12} aria-hidden="true" />{STATUS_META[status].short}</span>;
}

export function DemoBadge({ children }: { children?: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-pill border border-hairline px-2.5 py-1 text-xs text-ink-3"><Info size={12} aria-hidden="true" />{children ?? 'Demo data'}</span>;
}

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-hairline p-8 text-center sm:p-12"><p className="text-xl font-medium tracking-tight">{title}</p>{description && <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-3">{description}</p>}{children && <div className="mt-5">{children}</div>}</div>;
}

export function LoadingState() {
  return <div role="status" aria-label="Loading records" className="space-y-4 py-8"><div className="h-8 w-2/3 animate-pulse rounded-sm bg-fill motion-reduce:animate-none" /><div className="h-28 animate-pulse rounded-lg bg-fill motion-reduce:animate-none" /><span className="sr-only">Loading records</span></div>;
}

export function IssueCard({ issue, compact = false }: { issue: IssueDoc; compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  return <MotionLink to={`/issue/${issue.id}`} initial="rest" animate="rest" whileHover={reducedMotion ? undefined : 'hover'} whileTap={reducedMotion ? undefined : { scale: 0.995 }} variants={{ rest: { y: 0 }, hover: { y: -2 } }} transition={pressSpring} className={`civic-issue-card group flex min-h-11 gap-4 border-b border-hairline py-5 ${compact ? '' : 'sm:gap-6'}`}>
    {issue.coverPhotoUrl && <span className={`civic-issue-card__photo shrink-0 overflow-hidden rounded-md ${compact ? 'h-20 w-20' : 'h-24 w-24 sm:h-32 sm:w-40'}`}><motion.img src={issue.coverPhotoUrl} alt={CATEGORY_META[issue.category].en} loading="lazy" className="h-full w-full object-cover" variants={{ rest: { scale: 1 }, hover: { scale: 1.045 } }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} /></span>}
    <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><StatusPill status={issue.status} />{issue.isDemo && <span className="text-[11px] text-ink-3">Demo</span>}</div><h3 className={`font-medium leading-snug tracking-tight group-hover:text-link group-focus-visible:text-link ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>{issue.title.en}</h3>{!compact && issue.title.kn && <p lang="kn" className="mt-1 text-xs text-ink-3">{issue.title.kn}</p>}<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3"><span className="flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{issue.wardName ?? 'Outside mapped wards'}</span><span className="flex items-center gap-1"><Users size={12} aria-hidden="true" />{issue.supporterCount}</span><span>{timeAgo(issue.lastEventAt)}</span></div></div><motion.span className="mt-1 shrink-0 text-ink-3" variants={{ rest: { x: 0, y: 0 }, hover: { x: 2, y: -2 } }} transition={pressSpring} aria-hidden="true"><ArrowUpRight size={18} /></motion.span>
  </MotionLink>;
}

export function MetricCard({ metricKey, metric }: { metricKey: MetricKey; metric: MetricValue }) {
  const def = METRIC_DEFINITIONS[metricKey];
  return <div className="civic-metric-card border-t border-hairline py-5"><p className="text-sm text-ink-3">{def.en}</p><p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums"><RecordedValue value={metric.value} unit={def.unit} /></p><p className="mt-2 text-xs text-ink-3">n = {metric.n.toLocaleString('en-IN')}{def.unit === '%' && metric.n < SMALL_SAMPLE_N ? ' · Small sample' : ''}</p><details className="mt-4 text-xs text-ink-3"><summary className="flex min-h-11 cursor-pointer items-center gap-1.5"><Info size={13} aria-hidden="true" />How this is computed</summary><p className="mt-2 leading-relaxed">{def.definition}</p><p className="mt-2 font-mono text-[11px]">{def.formula}</p></details></div>;
}

export function RecordNotice() {
  return <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3"><ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />Officials can claim a fix. Only citizens can verify it. Silence never closes an issue.</p>;
}
