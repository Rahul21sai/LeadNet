import { useSyncExternalStore } from 'react';
import { GoogleAuthProvider, onIdTokenChanged, signInAnonymously, signInWithPopup, signOut, type User } from 'firebase/auth';
import type { Role } from '@leadnet/shared';
import { auth } from './firebase.ts';

export interface Session {
  user: User | null;
  role: Role;
  wardIds: string[];
  ready: boolean;
  demoOfficer?: boolean;
}

let session: Session = { user: null, role: 'citizen', wardIds: [], ready: false };
let sessionRevision = 0;
let signingIn: Promise<User> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

onIdTokenChanged(auth, async (user) => {
  const revision = ++sessionRevision;
  if (!user) {
    session = { user: null, role: 'citizen', wardIds: [], ready: true };
    emit();
    return;
  }
  // Hide previous permissions while new or refreshed signed claims are checked.
  session = { user, role: 'citizen', wardIds: [], ready: false };
  emit();
  try {
    const token = await user.getIdTokenResult();
    if (revision !== sessionRevision) return;
    const role = ['citizen', 'officer', 'moderator', 'admin'].includes(String(token.claims.role)) ? token.claims.role as Role : 'citizen';
    const wardIds = Array.isArray(token.claims.wardIds) ? token.claims.wardIds.filter((id): id is string => typeof id === 'string') : [];
    session = { user, role, wardIds, ready: true, demoOfficer: token.claims.demoOfficer === true };
  } catch {
    if (revision !== sessionRevision) return;
    session = { user, role: 'citizen', wardIds: [], ready: true };
  }
  emit();
});

export function useSession(): Session {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
}

/** Every write needs a uid; citizens get a silent anonymous account on first action. */
export async function ensureSignedIn(): Promise<User> {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  signingIn ??= signInAnonymously(auth).then((cred) => cred.user).finally(() => { signingIn = null; });
  return signingIn;
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function logOut() {
  await signOut(auth);
}

/** Force-refresh so new custom claims (e.g. demo officer role) apply immediately. */
export async function refreshClaims() {
  await auth.currentUser?.getIdToken(true);
}
