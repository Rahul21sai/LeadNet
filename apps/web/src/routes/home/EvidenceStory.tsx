import { useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowUpRight, Check, CheckCheck, Clock3, FileImage, GitBranch, MapPin, MoveHorizontal, ShieldCheck, Users } from 'lucide-react';
import type { EvidenceDoc, IssueDoc, IssueEventDoc } from '@leadnet/shared';
import { DemoBadge, StatusPill } from '../../components/ui/index.tsx';
import { useIssueEvents, useIssueEvidence } from '../../lib/data.ts';
import { formatDateTime } from '../../lib/format.ts';
import { selectCurrentEvidence } from '../../lib/evidence.ts';

const views = [
  { id: 'evidence', name: 'Photo evidence', Icon: FileImage },
  { id: 'timeline', name: 'Public trail', Icon: GitBranch },
  { id: 'checks', name: 'Citizen checks', Icon: Users },
] as const;

function EvidenceComparison({ issue, evidence, loading, error }: { issue: IssueDoc; evidence: EvidenceDoc[]; loading: boolean; error: Error | null }) {
  const [position, setPosition] = useState(50);
  const { before, after } = selectCurrentEvidence(evidence, issue.verification.claimNo);
  return <div className="proof-comparison">
    <div className="proof-comparison-image" style={{ '--comparison-position': `${position}%` } as CSSProperties}>
      {loading ? <div className="proof-placeholder" role="status"><FileImage size={26} /><span>Loading the evidence</span></div>
        : error ? <div className="proof-placeholder" role="alert"><FileImage size={26} /><span>Photo evidence could not connect.</span><Link to={`/issue/${issue.id}`}>Open the record to retry</Link></div>
        : before && after ? <><img src={after.url} alt="Resolution photo attached to this issue’s current fix claim" className="proof-after-image" loading="lazy" /><img src={before.url} alt="Original citizen report photo" className="proof-before-image" loading="lazy" /><div className="proof-comparison-divider"><span><MoveHorizontal size={20} aria-hidden="true" /></span></div><span className="proof-image-label proof-image-label-before">Report photo</span><span className="proof-image-label proof-image-label-after">Claim photo</span></>
          : before || issue.coverPhotoUrl ? <><img src={before?.url ?? issue.coverPhotoUrl!} alt="Photo attached to the reported issue" loading="lazy" /><span className="proof-image-label proof-image-label-before">Report photo</span></>
            : <div className="proof-placeholder"><FileImage size={28} /><span>No public photo attached yet.</span></div>}
    </div>
    {before && after && !error && !loading ? <label className="proof-comparison-control"><span><MoveHorizontal size={15} aria-hidden="true" />Drag to compare</span><input type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} aria-label="Report and resolution photo comparison" aria-valuetext={`${position}% report photo, ${100 - position}% claim photo`} /></label> : <p className="proof-photo-note">{loading ? 'Fetching the recorded photos.' : 'A public resolution photo is needed for comparison.'}</p>}
    <p className="proof-photo-note">{issue.isDemo ? 'Illustration photos in a fictional record. ' : ''}Photos support a claim; citizen checks determine verification.</p>
  </div>;
}

function PublicTrail({ events, loading, error }: { events: IssueEventDoc[]; loading: boolean; error: Error | null }) {
  const visible = events.slice(-4);
  return <div className="proof-trail"><div className="proof-panel-title"><GitBranch size={18} /><h3>A trail anyone can inspect</h3></div><p>Actions stay attached to the record.</p>
    {loading ? <p role="status">Loading recorded events…</p> : error ? <p role="alert">The timeline could not connect. Open the full record to retry.</p> : visible.length === 0 ? <p>No timeline events have been published.</p> : <ol>{visible.map((event) => <li key={event.id}><span className={`proof-trail-dot ${event.toStatus === 'verified' ? 'is-verified' : ''}`}>{event.toStatus === 'verified' ? <Check size={12} /> : <span />}</span><div><div><strong>{event.type.replaceAll('_', ' ')}</strong><time dateTime={new Date(event.at).toISOString()}>{formatDateTime(event.at)}</time></div><p>{event.actorLabel}</p>{event.note && <p className="proof-event-note">{event.note}</p>}</div></li>)}</ol>}
    {events.length > visible.length && <p className="proof-photo-note">Showing the latest {visible.length} of {events.length} recorded events.</p>}
  </div>;
}

function CitizenChecks({ issue }: { issue: IssueDoc }) {
  if (issue.verification.claimNo < 1) return <div className="proof-checks"><span className="proof-check-seal"><ShieldCheck size={30} strokeWidth={1.4} /></span><div className="proof-panel-title"><h3>The check comes after the claim.</h3></div><p>An officer has not submitted a fix claim for this record yet.</p><p className="proof-photo-note">Eligible reporters and supporters can check the repair once its evidence is published.</p><StatusPill status={issue.status} /></div>;
  return <div className="proof-checks"><span className="proof-check-seal"><ShieldCheck size={30} strokeWidth={1.4} /></span><div className="proof-panel-title"><h3>People get the final check.</h3></div><p>For this record’s current claim</p><dl className="proof-check-counts"><div><dt>Confirm</dt><dd>{issue.verification.confirms}</dd></div><div><dt>Dispute</dt><dd>{issue.verification.disputes}</dd></div></dl><p className="proof-check-rule"><CheckCheck size={17} />{issue.verification.quorum} matching votes required from {issue.verification.eligible} eligible citizens.</p><p className="proof-photo-note">Only eligible reporters and supporters can vote. Silence never verifies a fix.</p><StatusPill status={issue.status} /></div>;
}

export function EvidenceStory({ issue }: { issue: IssueDoc }) {
  const [viewIndex, setViewIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const evidence = useIssueEvidence(issue.id);
  const events = useIssueEvents(issue.id);
  const view = views[viewIndex]!;
  return <div className="home-proof-workspace">
    <div className="home-proof-intro"><div className="home-proof-record-meta"><span className="home-record-code">{issue.passCode}</span>{issue.isDemo && <DemoBadge>Fictional record</DemoBadge>}</div><h3>{issue.title.en}</h3><p lang="kn" className="home-proof-record-kn">{issue.title.kn}</p><p className="home-proof-location"><MapPin size={14} />{issue.wardName ?? 'Bengaluru'}<StatusPill status={issue.status} /></p>
      <div className="home-proof-promise"><ShieldCheck size={19} /><p>Officials submit the evidence.<br /><strong>The people affected verify the fix.</strong></p></div>
      <ol className="home-record-milestones">{[{ name: 'Reported', at: issue.reportedAt, Icon: FileImage }, { name: 'Fix claimed', at: issue.firstClaimedAt, Icon: Clock3 }, { name: 'Citizen verified', at: issue.verifiedAt, Icon: CheckCheck }].map(({ name, at, Icon }) => <li key={name} data-recorded={at !== null}><span><Icon size={15} /></span><div><strong>{name}</strong><p>{at === null ? 'Not recorded' : formatDateTime(at)}</p></div></li>)}</ol>
      <Link to={`/issue/${issue.id}`} className="home-proof-open">Open the full record<ArrowUpRight size={16} /></Link>
    </div>
    <div className="home-proof-inspector"><div className="home-proof-tabs" role="tablist" aria-label="Inspect the issue record">{views.map(({ id, name, Icon }, index) => <button key={id} type="button" role="tab" id={`proof-tab-${id}`} aria-controls="proof-panel" aria-selected={viewIndex === index} tabIndex={viewIndex === index ? 0 : -1} onClick={() => setViewIndex(index)} onKeyDown={(event) => { let next: number | null = null; if (event.key === 'ArrowRight') next = (index + 1) % views.length; if (event.key === 'ArrowLeft') next = (index - 1 + views.length) % views.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = views.length - 1; if (next !== null) { event.preventDefault(); setViewIndex(next); document.getElementById(`proof-tab-${views[next]!.id}`)?.focus(); } }}><Icon size={15} aria-hidden="true" /><span>{name}</span></button>)}</div>
      <div id="proof-panel" role="tabpanel" aria-labelledby={`proof-tab-${view.id}`} tabIndex={0} className="home-proof-panel"><AnimatePresence mode="wait" initial={false}><motion.div key={view.id} initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.16 }}>{view.id === 'evidence' ? <EvidenceComparison issue={issue} evidence={evidence.data} loading={evidence.loading} error={evidence.error} /> : view.id === 'timeline' ? <PublicTrail events={events.data} loading={events.loading} error={events.error} /> : <CitizenChecks issue={issue} />}</motion.div></AnimatePresence></div>
    </div>
  </div>;
}
