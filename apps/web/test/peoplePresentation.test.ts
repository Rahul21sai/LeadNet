import { describe, expect, it } from 'vitest';
import type { ConnectionPerson, ConnectionView } from '@leadnet/shared';
import { connectionCardState, peopleInWard, requestsInTab, relationshipForPerson } from '../src/routes/people/presentation.ts';

const person = (id: string, wardId = 'ward-1', bio = ''): ConnectionPerson => ({
  id, authorLabel: 'Citizen', ward: { id: wardId, name: wardId === 'ward-1' ? 'Jayanagar' : 'Malleshwaram' }, bio, isDemo: true,
});
const request = (id: string, status: ConnectionView['status'], direction: ConnectionView['direction'], updatedAt = 1): ConnectionView => ({
  id, peer: person(id), status, direction, createdAt: 1, updatedAt, revision: updatedAt, isDemo: true,
});

describe('People discovery presentation', () => {
  const people = [person('local', 'ward-1', 'Safer footpaths and evening walks.'), person('other', 'ward-2', 'Trees and safer crossings.'), person('self', 'ward-1', 'Trees near home.')];

  it('keeps discovery inside the selected ward and excludes your own card', () => {
    expect(peopleInWard(people, 'ward-1', '', 'self').map((entry) => entry.id)).toEqual(['local']);
    expect(peopleInWard(people, '', '')).toEqual([]);
  });

  it('searches public bio and ward text without making opaque identities searchable', () => {
    expect(peopleInWard(people, 'ward-1', '  EVENING ').map((entry) => entry.id)).toEqual(['local']);
    expect(peopleInWard(people, 'ward-1', 'jayanagar')).toHaveLength(2);
    expect(peopleInWard(people, 'ward-1', 'local')).toEqual([]);
    expect(peopleInWard(people, 'ward-1', 'crossings')).toEqual([]);
  });
});

describe('private connection list presentation', () => {
  const records = [request('incoming', 'pending', 'incoming', 3), request('sent', 'pending', 'outgoing', 2), request('accepted', 'accepted', 'outgoing', 5), request('declined', 'declined', 'incoming', 8), request('cancelled', 'cancelled', 'outgoing', 9), request('removed', 'removed', 'outgoing', 10)];

  it('separates pending direction and accepted connections without exposing ended requests as active', () => {
    expect(requestsInTab(records, 'incoming').map((entry) => entry.id)).toEqual(['incoming']);
    expect(requestsInTab(records, 'sent').map((entry) => entry.id)).toEqual(['sent']);
    expect(requestsInTab(records, 'connections').map((entry) => entry.id)).toEqual(['accepted']);
  });

  it('puts the most recently updated requests first without mutating the hook data', () => {
    const first = request('first', 'pending', 'incoming', 1);
    const latest = request('latest', 'pending', 'incoming', 9);
    const source = [first, latest];
    expect(requestsInTab(source, 'incoming')).toEqual([latest, first]);
    expect(source).toEqual([first, latest]);
  });

  it('matches a card only to its own participant relationship', () => {
    expect(relationshipForPerson(records, 'sent')).toBe(records[1]);
    expect(relationshipForPerson(records, 'unknown')).toBeUndefined();
  });
});

describe('connection card controls', () => {
  it('requires discovery consent only for a new send, retaining existing participant actions while hidden', () => {
    expect(connectionCardState(undefined, 'self', false, 100)).toEqual({ kind: 'join' });
    expect(connectionCardState(request('peer', 'pending', 'incoming'), 'self', false, 100)).toEqual({ kind: 'incoming' });
    expect(connectionCardState(request('peer', 'pending', 'outgoing'), 'self', false, 100)).toEqual({ kind: 'requested' });
    expect(connectionCardState(request('peer', 'accepted', 'incoming'), 'self', false, 100)).toEqual({ kind: 'connected' });
  });

  it('keeps a declined outgoing request in the shared resend cooldown', () => {
    expect(connectionCardState(request('peer', 'declined', 'outgoing', 10), 'self', true, 20)).toMatchObject({ kind: 'cooldown', retryAt: 86_400_010 });
    expect(connectionCardState(request('peer', 'declined', 'outgoing', 10), 'self', true, 86_400_010)).toEqual({ kind: 'connect' });
  });

  it('allows resending cancelled requests but retains the shared cooldown for either participant after decline', () => {
    expect(connectionCardState(request('peer', 'cancelled', 'outgoing'), 'self', true, 20)).toEqual({ kind: 'connect' });
    expect(connectionCardState(request('peer', 'declined', 'incoming'), 'self', true, 20)).toMatchObject({ kind: 'cooldown' });
  });

  it('honours the shared cooldown after either participant removes a connection', () => {
    expect(connectionCardState(request('peer', 'removed', 'incoming', 10), 'self', true, 20)).toMatchObject({ kind: 'cooldown' });
  });
});
