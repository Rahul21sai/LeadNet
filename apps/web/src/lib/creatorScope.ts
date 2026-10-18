import type { Role } from '@leadnet/shared';

export interface CreatorSession {
  ready: boolean;
  user: { uid: string } | null;
  role: Role;
  wardIds: readonly string[];
  demoOfficer?: boolean;
}

export function regionCreatorsScope(session: CreatorSession, wardId: string) {
  const wardIds = [...new Set(session.wardIds)].sort();
  return {
    queryKey: ['region-creators', session.user?.uid ?? null, session.role, wardIds, session.demoOfficer === true, wardId] as const,
    allowed: session.ready && !session.demoOfficer && Boolean(session.user?.uid) && Boolean(wardId)
      && (session.role === 'admin' || (session.role === 'officer' && wardIds.includes(wardId))),
  };
}

export function canDisplayRegionCreators(session: CreatorSession, selectedWardId: string, responseWardId: string): boolean {
  return regionCreatorsScope(session, selectedWardId).allowed && selectedWardId === responseWardId;
}
