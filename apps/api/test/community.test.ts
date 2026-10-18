import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { zCommunityEmail, type AiRunDoc, type CommunityCommentDoc, type CommunityPostDoc, type ComposeResponse, type CaptureLocation } from '@leadnet/shared';
import { createApp } from '../src/app.ts';
import { runtime } from '../src/services/context.ts';
import { emailCommunityPost } from '../src/services/community.ts';
import { representativeLookup, representativeWardLookup, type RepresentativeDirectory } from '../src/services/representatives.ts';
import { validateVideoContainer, type EmailDelivery, type EmailProvider } from '../src/services/communityAdapters.ts';
import { composeChecks } from '../src/ai/verify/compose.ts';
import type { Upload } from '../src/services/media.ts';
import { ApiFault } from '../src/services/errors.ts';
import { MemoryStore } from './helpers.ts';

const ward = { id: 'ward-test', number: 1, name: { en: 'Test Ward', kn: 'ಪರೀಕ್ಷೆ' }, zone: null, corporation: null, assembly: 'Test Assembly', centroid: { lat: 12.97, lng: 77.59 }, officerLeaderId: null, stats: null, statsUpdatedAt: null };
const location: CaptureLocation = { lat: 12.971623, lng: 77.594623, accuracyM: 12, capturedAt: 1_800_000_000_000, source: 'camera' };
const directory: RepresentativeDirectory = { checkedAt: '2026-10-18', contacts: [{ id: 'mla-test', role: 'mla', name: 'Official Fixture', constituency: 'Test Assembly', email: 'official@example.gov.in', sourceUrl: 'https://example.gov.in/directory', checkedAt: '2026-10-18' }], assemblyToContacts: { 'Test Assembly': ['mla-test'] } };

function setup(options: { ai?: (attempt: number) => unknown; mockAi?: boolean; email?: EmailProvider } = {}) {
  const store = new MemoryStore(); const blobs = new Map<string, Upload>(); const published = new Set<string>();
  let now = 1_800_000_000_000; let sequence = 0; let attempts = 0; let failPublish = false;
  const r = runtime({ store, id: () => `generated-${++sequence}`, now: () => now, mockAi: options.mockAi ?? false, auth: { async verify(token) { return { uid: token, role: 'citizen', wardIds: [] }; }, async setRole() {} }, wards: { lookup: () => ward, get: () => ward }, ai: { async generate() { attempts++; if (!options.ai) throw new Error('AI unavailable'); return { value: options.ai(attempts) }; } }, email: options.email ?? { available: () => false, async send() { throw new Error('Must not send'); } }, video: { available: () => false, async prepare() { throw new Error('Must not process'); } }, media: { async save(path, upload) { blobs.set(path, upload); return { path, url: `https://media.example/${path}` }; }, async read(path) { return blobs.get(path)!; }, async publish(path) { if (failPublish) { failPublish = false; throw new ApiFault(503, 'storage_unavailable', 'Temporary failure'); } published.add(path); } } });
  const app = createApp(r);
  const request = (path: string, body?: unknown, uid = 'private-user-id') => app.request(`/api/v1/community${path}`, { method: 'POST', headers: { Authorization: `Bearer ${uid}`, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : JSON.stringify(body) });
  async function post(requestId = 'post-request-00000001', photo?: File, extra: Record<string, unknown> = {}) {
    const form = new FormData(); form.set('metadata', JSON.stringify({ requestId, text: 'A damaged footpath needs attention.', location, ...extra })); if (photo) form.set('photo', photo);
    return request('/posts', form);
  }
  async function compose(text: string, audio?: File, target = 'post') { const form = new FormData(); form.set('text', text); form.set('lang', 'en'); form.set('target', target); if (audio) form.set('audio', audio); return request('/compose', form); }
  return { r, app, store, request, post, compose, blobs, published, attempts: () => attempts, failPublish: () => { failPublish = true; }, advance: (value: number) => { now += value; } };
}

function audio() {
  const bytes = Buffer.alloc(44 + 32000); bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(16000, 24); bytes.writeUInt32LE(32000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(32000, 40);
  return new File([new Uint8Array(bytes)], 'private.wav', { type: 'audio/wav' });
}
async function photo() { return new File([new Uint8Array(await sharp({ create: { width: 4, height: 3, channels: 3, background: 'white' } }).withMetadata({ orientation: 6 }).jpeg().toBuffer())], 'capture.jpg', { type: 'image/jpeg' }); }

describe('community HTTP boundaries', () => {
  it('publishes capabilities without auth and requires auth for every write', async () => {
    const { app } = setup();
    const capabilities = await app.request('/api/v1/community/capabilities'); expect(capabilities.status).toBe(200); expect(await capabilities.json()).toMatchObject({ email: false, video: false });
    for (const path of ['/compose', '/posts', '/posts/abc/comments', '/posts/abc/reaction', '/email']) expect((await app.request(`/api/v1/community${path}`, { method: 'POST' })).status).toBe(401);
  });
  it('validates query coordinates and never guesses a representative outside coverage', async () => {
    const { app } = setup(); expect((await app.request('/api/v1/community/representatives?lat=abc&lng=77')).status).toBe(400);
    expect(representativeLookup({ lookup: () => null, get: () => null }, 0, 0, directory)).toMatchObject({ contacts: [], coverage: 'unavailable' });
    expect(representativeLookup({ lookup: () => ward, get: () => ward }, 12.97, 77.59, directory).contacts[0]?.id).toBe('mla-test');
    expect(representativeLookup({ lookup: () => ({ ...ward, assembly: 'Almost Test Assembly' }), get: () => null }, 12.97, 77.59, directory).contacts).toEqual([]);
  });
  it('looks up the stored ward directly so rounded public coordinates cannot change the representative', async () => {
    const lookup = representativeWardLookup({ lookup: () => null, get: (id) => id === ward.id ? ward : null }, ward.id, directory);
    expect(lookup.contacts[0]?.id).toBe('mla-test');
    expect(representativeWardLookup({ lookup: () => ward, get: () => null }, 'unknown', directory)).toMatchObject({ ward: null, contacts: [], coverage: 'unavailable' });
    const { app } = setup(); expect((await app.request('/api/v1/community/representatives?wardId=ward-test')).status).toBe(200);
    expect((await app.request('/api/v1/community/representatives?wardId=..%2Fprivate')).status).toBe(400);
  });
  it('rejects unsupported video instead of pretending that an upload was processed', async () => {
    const { request, store } = setup(); const form = new FormData(); form.set('metadata', JSON.stringify({ requestId: 'video-request-0000001', text: 'A blocked road.', location })); form.set('video', new File(['video'], 'recording.webm', { type: 'video/webm' }));
    const response = await request('/posts', form); expect(response.status).toBe(503); expect((await store.list('posts'))).toEqual([]);
  });
  it('rejects playlist and remote-reference text disguised as a video', () => {
    expect(() => validateVideoContainer(Buffer.from('#EXTM3U\nhttps://example.com/private.mp4'))).toThrow();
    expect(() => validateVideoContainer(Buffer.from('file:///etc/passwd'))).toThrow();
    expect(() => validateVideoContainer(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))).not.toThrow();
  });
});

describe('public posts, private ownership, and interactions', () => {
  it('strips photo metadata, rounds public coordinates, scrubs public text, and keeps ownership private', async () => {
    const { post, store, blobs, published } = setup(); const response = await post('photo-request-0000001', await photo(), { text: 'Contact me at personal@example.com about the damaged footpath.' });
    expect(response.status).toBe(200); const saved = await response.json() as CommunityPostDoc;
    expect(saved).toMatchObject({ authorLabel: 'Citizen', location: { lat: 12.972, lng: 77.595 }, likeCount: 0, commentCount: 0 }); expect(JSON.stringify(saved)).not.toContain('private-user-id'); expect(saved.text).not.toContain('personal@example.com');
    expect(await store.get(`postOwners/${saved.id}`)).toMatchObject({ uid: 'private-user-id', rawLocation: location });
    const path = `community/${saved.id}/capture.jpg`; expect(published.has(path)).toBe(true); expect((await sharp(blobs.get(path)!.bytes).metadata()).exif).toBeUndefined();
  });
  it('retries a committed media publication without creating duplicate posts', async () => {
    const { post, failPublish, store, published } = setup(); const capture = await photo(); failPublish();
    expect((await post('retry-request-0000001', capture)).status).toBe(503);
    const retry = await post('retry-request-0000001', capture); expect(retry.status).toBe(200); const saved = await retry.json() as CommunityPostDoc;
    expect(await store.list('posts')).toHaveLength(1); expect(published.has(`community/${saved.id}/capture.jpg`)).toBe(true);
    expect((await post('retry-request-0000001', capture, { text: 'Changed content' })).status).toBe(409);
  });
  it('updates likes transactionally and makes an explicit desired reaction idempotent', async () => {
    const { post, request } = setup(); const saved = await (await post()).json() as CommunityPostDoc;
    const responses = await Promise.all(Array.from({ length: 5 }, () => request(`/posts/${saved.id}/reaction`, { liked: true })));
    expect(await responses[4]!.json()).toEqual({ liked: true, likeCount: 1 });
    expect(await (await request(`/posts/${saved.id}/reaction`, { liked: true }, 'other-citizen')).json()).toEqual({ liked: true, likeCount: 2 });
    expect(await (await request(`/posts/${saved.id}/reaction`, { liked: false })).json()).toEqual({ liked: false, likeCount: 1 });
  });
  it('keeps comments anonymous, scrubbed, and request-idempotent without altering civic issues', async () => {
    const { post, request, store } = setup(); const saved = await (await post()).json() as CommunityPostDoc;
    const body = { body: 'I saw this too. My email is private@example.com.', requestId: 'comment-request-0001' };
    const first = await (await request(`/posts/${saved.id}/comments`, body)).json() as CommunityCommentDoc;
    const again = await (await request(`/posts/${saved.id}/comments`, body)).json(); expect(again).toEqual(first);
    expect(first.body).not.toContain('private@example.com'); expect(JSON.stringify(first)).not.toContain('private-user-id'); expect((await store.get<CommunityPostDoc>(`posts/${saved.id}`))?.commentCount).toBe(1); expect(await store.list('issues')).toEqual([]);
    expect((await request(`/posts/${saved.id}/comments`, { ...body, body: 'Changed content.' })).status).toBe(409);
  });
  it('applies a bounded write rate across distinct request ids', async () => {
    const { post } = setup(); for (let i = 0; i < 20; i++) expect((await post(`rate-limit-request-${i}`)).status).toBe(200);
    expect((await post('rate-limit-request-21')).status).toBe(429);
  });
  it('rejects a link to a nonexistent canonical issue', async () => { const { post, store } = setup(); expect((await post('issue-link-request-1', undefined, { issueId: 'missing' })).status).toBe(404); expect(await store.list('posts')).toEqual([]); });
});

describe('bounded composition and private voice', () => {
  it('accepts a sanitized photo-only draft and adds the selected location through code', async () => {
    const { request, blobs } = setup({ ai: () => ({ transcript: null, post: 'The attached photo appears to show a damaged footpath.' }) });
    const form = new FormData(); form.set('photo', await photo()); form.set('location', JSON.stringify(location));
    const response = await request('/compose', form); expect(response.status).toBe(200); const value = await response.json() as ComposeResponse;
    expect(value.post).toContain('appears to show'); expect(value.emailBody).toContain('Test Ward'); expect(value.emailBody).toContain('12.972'); expect(blobs.size).toBe(0);
  });
  it('rejects unsupported photos before invoking composition', async () => {
    const { request, attempts } = setup(); const form = new FormData(); form.set('photo', new File(['not an image'], 'bad.svg', { type: 'image/svg+xml' }));
    expect((await request('/compose', form)).status).toBe(415); expect(attempts()).toBe(0);
  });
  it('permits a reviewed cross-script translation while preserving numbers and negation', () => {
    expect(composeChecks({ transcript: 'ಶಾಲೆಯ ಬಳಿ 2 ದೀಪಗಳು ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ.', post: 'The 2 streetlights near the school are not working.' }, '', true).every((check) => check.passed)).toBe(true);
    expect(composeChecks({ transcript: 'स्कूल के पास 2 लाइट काम नहीं करती हैं।', post: 'The 2 lights near the school work.' }, '', true).find((check) => check.name === 'negative_intent_preserved')?.passed).toBe(false);
  });
  it('retries invented numbers and preserves a valid repaired explanation', async () => {
    const { compose, attempts, store } = setup({ ai: (attempt) => ({ transcript: null, post: attempt === 1 ? 'There are 99 broken streetlights near the school.' : 'Please inspect the 2 broken streetlights near the school.' }) });
    const response = await compose('There are 2 broken streetlights near the school.'); expect(response.status).toBe(200); const value = await response.json() as ComposeResponse;
    expect(value.post).toContain('2 broken streetlights'); expect(value.fallbackUsed).toBe(false); expect(attempts()).toBe(2); expect((await store.list<AiRunDoc>('aiRuns'))[0]?.public).toBe(false);
  });
  it('rejects a rewrite that reverses negative intent and safely keeps the original', async () => {
    const { compose } = setup({ ai: () => ({ transcript: null, post: 'The streetlight near the school is working.' }) });
    const value = await (await compose('The streetlight near the school is not working.')).json() as ComposeResponse;
    expect(value.fallbackUsed).toBe(true); expect(value.post).toBe('The streetlight near the school is not working.');
  });
  it('never fabricates an audio transcript or post when speech processing fails', async () => {
    const { compose, store, blobs } = setup(); const value = await (await compose('', audio())).json() as ComposeResponse;
    expect(value).toMatchObject({ transcript: null, post: '', emailBody: '', xText: '', needsTranscript: true, fallbackUsed: true });
    expect(blobs.size).toBe(0); expect(await store.list('posts')).toEqual([]); expect((await store.list<AiRunDoc>('aiRuns'))[0]?.public).toBe(false);
  });
  it('returns a transcript for private review without uploading the voice clip', async () => {
    const { compose, blobs, store } = setup({ ai: () => ({ transcript: 'A broken streetlight near the school.', post: 'Please inspect the broken streetlight near the school.' }) });
    const value = await (await compose('', audio())).json() as ComposeResponse;
    expect(value.transcript).toBe('A broken streetlight near the school.'); expect(value.needsTranscript).toBe(false); expect(blobs.size).toBe(0); expect(await store.list('posts')).toEqual([]);
  });
});

describe('reviewed official email delivery', () => {
  function message(postId: string) { return zCommunityEmail.parse({ postId, representativeId: 'mla-test', subject: 'Please inspect damaged footpath', body: 'The damaged footpath at this location needs inspection.', confirmed: true, requestId: 'email-request-000001' }); }
  it('sends only to the matched official address, attaches sanitized media, and retries with one receipt', async () => {
    const deliveries: EmailDelivery[] = []; const { r, post, store } = setup({ email: { available: () => true, async send(input) { deliveries.push(input); return 'receipt-one'; } } });
    const saved = await (await post('email-photo-request1', await photo())).json() as CommunityPostDoc; const input = message(saved.id);
    expect(await emailCommunityPost(r, { uid: 'private-user-id', role: 'citizen', wardIds: [] }, input, directory)).toEqual({ status: 'sent', receiptId: 'receipt-one' });
    expect(await emailCommunityPost(r, { uid: 'private-user-id', role: 'citizen', wardIds: [] }, input, directory)).toEqual({ status: 'already_sent', receiptId: 'receipt-one' });
    expect(deliveries).toHaveLength(1); expect(deliveries[0]?.to).toBe('official@example.gov.in'); expect(deliveries[0]?.text).toContain('Test Ward'); expect(deliveries[0]?.text).toContain('12.972'); expect(deliveries[0]?.text).not.toContain('12.971623'); expect((await sharp(deliveries[0]!.attachment!.bytes).metadata()).exif).toBeUndefined(); expect(await store.list('communityOutbox')).toHaveLength(1);
  });
  it('rejects another author, an unmatched contact, an unconfirmed request, and missing credentials', async () => {
    const { r, post, request } = setup({ email: { available: () => true, async send() { throw new Error('Must not send'); } } }); const saved = await (await post()).json() as CommunityPostDoc; const input = message(saved.id);
    await expect(emailCommunityPost(r, { uid: 'other', role: 'citizen', wardIds: [] }, input, directory)).rejects.toMatchObject({ code: 'post_owner' });
    await expect(emailCommunityPost(r, { uid: 'private-user-id', role: 'citizen', wardIds: [] }, { ...input, representativeId: 'unmatched' }, directory)).rejects.toMatchObject({ code: 'recipient_unavailable' });
    expect((await request('/email', { ...input, confirmed: false })).status).toBe(400);
    const unavailable = setup(); expect((await unavailable.request('/email', input)).status).toBe(503);
  });
  it('does not start a new delivery when an ambiguous receipt is older than provider idempotency', async () => {
    let deliveries = 0; const { r, post, advance } = setup({ email: { available: () => true, async send() { deliveries++; throw new ApiFault(503, 'email_delivery_pending', 'Unknown receipt'); } } }); const saved = await (await post()).json() as CommunityPostDoc; const input = message(saved.id); const identity = { uid: 'private-user-id', role: 'citizen' as const, wardIds: [] };
    await expect(emailCommunityPost(r, identity, input, directory)).rejects.toMatchObject({ code: 'email_delivery_pending' }); advance(24 * 3_600_000);
    await expect(emailCommunityPost(r, identity, input, directory)).rejects.toMatchObject({ code: 'email_confirmation_required' }); expect(deliveries).toBe(1);
  });
});
