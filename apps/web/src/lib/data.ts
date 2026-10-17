import { useEffect, useState } from 'react';
import { collection, doc, limit as qLimit, onSnapshot, orderBy, query, where, type QueryConstraint } from 'firebase/firestore';
import type { AiRunDoc, EvidenceDoc, IssueDoc, IssueEventDoc, LeaderDoc, LedgerDoc, ProjectDoc, UserDoc, WardDoc } from '@leadnet/shared';
import { db } from './firebase.ts';
import { isOfflineDemo, readDemo } from './demo.ts';
import { useSession } from './auth.ts';

/**
 * Realtime read hooks over public Firestore collections. Browsers never write
 * to Firestore — every mutation goes through the API. All hooks return
 * { data, loading, error } and re-render live as documents change.
 */
export interface Live<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

function useLiveQuery<T>(path: string | null, constraints: QueryConstraint[], deps: unknown[], initial: T[] = []): Live<T[]> {
  const [state, setState] = useState<Live<T[]>>({ data: initial, loading: path !== null, error: null });
  useEffect(() => {
    if (!path) {
      setState({ data: initial, loading: false, error: null });
      return;
    }
    setState({ data: initial, loading: true, error: null });
    if (isOfflineDemo) {
      let active = true;
      void readDemo<T[]>(path, deps).then((data) => { if (active) setState({ data, loading: false, error: null }); },
        (error: Error) => { if (active) setState({ data: initial, loading: false, error }); });
      return () => { active = false; };
    }
    const q = query(collection(db, path), ...constraints);
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })), loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  return state;
}

function useLiveDoc<T>(path: string | null, deps: unknown[] = []): Live<T | null> {
  const [state, setState] = useState<Live<T | null>>({ data: null, loading: path !== null, error: null });
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState({ data: null, loading: true, error: null });
    if (isOfflineDemo) {
      let active = true;
      void readDemo<T | null>(path, deps).then((data) => { if (active) setState({ data, loading: false, error: null }); },
        (error: Error) => { if (active) setState({ data: null, loading: false, error }); });
      return () => { active = false; };
    }
    return onSnapshot(
      doc(db, path),
      (snap) => setState({ data: snap.exists() ? ({ ...(snap.data() as T), id: snap.id } as T) : null, loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  return state;
}

/** All non-duplicate issues for the map/feed (capped). */
export function useIssues(opts: { wardId?: string; max?: number } = {}): Live<IssueDoc[]> {
  const c: QueryConstraint[] = [];
  if (opts.wardId) c.push(where('wardId', '==', opts.wardId));
  c.push(orderBy('lastEventAt', 'desc'), qLimit(opts.max ?? 500));
  return useLiveQuery<IssueDoc>('issues', c, [opts.wardId, opts.max]);
}

export const useIssue = (id: string | undefined) => useLiveDoc<IssueDoc>(id ? `issues/${id}` : null, [id]);

export function useIssueEvents(id: string | undefined): Live<IssueEventDoc[]> {
  return useLiveQuery<IssueEventDoc>(id ? `issues/${id}/events` : null, [orderBy('at', 'asc')], [id]);
}

export function useIssueEvidence(id: string | undefined): Live<EvidenceDoc[]> {
  return useLiveQuery<EvidenceDoc>(id ? `issues/${id}/evidence` : null, [orderBy('uploadedAt', 'asc')], [id]);
}

export const useLedger = () => useLiveDoc<LedgerDoc>('ledger/city');
export const useWard = (id: string | undefined) => useLiveDoc<WardDoc>(id ? `wards/${id}` : null, [id]);
export const useWards = () => useLiveQuery<WardDoc>('wards', [], []);
export const useLeaders = () => useLiveQuery<LeaderDoc>('leaders', [], []);
export const useLeader = (id: string | undefined) => useLiveDoc<LeaderDoc>(id ? `leaders/${id}` : null, [id]);
export function useMyProfile(): Live<UserDoc | null> {
  const { user } = useSession();
  return useLiveDoc<UserDoc>(user && !isOfflineDemo ? `users/${user.uid}` : null, [user?.uid]);
}
export function useAiRuns(issueId: string | undefined): Live<AiRunDoc[]> {
  return useLiveQuery<AiRunDoc>(issueId ? 'aiRuns' : null,
    [where('issueId', '==', issueId ?? ''), where('public', '==', true)], [issueId]);
}
export const useProject = (id: string | undefined) => useLiveDoc<ProjectDoc>(id ? `projects/${id}` : null, [id]);

export function useProjects(opts: { wardId?: string } = {}): Live<ProjectDoc[]> {
  const c: QueryConstraint[] = opts.wardId ? [where('wardId', '==', opts.wardId)] : [];
  return useLiveQuery<ProjectDoc>('projects', c, [opts.wardId]);
}
