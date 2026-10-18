import { connectionRecordFromView, connectionSendDecision, type ConnectionPerson, type ConnectionView } from '@leadnet/shared';

export type ConnectionTab = 'incoming' | 'sent' | 'connections';

export function peopleInWard(people: readonly ConnectionPerson[], wardId: string, search: string, ownId?: string): ConnectionPerson[] {
  const query = search.trim().toLocaleLowerCase();
  return people.filter((person) => Boolean(wardId) && person.ward.id === wardId && person.id !== ownId
    && (!query || `${person.authorLabel} ${person.ward.name} ${person.bio}`.toLocaleLowerCase().includes(query)));
}

export function requestsInTab(requests: readonly ConnectionView[], tab: ConnectionTab): ConnectionView[] {
  return requests.filter((request) => tab === 'connections' ? request.status === 'accepted'
    : request.status === 'pending' && request.direction === (tab === 'incoming' ? 'incoming' : 'outgoing'))
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export function relationshipForPerson(requests: readonly ConnectionView[], personId: string): ConnectionView | undefined {
  return requests.find((request) => request.peer.id === personId);
}

export function connectionCardState(request: ConnectionView | undefined, ownProfileId: string, canSend: boolean, now: number): { kind: 'join' | 'connect' | 'incoming' | 'requested' | 'connected' | 'cooldown'; retryAt?: number } {
  if (request?.status === 'accepted') return { kind: 'connected' };
  if (request?.status === 'pending') return { kind: request.direction === 'incoming' ? 'incoming' : 'requested' };
  if (!canSend) return { kind: 'join' };
  if (request) {
    const decision = connectionSendDecision(connectionRecordFromView(request, ownProfileId), ownProfileId, request.peer.id, now);
    if (decision.kind === 'cooldown') return { kind: 'cooldown', retryAt: decision.retryAt };
  }
  return { kind: 'connect' };
}
