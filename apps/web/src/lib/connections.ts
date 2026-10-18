import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zConnectionProfile, type ConnectionAction, type ConnectionPerson, type ConnectionProfileInput, type ConnectionsResponse, type PeopleResponse, type WardDoc } from '@leadnet/shared';
import { api } from './api.ts';
import { useSession } from './auth.ts';
import { isOfflineDemo, readDemo } from './demo.ts';
import { actDemoConnection, CONNECTION_DEMO_KEY, demoConnectionPeople, demoConnectionsView, emptyConnectionDemo, parseConnectionDemo, saveDemoConnectionProfile, sendDemoConnection, type ConnectionDemoState } from './connectionsDemo.ts';
import { canDisplayConnectionInbox, connectionInboxScope } from './connectionsScope.ts';

function loadDemo(): { state: ConnectionDemoState; error: Error | null } {
  if (!isOfflineDemo) return { state: emptyConnectionDemo(), error: null };
  try { return { state: parseConnectionDemo(localStorage.getItem(CONNECTION_DEMO_KEY)), error: null }; }
  catch { return { state: emptyConnectionDemo(), error: new Error('Browser storage is unavailable. Enable site storage to save demo requests.') }; }
}

export function useConnections(wardId: string) {
  const session = useSession();
  const scope = connectionInboxScope(session);
  const queryClient = useQueryClient();
  const [local, setLocal] = useState(loadDemo);
  const localRef = useRef(local.state);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    if (!isOfflineDemo) return;
    const update = (event: StorageEvent) => {
      if (event.key !== CONNECTION_DEMO_KEY && event.key !== null) return;
      const state = parseConnectionDemo(event.newValue);
      localRef.current = state; setLocal({ state, error: null });
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

  const ward = useQuery({ queryKey: ['connections-demo-ward', wardId], enabled: isOfflineDemo && Boolean(wardId), queryFn: async () => {
    const value = await readDemo<WardDoc | null>(`wards/${wardId}`, []);
    if (!value || value.id !== wardId) throw new Error('This region is unavailable. Choose another ward.');
    return value;
  } });
  const people = useQuery({ queryKey: ['people', wardId], enabled: !isOfflineDemo && Boolean(wardId), queryFn: async () => {
    const value = await api.get<PeopleResponse>(`/community/people?wardId=${encodeURIComponent(wardId)}`);
    if (!value || value.wardId !== wardId || !Array.isArray(value.people)) throw new Error('People could not be loaded for this region.');
    return value;
  } });
  const inbox = useQuery({ queryKey: scope.queryKey, enabled: !isOfflineDemo && scope.enabled, retry: false, gcTime: 0, queryFn: async () => {
    const value = await api.get<ConnectionsResponse>('/community/connections', { auth: true, expectedUid: session.user!.uid });
    if (!value || !Array.isArray(value.requests)) throw new Error('Your connection requests could not be loaded.');
    return { response: value, scope: scope.token };
  } });
  const demo = demoConnectionsView(local.state);
  const connected = inbox.data && canDisplayConnectionInbox(session, inbox.data.scope) ? inbox.data.response : undefined;
  const profile = isOfflineDemo ? demo.profile : connected?.profile ?? null;
  const visiblePeople = isOfflineDemo ? ward.data ? demoConnectionPeople(ward.data) : [] : people.data?.wardId === wardId ? people.data.people : [];

  const changeLocal = (transform: (state: ConnectionDemoState) => ConnectionDemoState) => {
    const next = transform(localRef.current);
    localStorage.setItem(CONNECTION_DEMO_KEY, JSON.stringify(next));
    localRef.current = next; setLocal({ state: next, error: null });
  };
  const refresh = async () => {
    if (isOfflineDemo) { const next = loadDemo(); localRef.current = next.state; setLocal(next); if (next.error) throw next.error; if (wardId) await ward.refetch({ throwOnError: true }); return; }
    await Promise.all([wardId ? people.refetch({ throwOnError: true }) : Promise.resolve(), scope.enabled ? inbox.refetch({ throwOnError: true }) : Promise.resolve()]);
  };
  const run = async (operation: () => Promise<void>) => {
    if (busyRef.current) throw new Error('Wait for the current connection action to finish.');
    busyRef.current = true; setBusy(true);
    try {
      await operation();
      if (!isOfflineDemo) await Promise.all([queryClient.invalidateQueries({ queryKey: ['connections'] }), queryClient.invalidateQueries({ queryKey: ['people'] }), queryClient.invalidateQueries({ queryKey: ['region-creators'] })]);
    } finally { busyRef.current = false; setBusy(false); }
  };
  const saveProfile = async (input: ConnectionProfileInput) => run(async () => {
    const clean = zConnectionProfile.parse(input);
    if (isOfflineDemo) {
      const selected = ward.data?.id === clean.wardId ? ward.data : await readDemo<WardDoc | null>(`wards/${clean.wardId}`, []);
      if (!selected || selected.id !== clean.wardId) throw new Error('Choose an available ward before saving.');
      changeLocal((state) => saveDemoConnectionProfile(state, clean, selected, Date.now()));
    } else {
      if (!session.ready) throw new Error('Your sign-in is being checked. Try again in a moment.');
      await api.post<ConnectionsResponse>('/community/connections/profile', clean, { expectedUid: session.user?.uid });
    }
  });
  const send = async (peerId: string) => run(async () => {
    if (isOfflineDemo) {
      const peer = visiblePeople.find((person) => person.id === peerId);
      if (!peer) throw new Error('This fictional profile is unavailable in the selected region.');
      changeLocal((state) => sendDemoConnection(state, peer, Date.now()));
    } else {
      if (!scope.enabled || !profile?.discoverable) throw new Error('Enable your discovery profile before sending a connection request.');
      await api.post<ConnectionsResponse>('/community/connections', { peerId }, { expectedUid: session.user!.uid });
    }
  });
  const act = async (id: string, action: ConnectionAction, revision: number) => run(async () => {
    if (isOfflineDemo) changeLocal((state) => actDemoConnection(state, id, action, revision, Date.now()));
    else {
      if (!scope.enabled) throw new Error('Sign in again before responding to a connection request.');
      await api.post<ConnectionsResponse>(`/community/connections/${encodeURIComponent(id)}/action`, { action, revision }, { expectedUid: session.user!.uid });
    }
  });

  return {
    people: visiblePeople.filter((person: ConnectionPerson) => person.id !== profile?.id), profile, requests: isOfflineDemo ? demo.requests : connected?.requests ?? [],
    loading: isOfflineDemo ? Boolean(wardId) && ward.isPending : (Boolean(wardId) && people.isPending) || Boolean(session.user && (!session.ready || inbox.isPending)),
    refreshing: isOfflineDemo ? ward.isFetching : people.isFetching || (scope.enabled && inbox.isFetching),
    error: isOfflineDemo ? local.error ?? ward.error : people.error ?? (scope.enabled ? inbox.error : null), busy, isDemo: isOfflineDemo,
    notice: isOfflineDemo ? demo.notice : connected?.notice ?? 'Discover opt-in citizens in your region. Requests become connections only after the other person accepts.',
    canSend: Boolean(profile?.discoverable) && (isOfflineDemo || scope.enabled), saveProfile, send, act, refresh,
  };
}
