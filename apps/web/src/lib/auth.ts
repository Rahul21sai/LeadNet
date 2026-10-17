import { useSyncExternalStore } from 'react';
import { GoogleAuthProvider, onIdTokenChanged, signInAnonymously, signInWithPopup, signOut, type User } from 'firebase/auth';
import type { Role } from '@leadnet/shared';
import { auth } from './firebase.ts';

export interface Session {
  user: User | null;
  role: Role;
  wardIds: string[];
  ready: boolean;
}

let session: Session = { user: null, role: 'citizen', wardIds: [], ready: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

onIdTokenChanged(auth, async (user) => {
  if (!user) {
    session = { user: null, role: 'citizen', wardIds: [], ready: true };
    emit();
    return;
  }
  const token = await user.getIdTokenResult();
  const role = (token.claims.role as Role | undefined) ?? 'citizen';
  const wardIds = (token.claims.wardIds as string[] | undefined) ?? [];
  session = { user, role, wardIds, ready: true };
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
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
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
