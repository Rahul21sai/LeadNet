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
  messagingSenderId: '782203647955',
  appId: '1:782203647955:web:2b449545adda85c156a126',
};

export const firebaseApp = initializeApp(config);
export const auth = getAuth(firebaseApp);
export const db = initializeFirestore(firebaseApp, { localCache: persistentLocalCache() });
