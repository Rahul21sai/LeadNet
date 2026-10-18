import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canDisplayConnectionInbox, connectionInboxScope } from '../src/lib/connectionsScope.ts';

const state = vi.hoisted(() => ({ uid: 'citizen-a' as string | null, signIn: vi.fn() }));
vi.mock('../src/lib/auth.ts', () => ({ ensureSignedIn: state.signIn, currentSignedInUid: () => state.uid }));
vi.mock('../src/lib/demo.ts', () => ({ isOfflineDemo: false }));
import { api } from '../src/lib/api.ts';

describe('private connection identity binding', () => {
  beforeEach(() => { state.uid = 'citizen-a'; state.signIn.mockReset(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))); });
  afterEach(() => vi.unstubAllGlobals());

  it('rejects a different signed-in account before issuing a private request', async () => {
    state.signIn.mockResolvedValue({ uid: 'citizen-b', getIdToken: async () => 'fixture-token' });
    await expect(api.get('/community/connections', { auth: true, expectedUid: 'citizen-a' })).rejects.toMatchObject({ code: 'identity_changed' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('cancels a request when the account changes while its token is loading', async () => {
    let finish!: (token: string) => void;
    const getIdToken = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
    state.signIn.mockResolvedValue({ uid: 'citizen-a', getIdToken });
    const pending = api.post('/community/connections', { peerId: 'peer-a' }, { expectedUid: 'citizen-a' });
    await vi.waitFor(() => expect(getIdToken).toHaveBeenCalled());
    state.uid = 'citizen-b'; finish('fixture-token');
    await expect(pending).rejects.toMatchObject({ code: 'identity_changed' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the bound account token when the identity remains current', async () => {
    state.signIn.mockResolvedValue({ uid: 'citizen-a', getIdToken: async () => 'fixture-token' });
    await api.get('/community/connections', { auth: true, expectedUid: 'citizen-a' });
    expect(fetch).toHaveBeenCalledOnce();
    expect(new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer fixture-token');
  });

  it('separates and hides inbox caches across sign-out, account switches and same-user token refresh', () => {
    const session = { ready: true, user: { uid: 'citizen-a' }, authEpoch: 1 };
    const before = connectionInboxScope(session);
    expect(canDisplayConnectionInbox(session, before.token)).toBe(true);
    expect(canDisplayConnectionInbox({ ...session, ready: false }, before.token)).toBe(false);
    expect(canDisplayConnectionInbox({ ...session, user: null }, before.token)).toBe(false);
    expect(canDisplayConnectionInbox({ ...session, user: { uid: 'citizen-b' } }, before.token)).toBe(false);
    expect(canDisplayConnectionInbox({ ...session, authEpoch: 2 }, before.token)).toBe(false);
  });
});
