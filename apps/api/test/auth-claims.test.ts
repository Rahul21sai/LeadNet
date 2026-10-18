import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}], initializeApp: vi.fn(), applicationDefault: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: state.verify }) }));
import { firebaseAuth } from '../src/services/firebase.ts';

describe('signed leader identity claims', () => {
  beforeEach(() => state.verify.mockReset());

  it('preserves the signed demo-officer restriction when authenticating the token', async () => {
    state.verify.mockResolvedValue({ uid: 'fixture-officer', role: 'officer', wardIds: ['ward-a'], demoOfficer: true });
    expect(await firebaseAuth.verify('fixture-token')).toEqual({ uid: 'fixture-officer', role: 'officer', wardIds: ['ward-a'], demoOfficer: true });
    expect(state.verify).toHaveBeenCalledWith('fixture-token', true);
  });

  it.each([undefined, false, 'true'])('accepts only the signed boolean marker (%s)', async (demoOfficer) => {
    state.verify.mockResolvedValue({ uid: 'fixture-officer', role: 'officer', wardIds: ['ward-a', 42], demoOfficer });
    expect(await firebaseAuth.verify('fixture-token')).toEqual({ uid: 'fixture-officer', role: 'officer', wardIds: ['ward-a'], demoOfficer: false });
  });
});
