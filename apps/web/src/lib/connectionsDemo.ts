import { z } from 'zod';
import { applyConnectionAction, connectionSendDecision, CONNECTION_STATUSES, scrubPII, type ConnectionAction, type ConnectionPerson, type ConnectionProfile, type ConnectionProfileInput, type ConnectionRecord, type ConnectionsResponse, type WardDoc } from '@leadnet/shared';

export const CONNECTION_DEMO_KEY = 'leadnet-connections-device-v1';
export const DEMO_SELF_ID = 'device-self';
export interface ConnectionDemoState { version: 1; profile: ConnectionProfile | null; people: ConnectionPerson[]; records: ConnectionRecord[]; sentTimes: number[] }
export const emptyConnectionDemo = (): ConnectionDemoState => ({ version: 1, profile: null, people: [], records: [], sentTimes: [] });

const id = z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/);
const time = z.number().finite().nonnegative().max(8_640_000_000_000_000);
const person = z.object({ id, authorLabel: z.literal('Citizen'), ward: z.object({ id, name: z.string().min(1).max(160) }).strict(), bio: z.string().max(160), isDemo: z.literal(true) }).strict();
const record = z.object({ id, senderId: id, recipientId: id, status: z.enum(CONNECTION_STATUSES), createdAt: time, updatedAt: time, revision: z.number().int().min(1), isDemo: z.literal(true) }).strict();
const stored = z.object({ version: z.literal(1), profile: person.extend({ discoverable: z.boolean() }).nullable(), people: z.array(person).max(2000), records: z.array(record).max(2000), sentTimes: z.array(time).max(20) }).strict();

export function parseConnectionDemo(raw: string | null): ConnectionDemoState {
  try {
    if (!raw) return emptyConnectionDemo();
    const parsed = stored.parse(JSON.parse(raw));
    if ((parsed.profile && parsed.profile.id !== DEMO_SELF_ID) || parsed.people.some((peer) => !peer.id.startsWith('demo-'))) return emptyConnectionDemo();
    const ids = new Set([DEMO_SELF_ID, ...parsed.people.map((peer) => peer.id)]);
    if ((!parsed.profile && parsed.records.length) || new Set(parsed.records.map((item) => item.id)).size !== parsed.records.length || parsed.records.some((item) => !item.id.startsWith('demo-pair-') || !ids.has(item.senderId) || !ids.has(item.recipientId) || item.senderId === item.recipientId || (item.senderId !== DEMO_SELF_ID && item.recipientId !== DEMO_SELF_ID))) return emptyConnectionDemo();
    return { ...parsed, profile: parsed.profile ? { ...parsed.profile, bio: scrubPII(parsed.profile.bio).text.slice(0, 160) } : null, people: parsed.people.map((peer) => ({ ...peer, bio: scrubPII(peer.bio).text.slice(0, 160) })) };
  } catch { return emptyConnectionDemo(); }
}

export function demoConnectionPeople(ward: Pick<WardDoc, 'id' | 'name'>): ConnectionPerson[] {
  const bios = ['Interested in safer, more accessible footpaths.', 'Sharing observations about local roads and drainage.', 'Working together for cleaner neighbourhoods.', 'Interested in local civic conversations and public spaces.'];
  return bios.map((bio, index) => ({ id: `demo-${ward.id}-citizen-${index + 1}`, authorLabel: 'Citizen', ward: { id: ward.id, name: ward.name.en }, bio, isDemo: true }));
}

export function saveDemoConnectionProfile(state: ConnectionDemoState, input: ConnectionProfileInput, ward: Pick<WardDoc, 'id' | 'name'>, now: number): ConnectionDemoState {
  if (input.wardId !== ward.id) throw new Error('Choose an available ward.');
  const profile: ConnectionProfile = { id: DEMO_SELF_ID, authorLabel: 'Citizen', ward: { id: ward.id, name: ward.name.en }, bio: scrubPII(input.bio).text.slice(0, 160), discoverable: input.discoverable, isDemo: true };
  const seed = input.discoverable && !state.records.length && !state.people.length ? demoConnectionPeople(ward) : [];
  const examples: ConnectionRecord[] = seed.slice(0, 2).map((peer) => ({ id: `demo-pair-${peer.id}`, senderId: peer.id, recipientId: DEMO_SELF_ID, status: 'pending', createdAt: now, updatedAt: now, revision: 1, isDemo: true }));
  return { ...state, profile, people: [...state.people, ...seed], records: [...state.records, ...examples] };
}

export function sendDemoConnection(state: ConnectionDemoState, peer: ConnectionPerson, now: number): ConnectionDemoState {
  if (!state.profile?.discoverable) throw new Error('Enable your discovery profile before sending a request.');
  if (!peer.isDemo || !peer.id.startsWith('demo-') || peer.id === state.profile.id) throw new Error('Choose an available fictional citizen.');
  const previous = state.records.find((item) => (item.senderId === DEMO_SELF_ID && item.recipientId === peer.id) || (item.recipientId === DEMO_SELF_ID && item.senderId === peer.id));
  const decision = connectionSendDecision(previous ?? null, DEMO_SELF_ID, peer.id, now);
  if (decision.kind === 'existing') return state;
  if (decision.kind === 'conflict') throw new Error('This example citizen already sent a request. Accept or decline it in Incoming.');
  if (decision.kind === 'cooldown') throw new Error('Wait 24 hours after a decline or removal before requesting again.');
  const sentTimes = state.sentTimes.filter((at) => now - at < 3_600_000);
  if (sentTimes.length >= 20) throw new Error('Wait before trying more example requests.');
  const next: ConnectionRecord = { id: `demo-pair-${peer.id}`, senderId: DEMO_SELF_ID, recipientId: peer.id, status: 'pending', createdAt: now, updatedAt: now, revision: (previous?.revision ?? 0) + 1, isDemo: true };
  return { ...state, people: state.people.some((value) => value.id === peer.id) ? state.people : [...state.people, peer], records: [...state.records.filter((item) => item.id !== next.id), next], sentTimes: [...sentTimes, now] };
}

export function actDemoConnection(state: ConnectionDemoState, id: string, action: ConnectionAction, revision: number, now: number): ConnectionDemoState {
  const previous = state.records.find((item) => item.id === id);
  if (!previous) throw new Error('This example request is unavailable.');
  const result = applyConnectionAction(previous, DEMO_SELF_ID, action, revision, now);
  if (!result.ok) throw new Error(result.code === 'stale_connection' ? 'This request changed. Refresh before responding.' : 'This action is unavailable for this request.');
  return { ...state, records: state.records.map((item) => item.id === id ? result.record : item) };
}

export function demoConnectionsView(state: ConnectionDemoState): ConnectionsResponse {
  const requests = state.records.flatMap((item) => {
    const direction = item.senderId === DEMO_SELF_ID ? 'outgoing' as const : 'incoming' as const;
    const peer = state.people.find((person) => person.id === (direction === 'outgoing' ? item.recipientId : item.senderId));
    return peer ? [{ id: item.id, peer, direction, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt, revision: item.revision, isDemo: true }] : [];
  }).sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  return { profile: state.profile, requests, isDemo: true, notice: 'Device-only connection demo. People and incoming requests are fictional examples. Your requests stay in this browser; nobody is contacted and outgoing requests are not automatically accepted.' };
}
