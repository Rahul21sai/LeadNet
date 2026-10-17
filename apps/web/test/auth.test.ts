import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ currentUser: null as unknown, ready: Promise.resolve(), resolveReady: () => {}, signIn: vi.fn() }));
vi.mock('../src/lib/firebase.ts', () => ({ auth: { get currentUser() { return state.currentUser; }, authStateReady: () => state.ready } }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {}, onIdTokenChanged: vi.fn(), signInAnonymously: state.signIn,
  signInWithPopup: vi.fn(), signOut: vi.fn(),
}));
import { ensureSignedIn } from '../src/lib/auth.ts';

describe('citizen identity restoration', () => {
  beforeEach(() => { state.currentUser = null; state.ready = Promise.resolve(); state.signIn.mockReset(); });
  it('waits for the stored identity before creating an anonymous citizen', async () => {
    state.ready = new Promise<void>((resolve) => { state.resolveReady = resolve; });
    state.signIn.mockResolvedValue({ user: { uid: 'new-identity' } });
    const request = ensureSignedIn();
    const restored = { uid: 'reporter-who-can-verify' }; state.currentUser = restored; state.resolveReady();
    expect(await request).toBe(restored);
    expect(state.signIn).not.toHaveBeenCalled();
  });
  it('shares a first anonymous sign-in between simultaneous actions', async () => {
    const citizen = { uid: 'same-new-citizen' }; state.signIn.mockResolvedValue({ user: citizen });
    expect(await Promise.all([ensureSignedIn(), ensureSignedIn()])).toEqual([citizen, citizen]);
    expect(state.signIn).toHaveBeenCalledTimes(1);
  });
});
