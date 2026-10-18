import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ changed: null as null | ((user: unknown) => Promise<void>) }));
vi.mock('react', () => ({ useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot() }));
vi.mock('../src/lib/firebase.ts', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {}, signInAnonymously: vi.fn(), signInWithPopup: vi.fn(), signOut: vi.fn(),
  onIdTokenChanged: (_auth: unknown, changed: (user: unknown) => Promise<void>) => { state.changed = changed; return () => {}; },
}));
import { useSession } from '../src/lib/auth.ts';

const officer = (uid: string, demoOfficer = false) => ({ uid, getIdTokenResult: async () => ({ claims: { role: 'officer', wardIds: ['ward-a'], demoOfficer } }) });

describe('creator directory identity changes', () => {
  beforeEach(async () => { await state.changed!(null); });

  it('propagates the signed demo restriction and clears it when signing out', async () => {
    await state.changed!(officer('fixture-a', true));
    expect(useSession()).toMatchObject({ ready: true, role: 'officer', wardIds: ['ward-a'], demoOfficer: true });
    await state.changed!(null);
    expect(useSession()).toMatchObject({ user: null, role: 'citizen', wardIds: [], ready: true });
    expect(useSession().demoOfficer).not.toBe(true);
  });

  it('hides previous officer claims immediately while a different identity is being checked', async () => {
    await state.changed!(officer('fixture-a'));
    let finish!: (value: unknown) => void;
    const checking = state.changed!({ uid: 'fixture-b', getIdTokenResult: () => new Promise((resolve) => { finish = resolve; }) });
    expect(useSession()).toMatchObject({ ready: false, role: 'citizen', wardIds: [], user: { uid: 'fixture-b' } });
    finish({ claims: { role: 'citizen' } }); await checking;
    expect(useSession()).toMatchObject({ ready: true, role: 'citizen', wardIds: [] });
  });

  it('also hides cached officer claims while a same-account token refresh is checked', async () => {
    await state.changed!(officer('fixture-a'));
    let finish!: (value: unknown) => void;
    const checking = state.changed!({ uid: 'fixture-a', getIdTokenResult: () => new Promise((resolve) => { finish = resolve; }) });
    expect(useSession()).toMatchObject({ ready: false, role: 'citizen', wardIds: [] });
    finish({ claims: { role: 'officer', wardIds: ['ward-b'], demoOfficer: true } }); await checking;
    expect(useSession()).toMatchObject({ ready: true, role: 'officer', wardIds: ['ward-b'], demoOfficer: true });
  });

  it('does not restore directory access from a delayed token after logout', async () => {
    let finish!: (value: unknown) => void;
    const checking = state.changed!({ uid: 'fixture-a', getIdTokenResult: () => new Promise((resolve) => { finish = resolve; }) });
    await state.changed!(null);
    finish({ claims: { role: 'officer', wardIds: ['ward-a'] } }); await checking;
    expect(useSession()).toMatchObject({ user: null, role: 'citizen', wardIds: [], ready: true });
  });
});
