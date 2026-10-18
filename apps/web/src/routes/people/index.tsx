import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, Clock3, HeartHandshake, Inbox, MapPin, RefreshCw, Search, Send, ShieldCheck, Users, X } from 'lucide-react';
import type { ConnectionAction, ConnectionProfileInput, ConnectionView } from '@leadnet/shared';
import { useConnections, useWards } from '../../lib/data.ts';
import { PersonCard } from './PersonCard.tsx';
import { ProfileEditor } from './ProfileEditor.tsx';
import { peopleInWard, relationshipForPerson, requestsInTab, type ConnectionTab } from './presentation.ts';
import './people.css';

const tabs: Array<{ value: ConnectionTab; label: string; icon: typeof Inbox }> = [
  { value: 'incoming', label: 'Incoming', icon: Inbox },
  { value: 'sent', label: 'Sent', icon: Send },
  { value: 'connections', label: 'Connections', icon: Check },
];

export function Component() {
  const wards = useWards();
  const [params, setParams] = useSearchParams();
  const requestedWardId = params.get('wardId') ?? '';
  const wardId = wards.data.find((ward) => ward.id === requestedWardId)?.id ?? wards.data[0]?.id ?? '';
  const wardName = wards.data.find((ward) => ward.id === wardId)?.name.en ?? 'your ward';
  const connections = useConnections(wardId);
  const reduced = useReducedMotion();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<ConnectionTab>('incoming');
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now);
  const actionLock = useRef(false);
  const profileSection = useRef<HTMLElement>(null);
  const selectedCard = useRef<HTMLLIElement>(null);
  const lastRevealed = useRef('');
  const tabId = useId();
  const selectedPersonId = params.get('person') ?? '';
  const ownProfileId = connections.profile?.id ?? '';
  const allPeople = useMemo(() => peopleInWard(connections.people, wardId, '', ownProfileId), [connections.people, wardId, ownProfileId]);
  const people = useMemo(() => peopleInWard(connections.people, wardId, search, ownProfileId), [connections.people, wardId, search, ownProfileId]);
  const selectedExists = allPeople.some((person) => person.id === selectedPersonId);
  const privateRequests = requestsInTab(connections.requests, tab);
  const busy = connections.busy || pending;
  const loading = wards.loading || connections.loading;

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setSearch(''); }, [wardId, selectedPersonId]);
  useEffect(() => {
    const key = `${wardId}:${selectedPersonId}`;
    if (!selectedPersonId || !selectedExists || loading || key === lastRevealed.current) return;
    const frame = requestAnimationFrame(() => {
      if (!selectedCard.current) return;
      selectedCard.current.focus({ preventScroll: true });
      selectedCard.current.scrollIntoView({ block: 'center', behavior: reduced ? 'instant' : 'smooth' });
      lastRevealed.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [wardId, selectedPersonId, selectedExists, loading, reduced]);

  function selectWard(value: string) {
    const next = new URLSearchParams(params); next.set('wardId', value); next.delete('person');
    setParams(next, { replace: true }); setActionError(''); setMessage('');
  }

  function openProfile() {
    profileSection.current?.focus({ preventScroll: true });
    profileSection.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  }

  async function perform(work: () => Promise<void>, success: string): Promise<boolean> {
    if (actionLock.current || busy) return false;
    actionLock.current = true; setPending(true); setActionError(''); setMessage('');
    try { await work(); setNow(Date.now()); setMessage(success); return true; }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Your change could not be saved. Try again.'); return false; }
    finally { actionLock.current = false; setPending(false); }
  }

  const send = (peerId: string) => perform(() => connections.send(peerId), connections.isDemo ? 'Request saved in this browser. No real request was sent.' : 'Your connection request is pending. The citizen can accept or decline.');
  const act = (request: ConnectionView, action: ConnectionAction) => {
    const labels: Record<ConnectionAction, string> = { accept: 'Connection accepted.', decline: 'Request declined.', cancel: 'Request cancelled.', remove: 'Connection removed.' };
    return perform(() => connections.act(request.id, action, request.revision), `${labels[action]}${connections.isDemo ? ' This change stays in your browser.' : ''}`);
  };
  const saveProfile = (input: ConnectionProfileInput) => perform(() => connections.saveProfile(input), input.discoverable
    ? connections.isDemo ? 'Demo profile saved in this browser. You can now try connection requests.' : 'Profile saved. Citizens in your ward can discover you.'
    : 'Profile hidden. Existing requests and connections remain available.');
  const refresh = () => perform(() => connections.refresh(), 'People and your requests are up to date.');
  const personProps = { ownProfileId, canSend: connections.canSend, busy, now, onSend: send, onAction: act, onJoin: openProfile };

  return <div className="people-page">
    <header className="people-intro">
      <div className="people-intro-main"><p className="people-location"><MapPin size={14} aria-hidden="true" />Bengaluru, together.</p><h1>People, close to home.</h1><p lang="kn" className="people-heading-kn">ನಮ್ಮ ನೆರೆಹೊರೆ. ನಮ್ಮ ಜನ.</p><p className="people-intro-copy">Meet the citizens who care about your neighbourhood. A connection begins with a choice, on both sides.</p></div>
      <div className="people-intro-note"><HeartHandshake size={33} strokeWidth={1.15} aria-hidden="true" /><p>A little local attention<br />goes further together.</p><Link to="/">Back to the community<ArrowUpRight size={14} aria-hidden="true" /></Link></div>
    </header>

    {connections.isDemo && <div className="people-demo-notice" role="note"><ShieldCheck size={19} aria-hidden="true" /><div><strong>Fictional people. Browser-only connections.</strong><p>Requests and profile choices stay in this browser. Incoming examples are fictional; outgoing requests are never sent to a real person and stay pending. Clearing browser data removes your choices.</p></div></div>}
    {!connections.isDemo && connections.notice && <p className="people-service-notice"><ShieldCheck size={15} aria-hidden="true" />{connections.notice}</p>}

    <div className="people-feedback" aria-live="polite" aria-atomic="true">{message && <div className="people-success"><Check size={16} aria-hidden="true" /><p>{message}</p><button type="button" aria-label="Dismiss update" onClick={() => setMessage('')}><X size={15} aria-hidden="true" /></button></div>}{pending && <p className="people-saving"><Clock3 size={14} aria-hidden="true" />Saving your change…</p>}</div>
    {actionError && <div role="alert" className="people-error"><p>{actionError}</p><button type="button" onClick={() => setActionError('')}>Dismiss</button></div>}
    {wards.error && <div role="alert" className="people-error"><p>The ward list could not be loaded. {wards.error.message}</p><button type="button" onClick={() => window.location.reload()}>Reload page</button></div>}
    {connections.error && <div role="alert" className="people-error"><p>People and your requests could not be loaded. {connections.error.message}</p><button type="button" disabled={busy || connections.refreshing} onClick={() => void refresh()}>Try again</button></div>}

    <div className="people-layout">
      <section className="people-directory" aria-labelledby="people-directory-heading" aria-busy={loading || connections.refreshing}>
        <div className="people-directory-heading"><div><p className="people-section-label"><Users size={15} aria-hidden="true" />The neighbourhood directory</p><h2 id="people-directory-heading">Find your people.</h2></div><button type="button" className="people-refresh" aria-label="Refresh People and connection requests" disabled={loading || busy || connections.refreshing} onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true" /><span>{connections.refreshing ? 'Refreshing…' : 'Refresh'}</span></button></div>
        <p className="people-directory-intro">Only citizens who choose to be discoverable appear here. Browse by ward and look for shared local interests.</p>
        <div className="people-filters"><label className="people-ward-filter"><span>Neighbourhood</span><span className="people-select"><MapPin size={15} aria-hidden="true" /><select value={wardId} onChange={(event) => selectWard(event.target.value)} disabled={wards.loading || !wards.data.length} aria-label="Choose a ward for People">{!wards.data.length && <option value="">{wards.loading ? 'Loading wards…' : 'No wards available'}</option>}{wards.data.map((ward) => <option key={ward.id} value={ward.id}>{ward.name.en}</option>)}</select></span></label><label className="people-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search public bios in the selected ward</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search local interests" disabled={loading} /></label></div>
        {requestedWardId && requestedWardId !== wardId && !wards.loading && <p className="people-context-note">That ward is unavailable. Showing {wardName} instead.</p>}
        {selectedPersonId && !loading && !connections.error && !selectedExists && <p className="people-context-note">This citizen is not currently discoverable in the selected ward. No request was sent.</p>}
        {!connections.canSend && !loading && !connections.error && <div className="people-join-note"><ShieldCheck size={17} aria-hidden="true" /><p>{connections.profile ? 'Your profile is hidden. Enable discovery to send new requests; your existing connections stay available.' : 'You can look around first. Join People and enable discovery when you’re ready to connect.'}</p><button type="button" onClick={openProfile} disabled={busy}>{connections.profile ? 'Edit profile' : 'Join People'}<ArrowUpRight size={14} aria-hidden="true" /></button></div>}

        {loading ? <PeopleLoading /> : connections.error || wards.error ? <PeopleEmpty icon="people" title="The directory is unavailable." description="Use the retry control above to load People again." /> : !wardId ? <PeopleEmpty icon="people" title="Choose a neighbourhood to begin." description="Available wards will appear in the selector above." /> : people.length ? <><p className="people-results" aria-live="polite">{search.trim() ? `${people.length} matching ${people.length === 1 ? 'profile' : 'profiles'}` : `${people.length} ${connections.isDemo ? 'fictional ' : ''}${people.length === 1 ? 'citizen' : 'citizens'} open to connecting`} in {wardName}</p><ul className="people-cards">{people.map((person) => <PersonCard key={person.id} person={person} request={relationshipForPerson(connections.requests, person.id)} {...personProps} selected={person.id === selectedPersonId} cardRef={person.id === selectedPersonId ? selectedCard : undefined} />)}</ul></> : <PeopleEmpty icon="people" title={search.trim() ? 'No matching local interests.' : 'A little space for new neighbours.'} description={search.trim() ? 'Try a shorter word, or clear your search to see everyone in this ward.' : 'No discoverable profiles are available in this ward yet. You can enable your own profile or explore another neighbourhood.'}>{search.trim() ? <button type="button" className="people-button people-button-secondary" onClick={() => setSearch('')}>Clear search</button> : <button type="button" className="people-button people-button-secondary" onClick={openProfile}>Your discovery settings</button>}</PeopleEmpty>}
        <p className="people-directory-footnote"><ShieldCheck size={14} aria-hidden="true" />A connection shares consent, never contact details. No chat or external notifications are sent.</p>
      </section>

      <aside className="people-sidebar" aria-label="Your profile and private connections">
        {connections.loading ? <PeopleLoading compact /> : connections.error ? <section ref={profileSection} tabIndex={-1} className="people-profile"><h2>Your profile is unavailable.</h2><p className="people-profile-intro">Retry the connection above before editing your discovery settings.</p></section> : <ProfileEditor key={JSON.stringify([connections.profile?.id, connections.profile?.ward.id, connections.profile?.bio, connections.profile?.discoverable, connections.profile ? null : wardId])} profile={connections.profile} wards={wards.data} selectedWardId={wardId} busy={busy} isDemo={connections.isDemo} sectionRef={profileSection} onSave={saveProfile} />}
        <section className="people-inbox" aria-labelledby={`${tabId}-heading`} aria-busy={connections.loading || connections.refreshing}><div className="people-inbox-heading"><p className="people-section-label"><Inbox size={15} aria-hidden="true" />Only between you</p><h2 id={`${tabId}-heading`}>Your connections.</h2><p>Requests need a yes from both people.</p></div>
          <div className="people-tabs" role="tablist" aria-label="Private connection lists">{tabs.map(({ value, label }) => <button key={value} type="button" role="tab" id={`${tabId}-${value}`} aria-controls={`${tabId}-panel`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={(event) => { const current = tabs.findIndex((item) => item.value === tab); const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length : event.key === 'ArrowLeft' ? (current + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1; const target = tabs[next]; if (target) { event.preventDefault(); setTab(target.value); document.getElementById(`${tabId}-${target.value}`)?.focus(); } }}><span>{label}</span><small>{requestsInTab(connections.requests, value).length}</small>{tab === value && <motion.span className="people-tab-indicator" layoutId={`${tabId}-indicator`} transition={{ duration: reduced ? 0 : 0.18 }} />}</button>)}</div>
          <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${tab}`} tabIndex={0} className="people-tab-panel">{connections.loading ? <PeopleLoading compact /> : connections.error ? <PeopleEmpty icon="inbox" title="Requests are unavailable." description="Retry above to load your private connection list." compact /> : privateRequests.length ? <ul className="people-private-cards">{privateRequests.map((request) => <PersonCard key={request.id} person={request.peer} request={request} {...personProps} compact />)}</ul> : <PeopleEmpty icon={tab === 'connections' ? 'people' : 'inbox'} title={tab === 'incoming' ? 'No requests waiting.' : tab === 'sent' ? 'No pending requests.' : 'Good connections take two.'} description={tab === 'incoming' ? 'When a citizen requests a connection, you decide whether to accept.' : tab === 'sent' ? 'Find a citizen in your ward and choose Connect. Their response is always their choice.' : 'Accepted requests will appear here. Start with someone who shares a local interest.'} compact />}</div>
        </section>
      </aside>
    </div>
  </div>;
}

function PeopleLoading({ compact = false }: { compact?: boolean }) {
  return <div role="status" className={`people-loading ${compact ? 'is-compact' : ''}`}><span className="sr-only">Loading People and connection requests</span>{[0, 1, 2].map((item) => <div key={item} aria-hidden="true"><span /><div><i /><i /></div></div>)}</div>;
}

function PeopleEmpty({ icon, title, description, compact = false, children }: { icon: 'people' | 'inbox'; title: string; description: string; compact?: boolean; children?: ReactNode }) {
  const Icon = icon === 'people' ? Users : Inbox;
  return <div className={`people-empty ${compact ? 'is-compact' : ''}`}><Icon size={compact ? 25 : 32} strokeWidth={1.2} aria-hidden="true" /><h3>{title}</h3><p>{description}</p>{children}</div>;
}
