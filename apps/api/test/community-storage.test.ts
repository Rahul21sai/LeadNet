import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import type { CommunityPostDoc } from '@leadnet/shared';
import { createCommunityPost } from '../src/services/community.ts';
import { runtime } from '../src/services/context.ts';
import { storageMedia } from '../src/services/media.ts';
import { MemoryStore } from './helpers.ts';

const fakeBucket = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('../src/services/firebase.ts', async (original) => ({ ...await original<typeof import('../src/services/firebase.ts')>(), bucket: () => fakeBucket.current }));

interface SaveOptions { preconditionOpts?: { ifGenerationMatch?: number }; metadata: { metadata: { published: string } } }

describe('immutable community storage', () => {
  it('keeps committed media public when a delayed concurrent retry reaches storage after publication', async () => {
    const store = new MemoryStore(); let saveCalls = 0; let published = false; let objectExists = false;
    let releaseFirst!: () => void; let secondEntered!: () => void; let firstPublished!: () => void;
    const release = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const second = new Promise<void>((resolve) => { secondEntered = resolve; });
    const publication = new Promise<void>((resolve) => { firstPublished = resolve; });
    const saveOptions: SaveOptions[] = [];
    fakeBucket.current = { name: 'test-bucket', file: () => ({
      async save(_bytes: Buffer, options: SaveOptions) {
        saveOptions.push(options); const call = ++saveCalls;
        if (call === 1) await release;
        else { secondEntered(); await publication; }
        if (options.preconditionOpts?.ifGenerationMatch === 0 && objectExists) throw Object.assign(new Error('Generation precondition failed'), { code: 412 });
        objectExists = true; published = false;
        if (call > 1) throw new Error('A destructive overwrite committed remotely, but its acknowledgement failed');
      },
      async setMetadata(value: { metadata: { published: string } }) { published = value.metadata.published === 'true'; firstPublished(); },
    }) };
    const r = runtime({ store, media: storageMedia, id: () => 'shared-post', now: () => 1_800_000_000_000, wards: { lookup: () => null, get: () => null } });
    const input = { requestId: 'concurrent-storage-request', text: 'A damaged footpath.', location: null, issueId: null, category: null };
    const identity = { uid: 'private-owner', role: 'citizen' as const, wardIds: [] };
    const capture = new File([new Uint8Array(await sharp({ create: { width: 3, height: 3, channels: 3, background: 'white' } }).jpeg().toBuffer())], 'capture.jpg', { type: 'image/jpeg' });
    const first = createCommunityPost(r, identity, input, capture);
    while (!saveCalls) await new Promise((resolve) => setTimeout(resolve, 1));
    const retry = createCommunityPost(r, identity, input, capture);
    await second; releaseFirst();
    const results = await Promise.all([first, retry]);
    expect(results[0]?.id).toBe('shared-post'); expect(results[1]?.id).toBe('shared-post');
    expect(await store.list<CommunityPostDoc>('posts')).toHaveLength(1); expect(published).toBe(true); expect(saveCalls).toBe(2);
    expect(saveOptions.every((options) => options.preconditionOpts?.ifGenerationMatch === 0)).toBe(true);
  });
  it('does not swallow non-precondition failures or change evidence upload behavior', async () => {
    const options: SaveOptions[] = [];
    fakeBucket.current = { name: 'test-bucket', file: () => ({ async save(_bytes: Buffer, value: SaveOptions) { options.push(value); throw Object.assign(new Error('Storage unavailable'), { code: 503 }); } }) };
    await expect(storageMedia.save('community/post-one/capture.jpg', { bytes: Buffer.from('jpeg'), mimeType: 'image/jpeg' })).rejects.toMatchObject({ code: 503 });
    await expect(storageMedia.save('evidence/issue-one/capture.jpg', { bytes: Buffer.from('jpeg'), mimeType: 'image/jpeg' })).rejects.toMatchObject({ code: 503 });
    expect(options[1]?.preconditionOpts).toBeUndefined();
  });
});
