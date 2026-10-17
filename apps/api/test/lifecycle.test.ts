import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { MemoryStore } from './helpers.ts';
import type { AskResponse, DraftResponse, IssueDoc, ResolutionResponse, SubmitReportResponse } from '@leadnet/shared';
import sharp from 'sharp';
import { ApiFault } from '../src/services/errors.ts';

const triage = { category: 'pothole', hazards: ['traffic_risk'], severity: 3, title: { en: 'Road damage', kn: 'ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ' }, summary: { en: 'A pothole needs repair.', kn: 'ರಸ್ತೆಯಲ್ಲಿರುವ ಗುಂಡಿಯನ್ನು ಸರಿಪಡಿಸಬೇಕು' }, detectedLang: 'en', transcript: null, confidence: 0.9, isCivicIssue: true };
const ward = { id: 'w-test-1', number: 1, name: { en: 'Demo ward', kn: 'ವಾರ್ಡ್' }, zone: null, corporation: null, assembly: null, centroid: { lat: 12.97, lng: 77.59 }, officerLeaderId: null, stats: null, statsUpdatedAt: null };

function setup(options: { transcript?: string; originalPrivateText?: string; briefValue?: unknown } = {}) {
  const store = new MemoryStore();
  let evidencePass = true;
  let failAi = false;
  let failNextPublish = false;
  let now = 1_800_000_000_000;
  let detectedLang: 'en' | 'kn' = 'en';
  const blobs = new Map<string, { bytes: Buffer; mimeType: string }>();
  const published = new Set<string>();
  const app = createApp({
    store,
    auth: {
      async verify(token) { return { uid: token, role: token.startsWith('officer') ? 'officer' : 'citizen', wardIds: token === 'officer-other' ? ['another-ward'] : [ward.id] }; },
      async setRole() {},
    },
    wards: { lookup: () => ward, get: (id) => id === ward.id ? ward : null },
    media: {
      async save(path, upload) { blobs.set(path, upload); return { path, url: `https://media.example/${path}` }; },
      async read(path) { return blobs.get(path)!; },
      async publish(path) { if (failNextPublish) { failNextPublish = false; throw new ApiFault(503, 'storage_unavailable', 'Temporary publication failure.'); } if (!blobs.has(path)) throw new Error('Missing committed media'); published.add(path); },
    },
    ai: { async generate(request) {
      if (failAi) throw new Error('Unavailable');
      if (request.task === 'triage') return { value: { ...triage, detectedLang, transcript: options.transcript ?? null, ...(options.originalPrivateText ? { title: { ...triage.title, en: options.originalPrivateText }, summary: { ...triage.summary, en: options.originalPrivateText } } : {}) } };
      if (request.task === 'dedupe') return { value: { issueId: null, confidence: 0, reasons: [] } };
      if (request.task === 'evidence') return { value: { sameLocation: evidencePass, sameLocationConfidence: 0.95, defectResolved: true, defectResolvedConfidence: 0.9, afterPhotoQuality: 'good', notes: 'Compared the visible road.' } };
      return { value: options.briefValue ?? { en: 'There are 99999 issues.', kn: 'ಒಟ್ಟು 99999 ಸಮಸ್ಯೆಗಳು ಇವೆ' } };
    } },
    now: () => now,
  });
  async function request(path: string, uid: string, body?: unknown) {
    return app.request(`/api/v1${path}`, { method: 'POST', headers: { Authorization: `Bearer ${uid}`, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
  }
  async function draft(uid = 'citizen-a', demo = false) {
    const form = new FormData();
    form.set('lat', '12.97'); form.set('lng', '77.59'); form.set('text', 'Road damage');
    if (demo) form.set('demo', 'true');
    const photo = await sharp({ create: { width: 4, height: 4, channels: 3, background: 'black' } }).jpeg().toBuffer();
    form.set('photo', new File([new Uint8Array(photo)], 'before.jpg', { type: 'image/jpeg' }));
    if (options.transcript) {
      const audio = Buffer.alloc(44 + 32000); audio.write('RIFF'); audio.writeUInt32LE(audio.length - 8, 4); audio.write('WAVEfmt ', 8); audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(16000, 24); audio.writeUInt32LE(32000, 28); audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write('data', 36); audio.writeUInt32LE(32000, 40);
      form.set('audio', new File([new Uint8Array(audio)], 'voice.wav', { type: 'audio/wav' }));
    }
    const response = await request('/reports/draft', uid, form);
    expect(response.status).toBe(200);
    return response.json() as Promise<DraftResponse>;
  }
  async function submit(uid = 'citizen-a') {
    const proposal = await draft(uid);
    const response = await request('/reports', uid, { draftId: proposal.draftId, ...proposal.triage, joinIssueId: null, anonymous: true });
    expect(response.status).toBe(200);
    return response.json() as Promise<SubmitReportResponse>;
  }
  async function resolution(issueId: string, officer = 'officer-a', override = false) {
    const photo = await sharp({ create: { width: 4, height: 4, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const form = new FormData(); form.set('photo', new File([new Uint8Array(photo)], 'after.jpg', { type: 'image/jpeg' }));
    if (override) { form.set('override', 'true'); form.set('overrideReason', 'Inspected the road personally.'); }
    return request(`/issues/${issueId}/resolution`, officer, form);
  }
  async function claim(issueId: string) {
    expect((await request(`/issues/${issueId}/transition`, 'officer-a', { to: 'acknowledged' })).status).toBe(200);
    expect((await resolution(issueId)).status).toBe(200);
  }
  return { app, store, request, draft, submit, resolution, claim, published, failPublication: () => { failNextPublish = true; }, setLang: (lang: 'en' | 'kn') => { detectedLang = lang; }, advanceHours: (hours: number) => { now += hours * 3_600_000; }, holdEvidence: () => { evidencePass = false; }, failAi: () => { failAi = true; } };
}

describe('API authentication', () => {
  it('requires a verified identity before creating a report draft', async () => {
    const response = await createApp().request('/api/v1/reports/draft', { method: 'POST' });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'unauthenticated' } });
  });
  it('requires a verified identity before voting', async () => {
    const response = await createApp().request('/api/v1/issues/example/verify', { method: 'POST' });
    expect(response.status).toBe(401);
  });
});

describe('report and citizen verification loop', () => {
  it('publishes only the canonical committed photo under concurrent report confirmation retries', async () => {
    const s = setup(); const proposal = await s.draft();
    const body = { draftId: proposal.draftId, ...proposal.triage, joinIssueId: null, anonymous: true };
    const responses = await Promise.all([s.request('/reports', 'citizen-a', body), s.request('/reports', 'citizen-a', body)]);
    const values = await Promise.all(responses.map((response) => response.json() as Promise<SubmitReportResponse>));
    expect(values[0]).toEqual(values[1]);
    expect([...s.published]).toEqual([`evidence/${values[0]!.issueId}/${proposal.draftId}.jpg`]);
  });
  it('follows and unfollows idempotently without gaining support or voting eligibility', async () => {
    const s = setup(); const { issueId } = await s.submit();
    for (let i = 0; i < 2; i++) expect(await (await s.request(`/issues/${issueId}/follow`, 'follower-only', { following: true })).json()).toMatchObject({ following: true });
    expect(await s.store.get('users/follower-only')).toMatchObject({ followedIssueIds: [issueId], role: 'citizen' });
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.supporterCount).toBe(1);
    await s.claim(issueId); const vote = new FormData(); vote.set('vote', 'confirm');
    expect((await s.request(`/issues/${issueId}/verify`, 'follower-only', vote)).status).toBe(403);
    expect(await (await s.request(`/issues/${issueId}/follow`, 'follower-only', { following: false })).json()).toMatchObject({ following: false });
    expect(await s.store.get('users/follower-only')).toMatchObject({ followedIssueIds: [] });
  });
  it('rejects swapped numeric labels and renders each fact with its code-bound label', async () => {
    const s = setup({ briefValue: { en: 'Officials claimed 0 fixes and citizens verified 1.', kn: 'ಅಧಿಕಾರಿಗಳು 0 ಪರಿಹಾರ ಸಲ್ಲಿಸಿದ್ದಾರೆ ಮತ್ತು ನಾಗರಿಕರು 1 ಪರಿಹಾರ ದೃಢೀಕರಿಸಿದ್ದಾರೆ' } });
    const { issueId } = await s.submit(); await s.claim(issueId);
    const answer = await (await s.request('/ask', 'citizen-a', { question: 'What is the verification gap?' })).json() as AskResponse;
    expect(answer.answer.en).toContain('Fixes claimed: 1'); expect(answer.answer.en).toContain('Verified by citizens: 0');
    expect(answer.fallbackUsed).toBe(true);
  });
  it('lets Gemini choose relevant fact IDs while code renders all labels and quantities', async () => {
    const s = setup({ briefValue: { factKeys: ['verified', 'claimed'] } }); const { issueId } = await s.submit(); await s.claim(issueId);
    const answer = await (await s.request('/ask', 'citizen-a', { question: 'What is the verification gap?' })).json() as AskResponse;
    expect(answer.answer.en).toContain('Verified by citizens: 0'); expect(answer.answer.en).toContain('Fixes claimed: 1'); expect(answer.fallbackUsed).toBe(false);
  });
  it('keeps a raw voice transcript in the owner report while excluding it from public AI trails', async () => {
    const transcript = 'PRIVATE_VOICE_SENTINEL_8B6C'; const s = setup({ transcript }); await s.submit();
    const published = (await s.store.list<{ public: boolean; output: unknown }>('aiRuns')).filter((run) => run.public);
    expect(published).toHaveLength(1);
    expect(published[0]?.output).toMatchObject({ category: 'pothole', severity: 3, hazards: ['traffic_risk'] });
    expect(JSON.stringify(published)).not.toContain(transcript);
    expect((await s.store.list<{ transcript: string }>('reports'))[0]?.transcript).toBe(transcript);
  });
  it('does not expose original AI wording that a citizen edited out before publication', async () => {
    const originalPrivateText = 'PRIVATE_PLACE_SENTINEL_723C'; const s = setup({ originalPrivateText }); const proposal = await s.draft();
    await s.request('/reports', 'citizen-a', { draftId: proposal.draftId, ...proposal.triage, title: triage.title, summary: triage.summary, joinIssueId: null, anonymous: true });
    const published = (await s.store.list<{ public: boolean; output: unknown }>('aiRuns')).filter((run) => run.public);
    expect(published).toHaveLength(1);
    expect(JSON.stringify(published)).not.toContain(originalPrivateText);
  });
  it('refreshes the time-dependent overdue ledger when support changes', async () => {
    const s = setup(); const { issueId } = await s.submit(); s.advanceHours(26);
    await s.request(`/issues/${issueId}/support`, 'citizen-b');
    expect(await s.store.get('ledger/city')).toMatchObject({ city: { overdue: { value: 1 } } });
  });
  it('keeps a sample-generated report labelled as demo after publication', async () => {
    const s = setup(); const proposal = await s.draft('citizen-a', true);
    const response = await s.request('/reports', 'citizen-a', { draftId: proposal.draftId, ...proposal.triage, joinIssueId: null, anonymous: true });
    const { issueId } = await response.json() as SubmitReportResponse;
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.isDemo).toBe(true);
  });
  it('preserves both reports when a citizen confirms a bounded duplicate merge', async () => {
    const s = setup(); const original = await s.submit(); const proposal = await s.draft('citizen-b');
    const response = await s.request('/reports', 'citizen-b', { draftId: proposal.draftId, ...proposal.triage, joinIssueId: original.issueId, anonymous: true });
    expect(await response.json()).toMatchObject({ issueId: original.issueId, merged: true });
    expect(await s.store.list('issues')).toHaveLength(1); expect(await s.store.list('reports')).toHaveLength(2);
    expect(await s.store.get(`issues/${original.issueId}`)).toMatchObject({ reportCount: 2, supporterCount: 2 });
  });
  it('preserves the language of an individual report when merging into an English issue', async () => {
    const s = setup(); const original = await s.submit(); s.setLang('kn'); const proposal = await s.draft('citizen-b');
    await s.request('/reports', 'citizen-b', { draftId: proposal.draftId, ...proposal.triage, joinIssueId: original.issueId, anonymous: true });
    expect((await s.store.list<{ uid: string; lang: string }>('reports')).find((report) => report.uid === 'citizen-b')?.lang).toBe('kn');
  });
  it('enforces draft ownership and makes confirm retries idempotent', async () => {
    const s = setup(); const proposal = await s.draft();
    const body = { draftId: proposal.draftId, ...proposal.triage, joinIssueId: null, anonymous: true };
    expect((await s.request('/reports', 'citizen-b', body)).status).toBe(403);
    const first = await (await s.request('/reports', 'citizen-a', body)).json();
    const repeated = await (await s.request('/reports', 'citizen-a', body)).json();
    expect(repeated).toEqual(first);
    expect(await s.store.list('issues')).toHaveLength(1);
  });
  it('counts each supporter once under concurrent retries', async () => {
    const s = setup(); const { issueId } = await s.submit();
    const responses = await Promise.all([s.request(`/issues/${issueId}/support`, 'citizen-b'), s.request(`/issues/${issueId}/support`, 'citizen-b')]);
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.supporterCount).toBe(2);
  });
  it('rejects a duplicate join when category or distance is outside the supplied candidate set', async () => {
    const s = setup(); const { issueId } = await s.submit(); const proposal = await s.draft('citizen-b');
    const response = await s.request('/reports', 'citizen-b', { draftId: proposal.draftId, ...proposal.triage, category: 'garbage', joinIssueId: issueId, anonymous: true });
    expect(response.status).toBe(409);
    expect(s.published.size).toBe(1);
  });
  it('prevents a citizen or an officer from another ward changing the status', async () => {
    const s = setup(); const { issueId } = await s.submit();
    for (const uid of ['citizen-a', 'officer-other']) expect((await s.request(`/issues/${issueId}/transition`, uid, { to: 'acknowledged' })).status).toBe(403);
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.status).toBe('reported');
  });
  it('holds a wrong-location claim, and counts a written override publicly', async () => {
    const s = setup(); const { issueId } = await s.submit();
    await s.request(`/issues/${issueId}/transition`, 'officer-a', { to: 'acknowledged' }); s.holdEvidence();
    const held = await (await s.resolution(issueId)).json();
    expect(held).toMatchObject({ advanced: false, gate: { decision: 'hold' } });
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.status).toBe('acknowledged');
    expect((await (await s.resolution(issueId, 'officer-a', true)).json() as ResolutionResponse).advanced).toBe(true);
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.overrideCount).toBe(1);
  });
  it('keeps both the photo and its AI observations private when a resolution transaction is rejected', async () => {
    const s = setup(); const { issueId } = await s.submit();
    await s.request(`/issues/${issueId}/transition`, 'officer-a', { to: 'acknowledged' }); s.store.rejectNextCommit = true;
    expect((await s.resolution(issueId)).status).toBe(409);
    expect(s.published.size).toBe(1);
    expect((await s.store.list<{ task: string; public: boolean }>('aiRuns')).find((run) => run.task === 'evidence')?.public).toBe(false);
  });
  it('recovers a committed resolution publication on identical retry without another claim or AI run', async () => {
    const s = setup(); const { issueId } = await s.submit();
    await s.request(`/issues/${issueId}/transition`, 'officer-a', { to: 'acknowledged' }); s.failPublication();
    expect((await s.resolution(issueId)).status).toBe(503);
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.status).toBe('resolved_pending_verification');
    expect((await s.resolution(issueId)).status).toBe(200);
    expect(s.published.size).toBe(2);
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.claimCount).toBe(1);
    expect((await s.store.list<{ task: string }>('aiRuns')).filter((run) => run.task === 'evidence')).toHaveLength(1);
  });
  it('never passes resolution evidence when every AI attempt fails', async () => {
    const s = setup(); const { issueId } = await s.submit();
    await s.request(`/issues/${issueId}/transition`, 'officer-a', { to: 'acknowledged' }); s.failAi();
    expect(await (await s.resolution(issueId)).json()).toMatchObject({ advanced: false, gate: { decision: 'hold', reasons: ['unusable_photo'] } });
    expect((await s.store.list<{ task: string; fallbackUsed: boolean; attempts: number }>('aiRuns')).find((r) => r.task === 'evidence')).toMatchObject({ fallbackUsed: true, attempts: 2 });
  });
  it('accepts one vote per eligible citizen and only verifies after quorum', async () => {
    const s = setup(); const { issueId } = await s.submit();
    await s.request(`/issues/${issueId}/support`, 'citizen-b'); await s.claim(issueId);
    const form = () => { const body = new FormData(); body.set('vote', 'confirm'); return body; };
    expect((await s.request(`/issues/${issueId}/verify`, 'stranger', form())).status).toBe(403);
    expect(await (await s.request(`/issues/${issueId}/verify`, 'citizen-a', form())).json()).toMatchObject({ outcome: 'pending', confirms: 1, quorum: 2 });
    expect(await (await s.request(`/issues/${issueId}/verify`, 'citizen-a', form())).json()).toMatchObject({ outcome: 'pending', confirms: 1 });
    expect(await (await s.request(`/issues/${issueId}/verify`, 'citizen-b', form())).json()).toMatchObject({ outcome: 'verified', confirms: 2 });
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.status).toBe('verified');
  });
  it('reopens on citizen dispute and starts a fresh voting claim after a new fix', async () => {
    const s = setup(); const { issueId } = await s.submit(); await s.request(`/issues/${issueId}/support`, 'citizen-b'); await s.claim(issueId);
    const vote = async (uid: string, choice: string) => { const form = new FormData(); form.set('vote', choice); return s.request(`/issues/${issueId}/verify`, uid, form); };
    await vote('citizen-a', 'dispute'); expect(await (await vote('citizen-b', 'dispute')).json()).toMatchObject({ outcome: 'reopened' });
    await s.claim(issueId);
    expect(await (await vote('citizen-a', 'confirm')).json()).toMatchObject({ outcome: 'pending', confirms: 1, disputes: 0 });
    expect(await (await vote('citizen-b', 'confirm')).json()).toMatchObject({ outcome: 'verified' });
    expect(await s.store.get(`issues/${issueId}`)).toMatchObject({ claimCount: 2, reopenCount: 1, verification: { claimNo: 2 } });
    expect(await s.store.list('votes')).toHaveLength(4);
  });
  it('scrubs edited public text and grounds the ask fallback in computed facts', async () => {
    const s = setup(); const proposal = await s.draft();
    const response = await s.request('/reports', 'citizen-a', { draftId: proposal.draftId, ...proposal.triage, title: { en: 'Contact demo@example.com', kn: triage.title.kn }, joinIssueId: null, anonymous: true });
    const { issueId } = await response.json() as SubmitReportResponse;
    expect((await s.store.get<IssueDoc>(`issues/${issueId}`))?.title.en).not.toContain('demo@example.com');
    const answer = await (await s.request('/ask', 'citizen-a', { question: 'How many issues?' })).json() as AskResponse;
    expect(answer.fallbackUsed).toBe(true); expect(answer.answer.en).not.toContain('99999');
    expect(answer.facts.issues).toBe(1);
  });
});
