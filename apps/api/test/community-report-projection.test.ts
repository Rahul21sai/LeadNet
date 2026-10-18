import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import type { CaptureLocation, CommunityPostDoc, DraftResponse, IssueDoc, SubmitReportResponse } from '@leadnet/shared';
import { createApp } from '../src/app.ts';
import { ApiFault } from '../src/services/errors.ts';
import type { Upload } from '../src/services/media.ts';
import { MemoryStore } from './helpers.ts';

const ward = { id: 'ward-projection', number: 1, name: { en: 'Test Ward', kn: 'ವಾರ್ಡ್' }, zone: null, corporation: null, assembly: 'Test Assembly', centroid: { lat: 12.97, lng: 77.59 }, officerLeaderId: null, stats: null, statsUpdatedAt: null };
const triage = { category: 'pothole', hazards: ['traffic_risk'], severity: 3, title: { en: 'Draft road damage', kn: 'ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ' }, summary: { en: 'Unreviewed AI wording must not become the community post.', kn: 'ರಸ್ತೆಯಲ್ಲಿರುವ ಗುಂಡಿಯನ್ನು ಸರಿಪಡಿಸಬೇಕು' }, detectedLang: 'en', transcript: 'PRIVATE_VOICE_SENTINEL', confidence: 0.9, isCivicIssue: true };

function setup() {
  const store = new MemoryStore(); const blobs = new Map<string, Upload>(); const published = new Set<string>(); let failPublication = false; let sequence = 0;
  const app = createApp({ store, id: () => `projection-${++sequence}`, now: () => 1_800_000_000_000, auth: { async verify(uid) { return { uid, role: 'citizen', wardIds: [] }; }, async setRole() {} }, wards: { lookup: () => ward, get: () => ward }, ai: { async generate(request) { return { value: request.task === 'triage' ? triage : { issueId: null, confidence: 0, reasons: [] } }; } }, media: { async save(path, upload) { blobs.set(path, upload); return { path, url: `https://media.example/${path}` }; }, async read(path) { return blobs.get(path)!; }, async publish(path) { if (failPublication) { failPublication = false; throw new ApiFault(503, 'storage_unavailable', 'Retry publication'); } if (!blobs.has(path)) throw new Error('Missing media'); published.add(path); } } });
  const request = (path: string, body: unknown, uid = 'private-original-author') => app.request(`/api/v1${path}`, { method: 'POST', headers: { Authorization: `Bearer ${uid}`, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : JSON.stringify(body) });
  async function draft(uid?: string, withPhoto = true, demo = false) {
    const form = new FormData(); form.set('lat', '12.971623'); form.set('lng', '77.594623'); form.set('text', 'Road damage in my neighbourhood.'); if (demo) form.set('demo', 'true');
    if (withPhoto) form.set('photo', new File([new Uint8Array(await sharp({ create: { width: 4, height: 3, channels: 3, background: 'black' } }).jpeg().toBuffer())], 'pavement.jpg', { type: 'image/jpeg' }));
    const response = await request('/reports/draft', form, uid); expect(response.status).toBe(200); return response.json() as Promise<DraftResponse>;
  }
  const confirmed = (proposal: DraftResponse, joinIssueId: string | null = null) => ({ draftId: proposal.draftId, ...proposal.triage, title: { en: 'Approved damaged footpath', kn: 'ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ' }, summary: { en: 'Please inspect the damaged footpath. Contact private@example.com.', kn: 'ರಸ್ತೆಯಲ್ಲಿರುವ ಗುಂಡಿಯನ್ನು ಸರಿಪಡಿಸಬೇಕು' }, joinIssueId, anonymous: true });
  return { store, request, draft, confirmed, published, failPublication: () => { failPublication = true; } };
}

describe('canonical reports in the community feed', () => {
  it('atomically projects approved public wording and sanitized media while keeping ownership and exact position private', async () => {
    const s = setup(); const proposal = await s.draft(); const response = await s.request('/reports', s.confirmed(proposal)); expect(response.status).toBe(200); const result = await response.json() as SubmitReportResponse;
    const post = await s.store.get<CommunityPostDoc>(`posts/issue-${result.issueId}`);
    expect(post).toMatchObject({ id: `issue-${result.issueId}`, authorLabel: 'Citizen', issueId: result.issueId, category: 'pothole', likeCount: 0, commentCount: 0, isDemo: false, ward: { id: ward.id, assembly: ward.assembly }, location: { lat: 12.972, lng: 77.595, source: 'manual', accuracyM: null } });
    expect(post?.text).toContain('Approved damaged footpath'); expect(post?.text).not.toContain('Unreviewed AI wording'); expect(post?.text).not.toContain('private@example.com'); expect(JSON.stringify(post)).not.toContain('private-original-author'); expect(JSON.stringify(post)).not.toContain('PRIVATE_VOICE_SENTINEL'); expect(JSON.stringify(post)).not.toContain('geohash');
    const mediaPath = `evidence/${result.issueId}/${proposal.draftId}.jpg`; expect(post?.media).toMatchObject({ kind: 'photo', mimeType: 'image/jpeg', url: `https://media.example/${mediaPath}`, width: 4, height: 3 }); expect(s.published.has(mediaPath)).toBe(true);
    expect(await s.store.get(`postOwners/issue-${result.issueId}`)).toMatchObject({ uid: 'private-original-author', mediaPath, rawLocation: { lat: 12.971623, lng: 77.594623, capturedAt: 1_800_000_000_000 } satisfies Partial<CaptureLocation> });
  });
  it('retains one projection and social counts across confirmation retry and a duplicate join', async () => {
    const s = setup(); const proposal = await s.draft(); const body = s.confirmed(proposal); const first = await (await s.request('/reports', body)).json() as SubmitReportResponse;
    const path = `posts/issue-${first.issueId}`; const post = (await s.store.get<CommunityPostDoc>(path))!; await s.store.set(path, { ...post, likeCount: 8, commentCount: 3 });
    expect(await (await s.request('/reports', body)).json()).toEqual(first);
    const duplicate = await s.draft('second-private-author'); const merge = await s.request('/reports', s.confirmed(duplicate, first.issueId), 'second-private-author'); expect(merge.status).toBe(200); expect(await merge.json()).toMatchObject({ issueId: first.issueId, merged: true });
    expect(await s.store.list('posts')).toHaveLength(1); expect(await s.store.get(path)).toMatchObject({ likeCount: 8, commentCount: 3, text: post.text }); expect(await s.store.get(`postOwners/issue-${first.issueId}`)).toMatchObject({ uid: 'private-original-author' }); expect((await s.store.get<IssueDoc>(`issues/${first.issueId}`))?.reportCount).toBe(2);
  });
  it('recovers existing photo publication without re-creating or resetting the projection', async () => {
    const s = setup(); const proposal = await s.draft(); const body = s.confirmed(proposal); s.failPublication(); expect((await s.request('/reports', body)).status).toBe(503);
    const posts = await s.store.list<CommunityPostDoc>('posts'); expect(posts).toHaveLength(1); const post = posts[0]!; await s.store.set(`posts/${post.id}`, { ...post, likeCount: 2 });
    const retry = await s.request('/reports', body); expect(retry.status).toBe(200); const result = await retry.json() as SubmitReportResponse; expect(await s.store.list('posts')).toHaveLength(1); expect(await s.store.get(`posts/${post.id}`)).toMatchObject({ likeCount: 2 }); expect(s.published.has(`evidence/${result.issueId}/${proposal.draftId}.jpg`)).toBe(true);
  });
  it('does not expose an uncommitted report and preserves the demo marker without fabricating media', async () => {
    const s = setup(); const proposal = await s.draft(undefined, false, true); s.store.rejectNextCommit = true; expect((await s.request('/reports', s.confirmed(proposal))).status).toBe(409); expect(await s.store.list('posts')).toHaveLength(0); expect(await s.store.list('issues')).toHaveLength(0);
    const retry = await s.request('/reports', s.confirmed(proposal)); expect(retry.status).toBe(200); expect((await s.store.list<CommunityPostDoc>('posts'))[0]).toMatchObject({ media: null, isDemo: true });
  });
});
