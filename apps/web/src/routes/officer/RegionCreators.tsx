import { useId, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ChevronDown, MapPin, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';
import { CATEGORY_META, demoRegionCreators, type RegionCreator, type RegionCreatorsResponse, type WardDoc } from '@leadnet/shared';
import { useSession, type Session } from '../../lib/auth.ts';
import { useIssues, useRegionCreators } from '../../lib/data.ts';
import { isOfflineDemo } from '../../lib/demo.ts';
import { formatDateTime, timeAgo } from '../../lib/format.ts';
import { EmptyState, LoadingState, StatusPill } from '../../components/ui/index.tsx';
import { regionCreatorsScope } from '../../lib/creatorScope.ts';

interface Props {
  wardId: string;
  wardName: string;
  wards: readonly WardDoc[];
  onSelectWard: (wardId: string) => void;
}

export function RegionCreators(props: Props) {
  const session = useSession();
  const [revision, setRevision] = useState(0);
  const scope = regionCreatorsScope(session, props.wardId);
  if (!props.wardId) return <EmptyState title="Choose a region first." description="Select an available ward above to open its issue creators directory." />;
  return isOfflineDemo
    ? <OfflineCreators key={`${props.wardId}:${revision}`} {...props} onRefresh={() => setRevision((value) => value + 1)} />
    : <ConnectedCreators key={JSON.stringify(scope.queryKey)} {...props} session={session} />;
}

function ConnectedCreators({ wardId, wardName, session }: Props & { session: Session }) {
  const scope = regionCreatorsScope(session, wardId);
  const query = useRegionCreators(wardId);

  if (!session.ready) return <LoadingState />;
  if (!wardId) return <EmptyState title="Choose a region first." description="Select a ward above to open its issue creators directory." />;
  if (!scope.allowed) return <EmptyState
    title={session.demoOfficer ? 'A leader account is required for this directory.' : 'This ward needs authorized leader access.'}
    description={session.demoOfficer
      ? 'The demo officer role opens the issue queue. Citizen authorship is available only to an authorized ward officer or administrator. The read-only demonstration includes fictional creator examples.'
      : 'Only an authorized officer assigned to this ward or an administrator can view its anonymous issue creators. The demo role does not grant access to citizen authorship.'}
  />;

  const result = query.data;
  return <CreatorDirectory wardName={wardName} result={result} loading={query.isPending} refreshing={query.isFetching}
    error={query.error} onRefresh={() => { if (scope.allowed) void query.refetch(); }} />;
}

function OfflineCreators({ wardId, wardName, wards, onSelectWard, onRefresh }: Props & { onRefresh: () => void }) {
  const issues = useIssues();
  const result = demoRegionCreators(wardId, issues.data);
  const sampleWard = wards.find((ward) => ward.id !== wardId && issues.data.some((issue) => issue.isDemo && issue.wardId === ward.id));
  return <CreatorDirectory wardName={wardName} result={issues.loading || issues.error ? undefined : result}
    loading={issues.loading} refreshing={false} error={issues.error} onRefresh={onRefresh} offline
    sampleWard={sampleWard ? { name: sampleWard.name.en, select: () => onSelectWard(sampleWard.id) } : undefined} />;
}

interface DirectoryProps {
  wardName: string;
  result: RegionCreatorsResponse | undefined;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  offline?: boolean;
  sampleWard?: { name: string; select: () => void } | undefined;
  onRefresh: () => void;
}

function CreatorDirectory({ wardName, result, loading, refreshing, error, offline = false, sampleWard, onRefresh }: DirectoryProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const creators = result?.creators.filter((creator) => !query || [
    creator.authorLabel, creator.id, ...creator.activities.flatMap((activity) => [activity.title, activity.category ? CATEGORY_META[activity.category].en : '']),
  ].join(' ').toLocaleLowerCase().includes(query)) ?? [];

  return <section aria-labelledby="creators-heading" className="min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-5 border-b border-hairline pb-6">
      <div className="max-w-2xl"><p className="flex items-center gap-1.5 text-[13px] text-ink-3"><MapPin size={14} aria-hidden="true" />{wardName || 'Selected ward'}</p>
        <h2 id="creators-heading" className="mt-3 font-display text-[32px] leading-tight tracking-tight sm:text-[40px]">The citizens behind the issues.</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-3">See who has raised issues in this region, with identities kept private. Open a citizen’s records to understand what they shared.</p>
      </div>
      <button type="button" onClick={onRefresh} disabled={refreshing || loading} className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-hairline px-4 text-[13px] text-ink-2 hover:bg-surface-2 disabled:opacity-50">
        <RefreshCw size={15} aria-hidden="true" />{refreshing ? 'Refreshing…' : 'Refresh directory'}
      </button>
    </div>

    <div className={`mt-6 flex items-start gap-3 rounded-md p-4 ${offline ? 'bg-community-accent-tint' : 'bg-surface-2'}`}>
      <ShieldCheck size={18} className={`mt-0.5 shrink-0 ${offline ? 'text-community-accent' : 'text-ink-3'}`} aria-hidden="true" />
      <div className="min-w-0 text-[13px] leading-relaxed text-ink-2">
        <p className="font-medium">{offline ? 'Fictional creator examples' : 'Anonymous, ward-scoped records'}</p>
        <p className="mt-1 text-ink-3">{offline
          ? 'These are invented author associations over seeded demo issues. Counts describe examples, never real citizens. Device posts stay separate and are not assigned to a region here.'
          : result?.notice ?? 'Only submission authors appear here. Supporters and commenters are excluded, and citizen identities stay private.'}</p>
        {offline && sampleWard && <button type="button" onClick={sampleWard.select} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-left font-medium text-community-accent">Explore examples in {sampleWard.name}<ArrowUpRight size={14} className="shrink-0" aria-hidden="true" /></button>}
      </div>
    </div>

    {loading ? <LoadingState /> : error ? <div role="alert" className="mt-6 rounded-lg border border-hairline bg-surface p-6">
      <h3 className="text-lg font-medium">The creators directory could not be loaded.</h3><p className="mt-2 text-[14px] text-ink-3">{error.message}</p>
      <button type="button" onClick={onRefresh} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-pill bg-primary px-5 text-sm text-on-primary"><RefreshCw size={15} aria-hidden="true" />Try again</button>
    </div> : result && <>
      <div className="my-6 flex flex-wrap items-end justify-between gap-5">
        <p aria-live="polite" className="text-[14px] text-ink-3"><strong className="font-medium tabular-nums text-ink">{result.creatorCount.toLocaleString('en-IN')}</strong> {offline ? 'fictional creator examples' : result.creatorCount === 1 ? 'citizen' : 'citizens'}<span className="mx-2" aria-hidden="true">·</span><strong className="font-medium tabular-nums text-ink">{result.activityCount.toLocaleString('en-IN')}</strong> records across citizen entries</p>
        <label className="flex min-h-11 w-full items-center gap-2 rounded-pill border border-hairline bg-surface px-4 sm:w-80"><Search size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
          <span className="sr-only">Search citizen references and public records</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a reference or issue" className="min-h-11 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-offset-4 placeholder:text-ink-3" />
        </label>
      </div>
      {result.creatorCount === 0 ? <EmptyState title={offline ? 'No creator examples in this ward.' : 'No issue creators in this ward yet.'}
        description={offline ? 'Choose a ward with seeded examples above. Private device posts are not part of this directory.' : 'Authors will appear after an issue or community post is submitted with this ward assigned. Try another region or refresh later.'} />
        : !creators.length ? <EmptyState title="No matching citizen records." description="Try another reference or a word from an issue title."><button type="button" onClick={() => setSearch('')} className="min-h-11 rounded-pill bg-fill px-5 text-sm">Clear search</button></EmptyState>
          : <><p className="mb-3 text-[12px] text-ink-3">{query ? `${creators.length} matching ${creators.length === 1 ? 'entry' : 'entries'}. ` : ''}Most recent submission first. Each issue / post counts once per citizen. References apply only within this ward.</p><ul className="overflow-hidden rounded-lg border border-hairline bg-surface">{creators.map((creator) => <CreatorRow key={creator.id} creator={creator} offline={offline} />)}</ul></>}
    </>}
  </section>;
}

function CreatorRow({ creator, offline }: { creator: RegionCreator; offline: boolean }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const reduced = useReducedMotion();
  return <li className="border-b border-hairline last:border-b-0">
    <button type="button" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen((value) => !value)} className="flex w-full items-start gap-3 p-5 text-left hover:bg-surface-2 sm:items-center sm:gap-5 sm:px-6">
      <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-ink-3"><UserRound size={20} strokeWidth={1.5} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-[17px] font-medium">Citizen</span>{(offline || creator.isDemo) && <span className="text-[11px] text-community-accent">{offline ? 'Fictional example' : 'Demo records'}</span>}</span>
        <span className="mt-1 block break-all text-[12px] text-ink-3">Ward reference: {creator.id}</span>
        <span className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-3"><span><strong className="font-medium tabular-nums text-ink-2">{creator.activityCount.toLocaleString('en-IN')}</strong> {creator.activityCount === 1 ? 'distinct issue / post' : 'distinct issues / posts'}</span><span>Latest <time dateTime={new Date(creator.lastPostedAt).toISOString()} title={formatDateTime(creator.lastPostedAt)}>{timeAgo(creator.lastPostedAt)}</time></span></span>
      </span>
      <span className="mt-1 flex min-h-11 shrink-0 items-center gap-2 text-[12px] text-community-accent"><span className="hidden sm:inline">{open ? 'Hide records' : 'View records'}</span><motion.span initial={false} animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduced ? 0 : 0.18 }}><ChevronDown size={17} aria-hidden="true" /></motion.span></span>
    </button>
    <AnimatePresence initial={false}>{open && <motion.div id={detailId} initial={{ height: reduced ? 'auto' : 0, opacity: reduced ? 1 : 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} className="overflow-hidden">
      <div className="border-t border-hairline bg-canvas px-5 pb-2 pt-3 sm:pl-[84px] sm:pr-6"><p className="mb-1 text-[12px] text-ink-3">{offline ? 'Seeded public records for this fictional example' : 'Public records submitted by this citizen'}</p><ul>{creator.activities.map((activity) => <li key={`${activity.kind}:${activity.id}`} className="border-b border-hairline last:border-b-0">
        <Link to={activity.kind === 'issue' ? `/issue/${encodeURIComponent(activity.id)}` : `/?post=${encodeURIComponent(activity.id)}`} className="group flex min-h-11 items-start justify-between gap-4 py-4">
          <span className="min-w-0"><span className="block break-words text-[14px] font-medium leading-relaxed text-ink group-hover:text-link">{activity.title}</span><span className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink-3"><span>{activity.kind === 'issue' ? 'Issue' : 'Community post'}</span>{activity.category && <span>{CATEGORY_META[activity.category].en}</span>}<time dateTime={new Date(activity.createdAt).toISOString()}>{formatDateTime(activity.createdAt)}</time>{activity.status && <StatusPill status={activity.status} />}</span></span><ArrowUpRight size={16} className="mt-1 shrink-0 text-link" aria-hidden="true" />
        </Link>
      </li>)}</ul></div>
    </motion.div>}</AnimatePresence>
  </li>;
}
