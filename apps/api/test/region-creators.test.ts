import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { CommunityPostDoc, IssueDoc, RegionCreatorsResponse, ReportDoc, Role, WardDoc } from '@leadnet/shared';
import { createApp } from '../src/app.ts';
import type { Filter } from '../src/services/store.ts';
import { MemoryStore } from './helpers.ts';

const ward: WardDoc = { id: 'ward-creators', number: 1, name: { en: 'Selected ward', kn: 'ವಾರ್ಡ್' }, zone: null, corporation: null, assembly: null, centroid: { lat: 12.97, lng: 77.59 }, officerLeaderId: null, stats: null, statsUpdatedAt: null };
const otherWard: WardDoc = { ...ward, id: 'ward-other', number: 2 };
const creatorId = (wardId: string, uid: string) => createHash('sha256').update(JSON.stringify([wardId, uid])).digest('hex');

class ReadTrackingStore extends MemoryStore {
  reads: Array<{ collection: string; filters: Filter[] } | { path: string }> = [];
  activePrivateReads = 0;
  maxPrivateReads = 0;
  private async trackPrivateRead<T>(action: () => Promise<T>): Promise<T> {
    this.activePrivateReads++;
    this.maxPrivateReads = Math.max(this.maxPrivateReads, this.activePrivateReads);
    try { await new Promise((resolve) => setTimeout(resolve, 0)); return await action(); }
    finally { this.activePrivateReads--; }
  }
  override async get<T>(path: string): Promise<T | null> {
    this.reads.push({ path });
    return path.startsWith('postOwners/') ? this.trackPrivateRead(() => super.get<T>(path)) : super.get<T>(path);
  }
  override async list<T>(collection: string, filters: Filter[] = []): Promise<T[]> {
    this.reads.push({ collection, filters });
    return collection === 'reports' ? this.trackPrivateRead(() => super.list<T>(collection, filters)) : super.list<T>(collection, filters);
  }
}

function issue(id = 'issue-a', wardId = ward.id): IssueDoc {
  return { id, title: { en: 'Approved damaged footpath', kn: 'ಹಾನಿಯಾದ ಕಾಲುದಾರಿ' }, summary: { en: 'Approved public summary', kn: 'ಸಾರಾಂಶ' }, category: 'pothole', hazards: [], severity: 2, status: 'reported', departmentId: 'roads', wardId, wardName: 'Selected ward', location: { lat: 12.971623, lng: 77.594623, geohash: 'PRIVATE_GEOHASH_SENTINEL' }, coverPhotoUrl: 'https://media.example/PRIVATE_ISSUE_PHOTO', lang: 'en', reportCount: 1, supporterCount: 10, priority: { score: 20, band: 'low', components: [] }, reportedAt: 100, acknowledgedAt: null, firstClaimedAt: null, verifiedAt: null, lastEventAt: 100, updatedAt: 100, claimCount: 0, reopenCount: 0, overrideCount: 0, verification: { claimNo: 0, confirms: 0, disputes: 0, eligible: 1, quorum: 1 }, sla: { ackDueAt: 200, resolveDueAt: 300, overdue: false }, evidenceFlag: null, passCode: 'BLR-TEST', isDemo: false };
}

function report(id: string, uid: string, issueId = 'issue-a', createdAt = 100): ReportDoc {
  return { id, uid, issueId, merged: false, anonymous: true, lang: 'en', text: 'PRIVATE_REPORT_TEXT_SENTINEL private@example.com 9876543210', transcript: 'PRIVATE_TRANSCRIPT_SENTINEL', photoUrl: 'https://media.example/PRIVATE_REPORT_PHOTO', hasAudio: true, location: { lat: 12.971623, lng: 77.594623, geohash: 'PRIVATE_GEOHASH_SENTINEL' }, createdAt, triageRunId: 'PRIVATE_TRIAGE_ID', dedupeRunId: 'PRIVATE_DEDUPE_ID' };
}

function post(id: string, options: Partial<CommunityPostDoc> = {}): CommunityPostDoc {
  return { id, authorLabel: 'Citizen', text: 'Public blocked drain', media: null, location: { lat: 12.971623, lng: 77.594623, source: 'manual', accuracyM: null, capturedAt: 100 }, ward: { id: ward.id, name: ward.name.en, assembly: null }, issueId: null, category: 'drainage', createdAt: 300, updatedAt: 300, likeCount: 99, commentCount: 12, isDemo: false, ...options };
}

function setup() {
  const store = new ReadTrackingStore();
  const app = createApp({ store, auth: { async verify(token) {
    const roles: Record<string, Role> = { officer: 'officer', 'officer-other': 'officer', admin: 'admin', citizen: 'citizen', moderator: 'moderator', 'demo-officer': 'officer', 'demo-admin': 'admin' };
    return { uid: `viewer-${token}`, role: roles[token] ?? 'citizen', wardIds: token === 'officer' || token.startsWith('demo-') ? [ward.id, otherWard.id] : token === 'officer-other' ? [otherWard.id] : [], ...(token.startsWith('demo-') ? { demoOfficer: true } : {}) };
  }, async setRole() {} }, wards: { lookup: () => ward, get: (id) => id === ward.id ? ward : id === otherWard.id ? otherWard : null } });
  const request = (token: string | null = 'officer', wardId: string | null = ward.id) => app.request(`/api/v1/officer/creators${wardId === null ? '' : `?wardId=${encodeURIComponent(wardId)}`}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  async function addPost(value: CommunityPostDoc, uid: string | null = 'private-post-author') {
    await store.set(`posts/${value.id}`, value);
    if (uid !== null) await store.set(`postOwners/${value.id}`, { uid, rawLocation: { lat: 12.971623, lng: 77.594623 }, mediaPath: 'PRIVATE_STORAGE_PATH_SENTINEL', createdAt: value.createdAt });
  }
  return { store, request, addPost };
}

describe('ward creator directory authorization', () => {
  it('requires authentication before reading any records', async () => {
    const s = setup(); const response = await s.request(null);
    expect(response.status).toBe(401); expect(await response.json()).toMatchObject({ error: { code: 'unauthenticated' } }); expect(s.store.reads).toEqual([]);
  });
  it.each(['citizen', 'moderator'])('denies %s identities before ownership reads', async (role) => {
    const s = setup(); const response = await s.request(role);
    expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ error: { code: 'officer_required' } }); expect(s.store.reads).toEqual([]);
  });
  it('denies an officer outside the assigned ward before any store read', async () => {
    const s = setup(); const response = await s.request('officer-other');
    expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ error: { code: 'ward_scope' } }); expect(s.store.reads).toEqual([]);
  });
  it.each(['demo-officer', 'demo-admin'])('denies self-assigned %s identities before any store read', async (token) => {
    const s = setup(); const response = await s.request(token);
    expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ error: { code: 'demo_officer_restricted' } }); expect(s.store.reads).toEqual([]);
  });
  it('allows an admin to select an existing ward without an assignment', async () => {
    const s = setup(); const response = await s.request('admin', otherWard.id);
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ wardId: otherWard.id, creators: [], creatorCount: 0, activityCount: 0, isDemo: false });
  });
  it.each([null, '', '../ward', '.', '..', 'a'.repeat(201)])('rejects a missing or malformed ward id (%s) before private reads', async (id) => {
    const s = setup(); const response = await s.request('officer', id);
    expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ error: { code: 'invalid_id' } }); expect(s.store.reads).toEqual([]);
  });
  it('requires an exact existing ward even for admins', async () => {
    const s = setup(); const response = await s.request('admin', 'unknown-ward');
    expect(response.status).toBe(404); expect(await response.json()).toMatchObject({ error: { code: 'ward_not_found' } }); expect(s.store.reads).toEqual([]);
  });
});

describe('ward creator directory aggregation', () => {
  it('deduplicates repeated reports and canonical projections per creator and keeps independent posts', async () => {
    const s = setup(); await s.store.set('issues/issue-a', issue());
    await s.store.set('reports/report-first', report('report-first', 'private-author-alpha'));
    await s.store.set('reports/report-repeat', report('report-repeat', 'private-author-alpha', 'issue-a', 200));
    await s.store.set('reports/report-second', report('report-second', 'private-author-beta', 'issue-a', 150));
    await s.addPost(post('issue-issue-a', { issueId: 'issue-a', createdAt: 100 }), 'private-author-alpha');
    await s.addPost(post('post-independent', { issueId: 'issue-a', createdAt: 500 }), 'private-author-alpha');
    const response = await s.request(); expect(response.status).toBe(200); const result = await response.json() as RegionCreatorsResponse;
    expect(result).toMatchObject({ wardId: ward.id, creatorCount: 2, activityCount: 3, isDemo: false });
    expect(result.creators.map((creator) => creator.id)).toEqual([creatorId(ward.id, 'private-author-alpha'), creatorId(ward.id, 'private-author-beta')]);
    expect(result.creators[0]).toMatchObject({ authorLabel: 'Citizen', activityCount: 2, lastPostedAt: 500, activities: [{ id: 'post-independent', kind: 'post' }, { id: 'issue-a', kind: 'issue', title: 'Approved damaged footpath', createdAt: 200 }] });
    expect(result.creators[1]).toMatchObject({ authorLabel: 'Citizen', activityCount: 1, lastPostedAt: 150, activities: [{ id: 'issue-a', kind: 'issue', createdAt: 150 }] });
  });
  it('includes post-only authors while excluding missing owners, supporters and commenters', async () => {
    const s = setup(); await s.addPost(post('post-only'), 'private-only-author'); await s.addPost(post('post-owner-missing'), null);
    await s.store.set('supports/support-only', { uid: 'private-supporter', issueId: 'issue-a', createdAt: 900 });
    await s.store.set('posts/post-only/comments/comment-only', { id: 'comment-only', uid: 'private-commenter', postId: 'post-only', authorLabel: 'Citizen', body: 'A comment', createdAt: 1000, isDemo: false });
    const response = await s.request(); expect(response.status).toBe(200); const result = await response.json() as RegionCreatorsResponse;
    expect(result).toMatchObject({ creatorCount: 1, activityCount: 1, creators: [{ id: creatorId(ward.id, 'private-only-author'), activities: [{ id: 'post-only', kind: 'post', category: 'drainage', status: null }] }] });
    expect(s.store.reads.every((read) => !('collection' in read) || !['supports', 'postReactions'].includes(read.collection))).toBe(true);
    expect(JSON.stringify(s.store.reads)).not.toContain('comments');
  });
  it('recovers canonical creator ownership without a report and uses only approved issue metadata', async () => {
    const s = setup(); await s.store.set('issues/issue-a', issue());
    await s.addPost(post('issue-issue-a', { issueId: 'issue-a', text: 'STALE_PROJECTION_TEXT', category: 'garbage', createdAt: 250 }), 'private-legacy-author');
    const response = await s.request(); expect(response.status).toBe(200); const result = await response.json() as RegionCreatorsResponse;
    expect(result).toMatchObject({ creatorCount: 1, activityCount: 1, creators: [{ id: creatorId(ward.id, 'private-legacy-author'), activities: [{ id: 'issue-a', kind: 'issue', title: 'Approved damaged footpath', category: 'pothole', status: 'reported', createdAt: 250 }] }] });
    expect(JSON.stringify(result)).not.toContain('STALE_PROJECTION_TEXT');
  });
  it('restricts source queries and skips cross-ward or orphan canonical projections', async () => {
    const s = setup(); await s.store.set('issues/issue-a', issue()); await s.store.set('issues/issue-other', issue('issue-other', otherWard.id));
    await s.store.set('reports/report-selected', report('report-selected', 'private-selected'));
    await s.store.set('reports/report-other', report('report-other', 'private-outside', 'issue-other'));
    await s.addPost(post('post-other', { ward: { id: otherWard.id, name: 'Other ward', assembly: null } }), 'private-outside');
    await s.addPost(post('issue-issue-other', { issueId: 'issue-other' }), 'private-cross-ward');
    await s.addPost(post('issue-missing', { issueId: 'missing' }), 'private-orphan');
    const response = await s.request(); expect(response.status).toBe(200); const result = await response.json() as RegionCreatorsResponse;
    expect(result).toMatchObject({ creatorCount: 1, activityCount: 1, creators: [{ id: creatorId(ward.id, 'private-selected') }] });
    expect(s.store.reads).toContainEqual({ collection: 'issues', filters: [{ field: 'wardId', op: '==', value: ward.id }] });
    expect(s.store.reads).toContainEqual({ collection: 'posts', filters: [{ field: 'ward.id', op: '==', value: ward.id }] });
    expect(s.store.reads.filter((read) => 'collection' in read && read.collection === 'reports')).toEqual([{ collection: 'reports', filters: [{ field: 'issueId', op: '==', value: 'issue-a' }] }]);
    expect(s.store.reads).not.toContainEqual({ path: 'postOwners/post-other' });
    expect(s.store.reads).not.toContainEqual({ path: 'issues/issue-other' });
  });
  it('uses a different opaque creator reference for the same author in each ward', async () => {
    const s = setup(); await s.addPost(post('post-selected'), 'private-shared-author'); await s.addPost(post('post-other', { ward: { id: otherWard.id, name: 'Other ward', assembly: null } }), 'private-shared-author');
    const firstResponse = await s.request(); const secondResponse = await s.request('officer', otherWard.id);
    expect(firstResponse.status).toBe(200); expect(secondResponse.status).toBe(200);
    const first = await firstResponse.json() as RegionCreatorsResponse; const second = await secondResponse.json() as RegionCreatorsResponse;
    expect(first.creators[0]?.id).toBe(creatorId(ward.id, 'private-shared-author')); expect(second.creators[0]?.id).toBe(creatorId(otherWard.id, 'private-shared-author'));
    expect(first.creators[0]?.id).toMatch(/^[a-f0-9]{64}$/); expect(first.creators[0]?.id).not.toBe(second.creators[0]?.id);
  });
  it('returns only a scrubbed public activity projection, never private report or owner fields', async () => {
    const s = setup(); const value = issue(); value.title.en = 'Road damage private-title@example.com 9876543210'; await s.store.set('issues/issue-a', value);
    await s.store.set('reports/report-private', report('report-private', 'PRIVATE_RAW_UID_SENTINEL'));
    await s.addPost(post('post-private', { text: 'Drain blocked contact private-post@example.com 9123456789', media: { kind: 'photo', url: 'https://example.com/PRIVATE_POST_MEDIA', mimeType: 'image/jpeg' } }), 'PRIVATE_POST_UID_SENTINEL');
    const response = await s.request(); expect(response.status).toBe(200); const result = await response.json() as RegionCreatorsResponse; const serialized = JSON.stringify(result);
    for (const secret of ['PRIVATE_', 'private-title@example.com', 'private-post@example.com', 'private@example.com', '9876543210', '9123456789', '12.971623', '77.594623', 'report-private', 'triageRunId', 'dedupeRunId', 'transcript', 'location', 'mediaPath', 'photoUrl', 'rawLocation', '"uid"']) expect(serialized).not.toContain(secret);
    for (const creator of result.creators) {
      expect(Object.keys(creator).sort()).toEqual(['activities', 'activityCount', 'authorLabel', 'id', 'isDemo', 'lastPostedAt']);
      for (const activity of creator.activities) expect(Object.keys(activity).sort()).toEqual(['category', 'createdAt', 'id', 'isDemo', 'kind', 'status', 'title']);
    }
    expect(serialized).toContain('[email removed]'); expect(serialized).toContain('[phone removed]');
  });
  it('bounds concurrent private reads while retaining every matching activity', async () => {
    const s = setup();
    for (let index = 0; index < 25; index++) {
      const id = `issue-${index}`; await s.store.set(`issues/${id}`, issue(id)); await s.store.set(`reports/report-${index}`, report(`report-${index}`, 'private-many-author', id)); await s.addPost(post(`post-${index}`), 'private-many-author');
    }
    const response = await s.request(); expect(response.status).toBe(200); const result = await response.json() as RegionCreatorsResponse;
    expect(result).toMatchObject({ creatorCount: 1, activityCount: 50 }); expect(s.store.maxPrivateReads).toBeGreaterThan(1); expect(s.store.maxPrivateReads).toBeLessThanOrEqual(8);
    expect(s.store.reads.filter((read) => 'collection' in read && read.collection === 'reports')).toHaveLength(25);
  });
});
