import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { WardDoc } from '@leadnet/shared';
import { createApp } from '../src/app.ts';
import type { Filter } from '../src/services/store.ts';
import { MemoryStore } from './helpers.ts';

const ward: WardDoc = { id: 'ward-connect', number: 1, name: { en: 'Connect ward', kn: 'ವಾರ್ಡ್' }, zone: null, corporation: null, assembly: null, centroid: { lat: 12.97, lng: 77.59 }, officerLeaderId: null, stats: null, statsUpdatedAt: null };
const otherWard: WardDoc = { ...ward, id: 'ward-other', name: { en: 'Other ward', kn: 'ಇತರೆ' } };
const profileId = (uid: string) => createHash('sha256').update(JSON.stringify(['leadnet-person', uid])).digest('hex');
interface Inbox { profile: { id: string; bio: string; discoverable: boolean } | null; requests: Array<{ id: string; status: string; revision: number; direction: string; peer: { id: string; bio: string } }>; isDemo: boolean }

class TrackingStore extends MemoryStore {
  reads: Array<{ collection: string; filters: Filter[] } | { path: string }> = [];
  override async get<T>(path: string): Promise<T | null> { this.reads.push({ path }); return super.get(path); }
  override async list<T>(collection: string, filters: Filter[] = []): Promise<T[]> { this.reads.push({ collection, filters }); return super.list(collection, filters); }
}

function setup() {
  const store = new TrackingStore(); let now = 10_000;
  const app = createApp({ store, now: () => now, auth: { async verify(token) { return { uid: token, role: 'citizen', wardIds: [] }; }, async setRole() {} }, wards: { lookup: () => ward, get: (id) => id === ward.id ? ward : id === otherWard.id ? otherWard : null } });
  const request = (path: string, token: string | null = 'PRIVATE_ALICE_UID', body?: unknown) => app.request(`/api/v1/community/${path}`, { ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }), headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) } });
  const profile = (token = 'PRIVATE_ALICE_UID', options: Record<string, unknown> = {}) => request('connections/profile', token, { wardId: ward.id, bio: 'Interested in better footpaths.', discoverable: true, ...options });
  const send = (sender = 'PRIVATE_ALICE_UID', recipient = 'PRIVATE_BOB_UID') => request('connections', sender, { peerId: profileId(recipient) });
  const action = (id: string, token: string, choice: string, revision: number) => request(`connections/${id}/action`, token, { action: choice, revision });
  async function pair() { expect((await profile()).status).toBe(200); expect((await profile('PRIVATE_BOB_UID')).status).toBe(200); const sent = await send(); expect(sent.status).toBe(200); return (await sent.json() as Inbox).requests[0]!; }
  return { store, request, profile, send, action, pair, advance: (milliseconds: number) => { now += milliseconds; } };
}

describe('connection profile consent and privacy', () => {
  it('bounds the sanitized bio after privacy replacements expand the supplied wording', async () => {
    const s = setup(); const response = await s.profile('PRIVATE_ALICE_UID', { bio: 'a@b.co '.repeat(20).trim() });
    expect(response.status).toBe(200); const result = await response.json() as Inbox;
    expect(result.profile!.bio.length).toBeLessThanOrEqual(160);
    expect(result.profile!.bio).not.toContain('a@b.co');
    expect((await s.profile('PRIVATE_ALICE_UID', { bio: result.profile!.bio })).status).toBe(200);
  });
  it('requires authentication for the inbox and every mutation before reading private records', async () => {
    const s = setup();
    for (const [path, body] of [['connections', undefined], ['connections/profile', { wardId: ward.id, bio: '', discoverable: true }], ['connections', { peerId: profileId('bob') }], ['connections/pair/action', { action: 'accept', revision: 1 }]] as const) {
      const response = await s.request(path, null, body); expect(response.status).toBe(401); expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    }
    expect(s.store.reads).toEqual([]);
  });
  it('exposes an empty signed-in inbox with private cache headers', async () => {
    const s = setup(); const response = await s.request('connections');
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ profile: null, requests: [], isDemo: false }); expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('stores a stable opaque profile with scrubbed bio and preserves its creation time', async () => {
    const s = setup(); const first = await s.profile('PRIVATE_ALICE_UID', { bio: 'Contact private@example.com or 9876543210' });
    expect(first.status).toBe(200); expect(first.headers.get('Cache-Control')).toBe('private, no-store');
    const firstResult = await first.json() as Inbox; expect(firstResult.profile).toMatchObject({ id: profileId('PRIVATE_ALICE_UID'), bio: 'Contact [email removed] or [phone removed]', discoverable: true });
    const stored = await s.store.get<{ uid: string; createdAt: number; updatedAt: number }>(`connectionProfiles/${profileId('PRIVATE_ALICE_UID')}`); expect(stored).toMatchObject({ uid: 'PRIVATE_ALICE_UID', createdAt: 10_000, updatedAt: 10_000 });
    s.advance(50); expect((await s.profile('PRIVATE_ALICE_UID', { discoverable: false, wardId: otherWard.id })).status).toBe(200);
    expect(await s.store.get(`connectionProfiles/${profileId('PRIVATE_ALICE_UID')}`)).toMatchObject({ createdAt: 10_000, updatedAt: 10_050, discoverable: false, ward: { id: otherWard.id, name: otherWard.name.en } });
    expect(JSON.stringify(firstResult)).not.toContain('PRIVATE_ALICE_UID'); expect(JSON.stringify(firstResult)).not.toContain('"uid"');
  });
  it('validates the selected ward and all profile fields before storage', async () => {
    const s = setup();
    for (const options of [{ wardId: 'missing-ward' }, { wardId: '../ward' }, { bio: 'a'.repeat(501) }, { discoverable: 'yes' }]) {
      const response = await s.profile('PRIVATE_ALICE_UID', options); expect([400, 404]).toContain(response.status);
    }
    expect(s.store.docs.size).toBe(0);
  });
  it('publicly discovers only explicit opt-ins in the selected ward with no private data', async () => {
    const s = setup(); await s.profile(); await s.profile('PRIVATE_BOB_UID', { discoverable: false }); await s.profile('PRIVATE_CHARLIE_UID', { wardId: otherWard.id }); s.store.reads = [];
    const response = await s.request(`people?wardId=${ward.id}`, null); expect(response.status).toBe(200); const result = await response.json() as { people: Array<{ id: string }> };
    expect(result.people.map((person) => person.id)).toEqual([profileId('PRIVATE_ALICE_UID')]);
    expect(Object.keys(result.people[0]!).sort()).toEqual(['authorLabel', 'bio', 'id', 'isDemo', 'ward']);
    for (const secret of ['PRIVATE_', '"uid"', 'discoverable', 'centroid', '12.97', '77.59', 'createdAt']) expect(JSON.stringify(result)).not.toContain(secret);
    expect(s.store.reads).toEqual([{ collection: 'connectionProfiles', filters: [{ field: 'ward.id', op: '==', value: ward.id }] }]);
  });
  it('rejects invalid public ward ids without a database query', async () => {
    const s = setup(); for (const query of ['', '?wardId=../ward', '?wardId=missing']) { expect([400, 404]).toContain((await s.request(`people${query}`, null)).status); } expect(s.store.reads).toEqual([]);
  });
});

describe('connection request transactions', () => {
  it('requires an enabled sender profile and enabled recipient and rejects self requests', async () => {
    const s = setup(); await s.profile('PRIVATE_BOB_UID'); expect((await s.send()).status).toBe(409);
    await s.profile('PRIVATE_ALICE_UID', { discoverable: false }); expect((await s.send()).status).toBe(409);
    await s.profile(); expect((await s.send('PRIVATE_ALICE_UID', 'PRIVATE_ALICE_UID')).status).toBe(400);
    await s.profile('PRIVATE_BOB_UID', { discoverable: false }); expect((await s.send()).status).toBe(404);
    expect((await s.send('PRIVATE_ALICE_UID', 'missing')).status).toBe(404);
    expect([...s.store.docs.keys()].filter((path) => path.startsWith('connections/'))).toEqual([]);
  });
  it('returns participant-only request projections and scopes every inbox query', async () => {
    const s = setup(); const pair = await s.pair(); s.store.reads = [];
    const response = await s.request('connections', 'PRIVATE_BOB_UID'); expect(response.status).toBe(200); const result = await response.json() as Inbox;
    expect(result.requests).toMatchObject([{ id: pair.id, direction: 'incoming', status: 'pending', revision: 1, peer: { id: profileId('PRIVATE_ALICE_UID') } }]);
    expect(JSON.stringify(result)).not.toContain('PRIVATE_'); expect(JSON.stringify(result)).not.toContain('senderId'); expect(JSON.stringify(result)).not.toContain('recipientId');
    const queries = s.store.reads.filter((read) => 'collection' in read && read.collection === 'connections');
    expect(queries).toEqual([{ collection: 'connections', filters: [{ field: 'senderId', op: '==', value: profileId('PRIVATE_BOB_UID') }] }, { collection: 'connections', filters: [{ field: 'recipientId', op: '==', value: profileId('PRIVATE_BOB_UID') }] }]);
    expect((await (await s.request('connections', 'PRIVATE_CHARLIE_UID')).json() as Inbox).requests).toEqual([]);
  });
  it('makes repeated concurrent sends idempotent and never auto-accepts opposite sends', async () => {
    const s = setup(); await s.profile(); await s.profile('PRIVATE_BOB_UID');
    const same = await Promise.all([s.send(), s.send(), s.send()]); expect(same.map((response) => response.status)).toEqual([200, 200, 200]);
    const sameResults = await Promise.all(same.map((response) => response.json() as Promise<Inbox>)); expect(sameResults.every((result) => result.requests[0]?.revision === 1 && result.requests[0]?.status === 'pending')).toBe(true);
    const crossed = await s.send('PRIVATE_BOB_UID', 'PRIVATE_ALICE_UID'); expect(crossed.status).toBe(409); expect(await crossed.json()).toMatchObject({ error: { code: 'incoming_pending' } });
    expect([...s.store.docs.keys()].filter((path) => path.startsWith('connections/'))).toHaveLength(1);
    expect([...s.store.docs].filter(([path]) => path.startsWith('communityLimits/')).map(([, value]) => value)).toMatchObject([{ count: 1 }]);
  });
  it('serializes simultaneous opposite requests into one pending pair', async () => {
    const s = setup(); await s.profile(); await s.profile('PRIVATE_BOB_UID'); const responses = await Promise.all([s.send(), s.send('PRIVATE_BOB_UID', 'PRIVATE_ALICE_UID')]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]); expect([...s.store.docs].filter(([path]) => path.startsWith('connections/')).map(([, value]) => value)).toMatchObject([{ status: 'pending', revision: 1 }]);
  });
  it('rejects nonparticipant and sender acceptance with unchanged state', async () => {
    const s = setup(); const pair = await s.pair();
    const outsider = await s.action(pair.id, 'PRIVATE_CHARLIE_UID', 'accept', 1); expect(outsider.status).toBe(404);
    const sender = await s.action(pair.id, 'PRIVATE_ALICE_UID', 'accept', 1); expect(sender.status).toBe(409);
    expect(await s.store.get(`connections/${pair.id}`)).toMatchObject({ status: 'pending', revision: 1 });
  });
  it('makes outsider responses identical for existing and absent publicly calculable pairs', async () => {
    const s = setup(); const pair = await s.pair();
    const absentPairId = createHash('sha256').update(JSON.stringify([profileId('PRIVATE_ALICE_UID'), profileId('PRIVATE_DANA_UID')].sort())).digest('hex');
    const existing = await s.action(pair.id, 'PRIVATE_CHARLIE_UID', 'accept', 1);
    const absent = await s.action(absentPairId, 'PRIVATE_CHARLIE_UID', 'accept', 1);
    expect(existing.status).toBe(404); expect(absent.status).toBe(existing.status); expect(await existing.json()).toEqual(await absent.json());
    expect(await s.store.get(`connections/${pair.id}`)).toMatchObject({ status: 'pending', revision: 1 });
  });
  it('accepts recipient consent, makes retries idempotent, and rejects stale or invalid actions', async () => {
    const s = setup(); const pair = await s.pair(); const accepted = await s.action(pair.id, 'PRIVATE_BOB_UID', 'accept', 1); expect(accepted.status).toBe(200);
    expect((await accepted.json() as Inbox).requests[0]).toMatchObject({ status: 'accepted', revision: 2 });
    const replay = await s.action(pair.id, 'PRIVATE_BOB_UID', 'accept', 1); expect(replay.status).toBe(200); expect((await replay.json() as Inbox).requests[0]).toMatchObject({ status: 'accepted', revision: 2 });
    const stale = await s.action(pair.id, 'PRIVATE_ALICE_UID', 'remove', 1); expect(stale.status).toBe(409); expect(await stale.json()).toMatchObject({ error: { code: 'stale_connection' } });
    expect((await s.action(pair.id, 'PRIVATE_BOB_UID', 'decline', 2)).status).toBe(409);
    const removed = await s.action(pair.id, 'PRIVATE_ALICE_UID', 'remove', 2); expect(removed.status).toBe(200); expect((await removed.json() as Inbox).requests[0]).toMatchObject({ status: 'removed', revision: 3 });
  });
  it('retains participant visibility and allows pending consent after discovery is disabled', async () => {
    const s = setup(); const pair = await s.pair(); await s.profile('PRIVATE_BOB_UID', { discoverable: false });
    const inbox = await s.request('connections'); expect((await inbox.json() as Inbox).requests).toHaveLength(1);
    expect((await s.action(pair.id, 'PRIVATE_BOB_UID', 'accept', 1)).status).toBe(200);
    expect((await (await s.request(`people?wardId=${ward.id}`, null)).json() as { people: Array<{ id: string }> }).people.map((person) => person.id)).toEqual([profileId('PRIVATE_ALICE_UID')]);
  });
  it.each(['pending', 'declined', 'removed'])('retains request-time profile information for %s pairs after a peer opts out and edits their profile', async (status) => {
    const s = setup(); const pair = await s.pair();
    if (status === 'declined') await s.action(pair.id, 'PRIVATE_BOB_UID', 'decline', 1);
    if (status === 'removed') { await s.action(pair.id, 'PRIVATE_BOB_UID', 'accept', 1); await s.action(pair.id, 'PRIVATE_BOB_UID', 'remove', 2); }
    await s.profile('PRIVATE_BOB_UID', { discoverable: false, wardId: otherWard.id, bio: 'PRIVATE_NEW_PROFILE_SENTINEL' });
    const response = await s.request('connections'); expect(response.status).toBe(200); const result = await response.json() as Inbox;
    expect(result.requests[0]?.peer).toMatchObject({ id: profileId('PRIVATE_BOB_UID'), bio: 'Interested in better footpaths.', ward: { id: ward.id, name: ward.name.en } });
    expect(JSON.stringify(result.requests)).not.toContain('PRIVATE_NEW_PROFILE_SENTINEL'); expect(JSON.stringify(result.requests)).not.toContain(otherWard.id);
  });
  it('captures fresh consented profile information only when a new pending request is created', async () => {
    const s = setup(); const pair = await s.pair(); await s.action(pair.id, 'PRIVATE_BOB_UID', 'decline', 1);
    await s.profile('PRIVATE_BOB_UID', { wardId: otherWard.id, bio: 'A new public bio.' }); s.advance(24 * 3_600_000);
    const response = await s.send(); expect(response.status).toBe(200); const result = await response.json() as Inbox;
    expect(result.requests[0]).toMatchObject({ revision: 3, peer: { bio: 'A new public bio.', ward: { id: otherWard.id } } });
  });
  it('does not rehydrate legacy request entries without consented snapshots', async () => {
    const s = setup(); const pair = await s.pair();
    const current = await s.store.get<Record<string, unknown>>(`connections/${pair.id}`); delete current!.senderSnapshot; delete current!.recipientSnapshot; await s.store.set(`connections/${pair.id}`, current);
    const response = await s.request('connections'); expect(response.status).toBe(200); expect((await response.json() as Inbox).requests).toEqual([]);
  });
  it('allows a cancelled request to be resent with a higher revision and blocks stale actions', async () => {
    const s = setup(); const pair = await s.pair(); expect((await s.action(pair.id, 'PRIVATE_ALICE_UID', 'cancel', 1)).status).toBe(200);
    const resent = await s.send(); expect(resent.status).toBe(200); expect((await resent.json() as Inbox).requests[0]).toMatchObject({ status: 'pending', revision: 3 });
    const stale = await s.action(pair.id, 'PRIVATE_ALICE_UID', 'cancel', 1); expect(stale.status).toBe(409);
  });
  it('applies decline cooldown to both participants so reversing the pair cannot bypass it', async () => {
    const s = setup(); const pair = await s.pair(); expect((await s.action(pair.id, 'PRIVATE_BOB_UID', 'decline', 1)).status).toBe(200);
    const blocked = await s.send(); expect(blocked.status).toBe(409); expect(await blocked.json()).toMatchObject({ error: { code: 'connection_cooldown' } });
    const reversed = await s.send('PRIVATE_BOB_UID', 'PRIVATE_ALICE_UID'); expect(reversed.status).toBe(409); expect(await reversed.json()).toMatchObject({ error: { code: 'connection_cooldown' } });
    s.advance(24 * 3_600_000); const expired = await s.send('PRIVATE_BOB_UID', 'PRIVATE_ALICE_UID'); expect(expired.status).toBe(200); expect((await expired.json() as Inbox).requests[0]).toMatchObject({ status: 'pending', revision: 3, direction: 'outgoing' });
  });
  it('lets the original sender retry after 24 hours without resetting revisions', async () => {
    const s = setup(); const pair = await s.pair(); await s.action(pair.id, 'PRIVATE_BOB_UID', 'decline', 1); s.advance(24 * 3_600_000);
    expect((await s.send()).status).toBe(200); expect(await s.store.get(`connections/${pair.id}`)).toMatchObject({ status: 'pending', revision: 3 });
  });
  it('applies removal cooldown to both participants', async () => {
    const s = setup(); const pair = await s.pair(); await s.action(pair.id, 'PRIVATE_BOB_UID', 'accept', 1); await s.action(pair.id, 'PRIVATE_BOB_UID', 'remove', 2);
    expect((await s.send()).status).toBe(409); expect((await s.send('PRIVATE_BOB_UID', 'PRIVATE_ALICE_UID')).status).toBe(409); s.advance(24 * 3_600_000);
    const resent = await s.send('PRIVATE_BOB_UID', 'PRIVATE_ALICE_UID'); expect(resent.status).toBe(200); expect((await resent.json() as Inbox).requests[0]).toMatchObject({ revision: 4, status: 'pending' });
  });
  it('caps new requests at 20 per hour while duplicate retries stay available', async () => {
    const s = setup(); await s.profile();
    for (let index = 0; index < 21; index++) { await s.profile(`peer-${index}`); const sent = await s.send('PRIVATE_ALICE_UID', `peer-${index}`); expect(sent.status).toBe(index < 20 ? 200 : 429); }
    expect((await s.send('PRIVATE_ALICE_UID', 'peer-0')).status).toBe(200); s.advance(3_600_000); expect((await s.send('PRIVATE_ALICE_UID', 'peer-20')).status).toBe(200);
  });
  it('rolls back both the pair and rate counter on a failed commit', async () => {
    const s = setup(); await s.profile(); await s.profile('PRIVATE_BOB_UID'); s.store.rejectNextCommit = true; const failed = await s.send(); expect(failed.status).toBe(409);
    expect([...s.store.docs.keys()].filter((path) => path.startsWith('connections/') || path.startsWith('communityLimits/'))).toEqual([]);
  });
});
