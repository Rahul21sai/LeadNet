import { nanoid } from 'nanoid';
import { env } from '../env.ts';
import { getStore, firebaseAuth, type AuthProvider } from './firebase.ts';
import { storageMedia, type MediaStore } from './media.ts';
import { wardLookup, type WardLookup } from '../geo/wards.ts';
import { vertexProvider, type AiProvider } from '../ai/client.ts';
import type { Store } from './store.ts';
import { emailProvider, videoProcessor, type EmailProvider, type VideoProcessor } from './communityAdapters.ts';

export interface Runtime {
  store: Store; auth: AuthProvider; media: MediaStore; wards: WardLookup; ai: AiProvider;
  now: () => number; id: () => string; mockAi: boolean;
  email: EmailProvider; video: VideoProcessor;
}

export function runtime(options: Partial<Runtime>): Runtime {
  return { store: options.store ?? getStore(), auth: options.auth ?? firebaseAuth, media: options.media ?? storageMedia, wards: options.wards ?? wardLookup, ai: options.ai ?? vertexProvider, now: options.now ?? Date.now, id: options.id ?? nanoid, mockAi: options.mockAi ?? (options.ai ? false : env.aiMock), email: options.email ?? emailProvider, video: options.video ?? videoProcessor };
}
