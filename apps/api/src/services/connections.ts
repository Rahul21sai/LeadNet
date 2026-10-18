import { createHash } from 'node:crypto';
import { applyConnectionAction, connectionSendDecision, scrubPII, type ConnectionAction, type ConnectionPerson, type ConnectionProfile, type ConnectionProfileInput, type ConnectionRecord, type ConnectionsResponse, type ConnectionView, type PeopleResponse } from '@leadnet/shared';
import type { Runtime } from './context.ts';
import type { Identity } from './firebase.ts';
import { ApiFault, documentId, requireValue } from './errors.ts';

export interface ConnectionProfileDoc {
  id: string;
  uid: string;
  ward: { id: string; name: string };
  bio: string;
  discoverable: boolean;
  createdAt: number;
  updatedAt: number;
  isDemo: false;
}

interface ConnectionDoc extends ConnectionRecord {
  senderSnapshot?: ConnectionPerson;
  recipientSnapshot?: ConnectionPerson;
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const connectionProfileId = (uid: string) => hash(JSON.stringify(['leadnet-person', uid]));
const pairId = (first: string, second: string) => hash(JSON.stringify([first, second].sort()));
const notice = 'Citizen connections are private to their participants. Discovery is optional and displays only a ward and a public bio.';

function person(profile: ConnectionProfileDoc | ConnectionPerson): ConnectionPerson {
  return { id: profile.id, authorLabel: 'Citizen', ward: { id: profile.ward.id, name: profile.ward.name }, bio: scrubPII(profile.bio).text.slice(0, 160), isDemo: false };
}

function ownProfile(profile: ConnectionProfileDoc): ConnectionProfile {
  return { ...person(profile), discoverable: profile.discoverable === true };
}

function selectedWard(r: Runtime, selectedWardId?: string) {
  const wardId = documentId(selectedWardId ?? '');
  const ward = r.wards.get(wardId);
  if (!ward || ward.id !== wardId) throw new ApiFault(404, 'ward_not_found', 'Select an existing ward.');
  return ward;
}

export async function communityPeople(r: Runtime, selectedWardId?: string): Promise<PeopleResponse> {
  const ward = selectedWard(r, selectedWardId);
  const profiles = await r.store.list<ConnectionProfileDoc>('connectionProfiles', [{ field: 'ward.id', op: '==', value: ward.id }]);
  const people = profiles.filter((profile) => profile.discoverable === true && profile.ward.id === ward.id && profile.id === connectionProfileId(profile.uid))
    .map(person).sort((first, second) => first.id.localeCompare(second.id));
  return { wardId: ward.id, people, isDemo: false, notice };
}

export async function communityConnections(r: Runtime, identity: Identity): Promise<ConnectionsResponse> {
  const id = connectionProfileId(identity.uid);
  const [profile, outgoing, incoming] = await Promise.all([
    r.store.get<ConnectionProfileDoc>(`connectionProfiles/${id}`),
    r.store.list<ConnectionDoc>('connections', [{ field: 'senderId', op: '==', value: id }]),
    r.store.list<ConnectionDoc>('connections', [{ field: 'recipientId', op: '==', value: id }]),
  ]);
  const records = [...new Map([...outgoing, ...incoming].filter((record) => record.senderId === id || record.recipientId === id).map((record) => [record.id, record])).values()];
  const requests: ConnectionView[] = [];
  for (const record of records) {
    const direction = record.senderId === id ? 'outgoing' : 'incoming';
    const peer = direction === 'outgoing' ? record.recipientSnapshot : record.senderSnapshot;
    // A past request grants access only to the information consented to when it was sent.
    if (!record.senderSnapshot || !record.recipientSnapshot || !peer || peer.id !== (direction === 'outgoing' ? record.recipientId : record.senderId)) continue;
    requests.push({ id: record.id, peer: person(peer), direction, status: record.status, createdAt: record.createdAt, updatedAt: record.updatedAt, revision: record.revision, isDemo: false });
  }
  requests.sort((first, second) => second.updatedAt - first.updatedAt || first.id.localeCompare(second.id));
  return { profile: profile && profile.uid === identity.uid && profile.id === id ? ownProfile(profile) : null, requests, isDemo: false, notice };
}

export async function saveConnectionProfile(r: Runtime, identity: Identity, input: ConnectionProfileInput): Promise<ConnectionsResponse> {
  const ward = selectedWard(r, input.wardId);
  const id = connectionProfileId(identity.uid);
  const path = `connectionProfiles/${id}`;
  await r.store.atomic(async (tx) => {
    const previous = await tx.get<ConnectionProfileDoc>(path);
    const now = r.now();
    tx.set(path, { id, uid: identity.uid, ward: { id: ward.id, name: ward.name.en || ward.name.kn }, bio: scrubPII(input.bio.trim()).text.slice(0, 160), discoverable: input.discoverable, createdAt: previous?.createdAt ?? now, updatedAt: now, isDemo: false } satisfies ConnectionProfileDoc);
  });
  return communityConnections(r, identity);
}

export async function sendConnection(r: Runtime, identity: Identity, peerId: string): Promise<ConnectionsResponse> {
  const senderId = connectionProfileId(identity.uid);
  const recipientId = documentId(peerId);
  if (senderId === recipientId) throw new ApiFault(400, 'self_connection', 'Choose another citizen to connect with.');
  const id = pairId(senderId, recipientId);
  await r.store.atomic(async (tx) => {
    const now = r.now();
    const limitPath = `communityLimits/${hash(`${identity.uid}:connection:${Math.floor(now / 3_600_000)}`)}`;
    // Consent and the pair share one transaction so disabling discovery cannot race a new request.
    const [sender, recipient, previous, limit] = await Promise.all([
      tx.get<ConnectionProfileDoc>(`connectionProfiles/${senderId}`),
      tx.get<ConnectionProfileDoc>(`connectionProfiles/${recipientId}`),
      tx.get<ConnectionDoc>(`connections/${id}`),
      tx.get<{ count: number }>(limitPath),
    ]);
    const decision = connectionSendDecision(previous, senderId, recipientId, now);
    if (decision.kind === 'existing') return;
    if (decision.kind === 'conflict') throw new ApiFault(409, 'incoming_pending', 'This citizen already sent you a request. Respond to it in Incoming.');
    if (!sender || sender.uid !== identity.uid || sender.id !== senderId || sender.discoverable !== true) throw new ApiFault(409, 'profile_required', 'Enable your discovery profile before sending a request.');
    if (!recipient || recipient.id !== recipientId || recipientId !== connectionProfileId(recipient.uid) || recipient.discoverable !== true) throw new ApiFault(404, 'person_unavailable', 'This citizen is unavailable for new requests.');
    if (decision.kind === 'cooldown') throw new ApiFault(409, 'connection_cooldown', 'Please wait 24 hours after a decline or removal before sending another request.');
    if ((limit?.count ?? 0) >= 20) throw new ApiFault(429, 'rate_limited', 'Please wait before sending more connection requests.');
    const record: ConnectionDoc = { id, senderId, recipientId, status: 'pending', createdAt: now, updatedAt: now, revision: (previous?.revision ?? 0) + 1, isDemo: false, senderSnapshot: person(sender), recipientSnapshot: person(recipient) };
    tx.set(`connections/${id}`, record);
    tx.set(limitPath, { count: (limit?.count ?? 0) + 1, updatedAt: now });
  });
  return communityConnections(r, identity);
}

export async function actOnConnection(r: Runtime, identity: Identity, connectionId: string, action: ConnectionAction, revision: number): Promise<ConnectionsResponse> {
  const id = documentId(connectionId);
  await r.store.atomic(async (tx) => {
    const candidate = await tx.get<ConnectionDoc>(`connections/${id}`);
    const actorId = connectionProfileId(identity.uid);
    const previous = requireValue(candidate && (candidate.senderId === actorId || candidate.recipientId === actorId) ? candidate : null, 'connection_not_found');
    const result = applyConnectionAction(previous, actorId, action, revision, r.now());
    if (!result.ok) {
      const message = result.code === 'not_participant' ? 'Only participants can respond to this connection.' : result.code === 'stale_connection' ? 'This connection changed. Refresh before responding.' : 'This action is unavailable for this connection.';
      throw new ApiFault(result.code === 'not_participant' ? 403 : 409, result.code, message);
    }
    if (result.record !== previous) tx.set(`connections/${id}`, { ...previous, ...result.record });
  });
  return communityConnections(r, identity);
}
