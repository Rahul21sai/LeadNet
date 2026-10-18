import { describe, expect, it } from 'vitest';
import { actDemoConnection, demoConnectionPeople, demoConnectionsView, emptyConnectionDemo, parseConnectionDemo, saveDemoConnectionProfile, sendDemoConnection } from '../src/lib/connectionsDemo.ts';

const ward = { id: 'ward-a', name: { en: 'Example Ward', kn: 'ವಾರ್ಡ್' } };
const joined = () => saveDemoConnectionProfile(emptyConnectionDemo(), { wardId: ward.id, bio: 'Local issues', discoverable: true }, ward, 100);

describe('private connection demonstration', () => {
  it('requires discovery consent and labels incoming examples without fabricating a remote response', () => {
    const peers = demoConnectionPeople(ward);
    expect(() => sendDemoConnection(emptyConnectionDemo(), peers[2]!, 200)).toThrow('Enable');
    const hidden = saveDemoConnectionProfile(emptyConnectionDemo(), { wardId: ward.id, bio: '', discoverable: false }, ward, 100);
    expect(hidden.records).toEqual([]);
    const sent = sendDemoConnection(joined(), peers[2]!, 200);
    expect(demoConnectionsView(sent).requests.filter((request) => request.direction === 'incoming')).toHaveLength(2);
    expect(demoConnectionsView(sent).requests.find((request) => request.peer.id === peers[2]?.id)).toMatchObject({ direction: 'outgoing', status: 'pending', isDemo: true });
    expect(demoConnectionsView(sent).notice).toContain('nobody is contacted');
    expect(sendDemoConnection(sent, peers[2]!, 300)).toBe(sent);
  });

  it('accepts incoming requests, rejects stale decisions and retains participant controls after opt-out', () => {
    const before = joined(); const incoming = before.records[0]!;
    const accepted = actDemoConnection(before, incoming.id, 'accept', 1, 200);
    expect(accepted.records[0]).toMatchObject({ status: 'accepted', revision: 2 });
    expect(() => actDemoConnection(accepted, incoming.id, 'decline', 1, 300)).toThrow('changed');
    const hidden = saveDemoConnectionProfile(accepted, { wardId: ward.id, bio: '', discoverable: false }, ward, 300);
    expect(actDemoConnection(hidden, incoming.id, 'remove', 2, 400).records[0]?.status).toBe('removed');
  });

  it('keeps reopened request revisions monotonic and enforces cooldown in both directions', () => {
    const before = joined(); const incoming = before.records[0]!; const peer = before.people[0]!;
    const declined = actDemoConnection(before, incoming.id, 'decline', 1, 200);
    expect(() => sendDemoConnection(declined, peer, 300)).toThrow('24 hours');
    const reopened = sendDemoConnection(declined, peer, 200 + 86_400_000);
    expect(reopened.records.find((record) => record.id === incoming.id)).toMatchObject({ status: 'pending', revision: 3 });
    expect(() => actDemoConnection(reopened, incoming.id, 'accept', 1, 400 + 86_400_000)).toThrow();
  });

  it('recovers from corrupt storage and refuses genuine identities in the demo boundary', () => {
    expect(parseConnectionDemo('{')).toEqual(emptyConnectionDemo());
    const state = joined();
    expect(parseConnectionDemo(JSON.stringify(state))).toEqual(state);
    expect(parseConnectionDemo(JSON.stringify({ ...state, people: [{ ...state.people[0], id: 'real-profile', isDemo: false }] }))).toEqual(emptyConnectionDemo());
    expect(() => sendDemoConnection(state, { ...state.people[0]!, id: 'real-profile', isDemo: false }, 300)).toThrow('fictional');
  });

  it('scrubs public profile bios before storage and never changes civic records', () => {
    const state = saveDemoConnectionProfile(emptyConnectionDemo(), { wardId: ward.id, bio: 'Contact private@example.com at 9876543210', discoverable: true }, ward, 100);
    expect(state.profile?.bio).not.toContain('private@example.com');
    expect(state.profile?.bio).not.toContain('9876543210');
    expect(Object.keys(state).sort()).toEqual(['people', 'profile', 'records', 'sentTimes', 'version']);
  });

  it('keeps expanded privacy placeholders within the profile limit so storage survives reload', () => {
    const state = saveDemoConnectionProfile(emptyConnectionDemo(), { wardId: ward.id, bio: 'a@b.co '.repeat(20).trim(), discoverable: true }, ward, 100);
    expect(state.profile!.bio.length).toBeLessThanOrEqual(160);
    expect(parseConnectionDemo(JSON.stringify(state))).toEqual(state);
  });
});
