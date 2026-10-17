import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

/**
 * Firebase web config is public by design (it identifies the project; access is
 * enforced by security rules and the API). Values come from the registered web app.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'REPLACE_AT_SETUP',
  authDomain: 'leadnet-blr.firebaseapp.com',
  projectId: 'leadnet-blr',
  storageBucket: 'leadnet-blr.firebasestorage.app',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? 'REPLACE_AT_SETUP',
};

export const firebaseApp = initializeApp(config);
export const auth = getAuth(firebaseApp);
export const db = initializeFirestore(firebaseApp, { localCache: persistentLocalCache() });
