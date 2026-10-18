import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Query } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Role } from '@leadnet/shared';
import { env } from '../env.ts';
import { ApiFault } from './errors.ts';
import type { Filter, Store, Transaction } from './store.ts';

function adminApp() {
  return getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: env.projectId, storageBucket: env.storageBucket });
}

export function bucket() {
  return getStorage(adminApp()).bucket();
}

export interface Identity {
  uid: string;
  role: Role;
  wardIds: string[];
  demoOfficer?: boolean;
}

export interface AuthProvider {
  verify(token: string): Promise<Identity>;
  setRole(uid: string, role: 'citizen' | 'officer', wardIds: string[]): Promise<void>;
}

export const firebaseAuth: AuthProvider = {
  async verify(token) {
    try {
      const decoded = await getAuth(adminApp()).verifyIdToken(token, true);
      const roles: Role[] = ['citizen', 'officer', 'moderator', 'admin'];
      const role: Role = roles.includes(decoded.role as Role) ? decoded.role as Role : 'citizen';
      return { uid: decoded.uid, role, wardIds: Array.isArray(decoded.wardIds) ? decoded.wardIds.filter((id): id is string => typeof id === 'string') : [], demoOfficer: decoded.demoOfficer === true };
    } catch {
      throw new ApiFault(401, 'unauthenticated', 'Your sign-in expired. Please sign in again.');
    }
  },
  async setRole(uid, role, wardIds) {
    const auth = getAuth(adminApp());
    const user = await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, { ...user.customClaims, role, wardIds, demoOfficer: role === 'officer' });
  },
};

function query(collection: string, filters: Filter[] = []): Query {
  let result: Query = getFirestore(adminApp()).collection(collection);
  for (const filter of filters) result = result.where(filter.field, filter.op, filter.value);
  return result;
}

export function getStore(): Store {
  const db = () => getFirestore(adminApp());
  return {
    async get<T>(path: string) { return (await db().doc(path).get()).data() as T | undefined ?? null; },
    async list<T>(collection: string, filters?: Filter[]) { return (await query(collection, filters).get()).docs.map((doc) => doc.data() as T); },
    async set(path, value) { await db().doc(path).set(value as FirebaseFirestore.DocumentData); },
    async atomic<T>(action: (tx: Transaction) => Promise<T>) {
      return db().runTransaction(async (transaction) => action({
        async get<T>(path: string) { return (await transaction.get(db().doc(path))).data() as T | undefined ?? null; },
        async list<T>(collection: string, filters?: Filter[]) { return (await transaction.get(query(collection, filters))).docs.map((doc) => doc.data() as T); },
        set(path, value) { transaction.set(db().doc(path), value as FirebaseFirestore.DocumentData); },
      }));
    },
  };
}
