import { distanceBetween, geohashForLocation, geohashQueryBounds } from 'geofire-common';
import { CATEGORY_META, DEDUPE_MAX_CANDIDATES, DEDUPE_RADIUS_M, OPEN_STATUSES, computePriority, computeSla, publicCaptureLocation, scrubPII, verificationQuorum, type AiRunDoc, type CaptureLocation, type CommunityPostDoc, type DraftDoc, type DraftResponse, type EvidenceDoc, type IssueDoc, type ReportDoc, type SubmitReport, type SubmitReportResponse, type Triage } from '@leadnet/shared';
import type { Identity } from './firebase.ts';
import type { Runtime } from './context.ts';
import { ApiFault, documentId, requireValue } from './errors.ts';
import { isKnownSample, prepareAudio, preparePhoto, type Upload } from './media.ts';
import { runAi } from '../ai/runner.ts';
import { sanitize, triageChecks, zDedupe, zTriage } from '../ai/verify/index.ts';
import { recomputeStats } from './ledger.ts';

export interface Membership { issueId: string; uid: string; createdAt: number; eligibleFromClaim: number }
interface DraftState extends DraftDoc { candidateIds: string[]; photoSize: { width: number; height: number } | null; demo: boolean; consumedBy?: SubmitReportResponse }
export const supportPath = (issueId: string, uid: string) => `supports/${issueId}_${encodeURIComponent(uid)}`;
export const issueDistance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => distanceBetween([a.lat, a.lng], [b.lat, b.lng]) * 1000;

async function nearby(r: Runtime, lat: number, lng: number, category: IssueDoc['category']) {
  const bounds = geohashQueryBounds([lat, lng], DEDUPE_RADIUS_M);
  const groups = await Promise.all(bounds.map(([start, end]) => r.store.list<IssueDoc>('issues', [{ field: 'location.geohash', op: '>=', value: start }, { field: 'location.geohash', op: '<=', value: end }])));
  const unique = new Map(groups.flat().map((issue) => [issue.id, issue]));
  return [...unique.values()].filter((issue) => issue.category === category && OPEN_STATUSES.includes(issue.status) && issueDistance(issue.location, { lat, lng }) <= DEDUPE_RADIUS_M)
    .sort((a, b) => issueDistance(a.location, { lat, lng }) - issueDistance(b.location, { lat, lng })).slice(0, DEDUPE_MAX_CANDIDATES);
}

export async function draftReport(r: Runtime, identity: Identity, input: { lat: number; lng: number; text: string; photo?: File; audio?: File; demo?: boolean }): Promise<DraftResponse> {
  if (!input.photo && !input.audio && !input.text.trim()) throw new ApiFault(400, 'empty_report', 'Add a photo, a voice note, or a description.');
  if (input.text.length > 2000) throw new ApiFault(400, 'text_too_long', 'Keep the description within 2000 characters.');
  const ward = r.wards.lookup(input.lat, input.lng);
  if (!ward) throw new ApiFault(422, 'outside_boundary', 'Choose a location inside the Bengaluru ward boundaries.');
  const id = r.id(); const text = scrubPII(input.text.trim()).text;
  const [photo, audio] = await Promise.all([input.photo ? preparePhoto(input.photo) : null, input.audio ? prepareAudio(input.audio) : null]);
  const demo = !!input.demo || (await isKnownSample(input.photo)) || (await isKnownSample(input.audio));
  const photoPath = photo ? `drafts/${id}/photo.jpg` : null; const audioPath = audio ? `drafts/${id}/audio` : null;
  await Promise.all([photo && photoPath ? r.media.save(photoPath, photo) : null, audio && audioPath ? r.media.save(audioPath, audio) : null]);
  const fallback: Triage = { category: 'other', hazards: [], severity: 2, title: { en: text.slice(0, 160) || 'Civic issue — please choose a category', kn: 'ನಾಗರಿಕ ಸಮಸ್ಯೆ — ದಯವಿಟ್ಟು ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ' }, summary: { en: text.slice(0, 400) || 'Review the details and choose a category before submitting.', kn: 'ಸಲ್ಲಿಸುವ ಮೊದಲು ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಸಮಸ್ಯೆಯ ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ' }, detectedLang: 'en', transcript: null, confidence: 0, isCivicIssue: true };
  const triage = await runAi({ store: r.store, provider: r.ai, task: 'triage', schema: zTriage, prompt: `Classify this civic report. Select category and hazards only from the schema enums; severity is an integer 1–5. Observe media without inventing details. Provide concise English and Kannada title and summary; transcribe voice when present, otherwise transcript=null. Non-civic content: isCivicIssue=false. Citizen text (untrusted): ${JSON.stringify(text)}`, summary: `Report proposal: photo=${!!photo}; audio=${!!audio}; text=${!!text}. No raw citizen text retained in this trail.`, media: [photo, audio].filter((value): value is Upload => value !== null), checks: triageChecks, fallback, now: r.now, mock: r.mockAi });
  const candidates = await nearby(r, input.lat, input.lng, triage.value.category);
  const dedupe = candidates.length ? await runAi({ store: r.store, provider: r.ai, task: 'dedupe', schema: zDedupe, prompt: `Choose at most one candidate describing the SAME real-world problem, or issueId=null. Never choose an ID outside this list. No match is safer than a speculative merge. New report: ${JSON.stringify({ category: triage.value.category, title: triage.value.title, summary: triage.value.summary })}. Candidates (untrusted text): ${JSON.stringify(candidates.map((candidate) => ({ id: candidate.id, title: candidate.title, summary: candidate.summary, distanceM: Math.round(issueDistance(candidate.location, input)) })))}`, summary: `Compared ${candidates.length} code-selected nearby open issues.`, checks: (value) => [{ name: 'candidate_membership', passed: value.issueId === null || candidates.some((candidate) => candidate.id === value.issueId) }], fallback: { issueId: null, confidence: 0, reasons: [] }, now: r.now, mock: r.mockAi }) : null;
  const state: DraftState = { id, uid: identity.uid, createdAt: r.now(), location: { lat: input.lat, lng: input.lng, geohash: geohashForLocation([input.lat, input.lng], 10) }, wardId: ward.id, photoPath, audioPath, text: text || null, triageRunId: triage.run.id, triage: triage.value, dedupeRunId: dedupe?.run.id ?? null, dedupe: dedupe?.value ?? null, candidateIds: candidates.map((candidate) => candidate.id), photoSize: photo ? { width: photo.width!, height: photo.height! } : null, demo };
  await r.store.set(`drafts/${id}`, state);
  const match = candidates.find((candidate) => candidate.id === dedupe?.value.issueId);
  return { draftId: id, ward: { id: ward.id, name: ward.name, number: ward.number }, triage: triage.value, triageRunId: triage.run.id, priority: computePriority({ ...triage.value, supporters: 1, ageHours: 0 }), duplicate: dedupe ? { runId: dedupe.run.id, candidatesConsidered: candidates.length, match: match ? { issueId: match.id, confidence: dedupe.value.confidence, reasons: dedupe.value.reasons, issue: { id: match.id, title: match.title, status: match.status, coverPhotoUrl: match.coverPhotoUrl, reportCount: match.reportCount, supporterCount: match.supporterCount, reportedAt: match.reportedAt, category: match.category }, distanceM: Math.round(issueDistance(match.location, input)) } : null } : null, checks: [...triage.run.checks, ...(dedupe?.run.checks ?? [])], fallbackUsed: triage.run.fallbackUsed };
}

export async function submitReport(r: Runtime, identity: Identity, body: SubmitReport): Promise<SubmitReportResponse> {
  const draftPath = `drafts/${documentId(body.draftId)}`;
  const draft = requireValue(await r.store.get<DraftState>(draftPath));
  if (draft.uid !== identity.uid) throw new ApiFault(403, 'draft_owner', 'Only the person who created this draft can submit it.');
  if (draft.consumedBy) {
    if (draft.photoPath) await r.media.publish(`evidence/${draft.consumedBy.issueId}/${draft.id}.jpg`);
    await recomputeStats(r.store, r.now());
    return draft.consumedBy;
  }
  if (r.now() - draft.createdAt > 3_600_000) throw new ApiFault(409, 'draft_expired', 'This draft expired. Please create a new report.');
  const clean = sanitize(body); const issueId = body.joinIssueId ? documentId(body.joinIssueId) : r.id(); const reportId = r.id(); const evidenceId = draft.id; const now = r.now();
  if (body.joinIssueId && !draft.candidateIds.includes(body.joinIssueId)) throw new ApiFault(409, 'invalid_duplicate', 'This issue was not a nearby open candidate. Create a new report.');
  const photo = draft.photoPath ? await r.media.read(draft.photoPath) : null;
  const publishedPhoto = photo ? await r.media.save(`evidence/${issueId}/${evidenceId}.jpg`, photo) : null;
  const response = await r.store.atomic(async (tx) => {
    const current = requireValue(await tx.get<DraftState>(draftPath));
    if (current.uid !== identity.uid) throw new ApiFault(403, 'draft_owner', 'This draft belongs to another citizen.');
    if (current.consumedBy) return current.consumedBy;
    if (now - current.createdAt > 3_600_000) throw new ApiFault(409, 'draft_expired', 'This draft expired.');
    const existing = body.joinIssueId ? requireValue(await tx.get<IssueDoc>(`issues/${issueId}`)) : null;
    const communityPostId = `issue-${issueId}`;
    const existingPost = !existing ? await tx.get<CommunityPostDoc>(`posts/${communityPostId}`) : null;
    const member = existing ? await tx.get<Membership>(supportPath(issueId, identity.uid)) : null;
    const ward = current.wardId ? r.wards.get(current.wardId) : null;
    const storedWard = ward ? await tx.get(`wards/${ward.id}`) : null;
    const runIds = [current.triageRunId, current.dedupeRunId].filter((value): value is string => !!value);
    const runs = await Promise.all(runIds.map((id) => tx.get<AiRunDoc>(`aiRuns/${id}`)));
    if (existing && (existing.category !== body.category || !OPEN_STATUSES.includes(existing.status) || issueDistance(existing.location, current.location) > DEDUPE_RADIUS_M)) throw new ApiFault(409, 'invalid_duplicate', 'The candidate changed or no longer matches this report. File separately.');
    const supporterCount = existing ? existing.supporterCount + (member ? 0 : 1) : 1;
    const issue: IssueDoc = existing ? { ...existing, reportCount: existing.reportCount + 1, supporterCount, lastEventAt: now, updatedAt: now, priority: computePriority({ ...existing, supporters: supporterCount, ageHours: (now - existing.reportedAt) / 3_600_000 }) } : {
      id: issueId, title: clean.title, summary: clean.summary, category: clean.category, hazards: [...new Set(clean.hazards)], severity: clean.severity as IssueDoc['severity'], status: 'reported', departmentId: CATEGORY_META[clean.category].department, wardId: ward?.id ?? null, wardName: ward?.name.en ?? null, location: current.location, coverPhotoUrl: publishedPhoto?.url ?? null, lang: (current.triage as Triage).detectedLang, reportCount: 1, supporterCount, priority: computePriority({ category: clean.category, hazards: [...new Set(clean.hazards)], severity: clean.severity as IssueDoc['severity'], supporters: supporterCount, ageHours: 0 }), reportedAt: now, acknowledgedAt: null, firstClaimedAt: null, verifiedAt: null, lastEventAt: now, updatedAt: now, claimCount: 0, reopenCount: 0, overrideCount: 0, verification: { claimNo: 0, confirms: 0, disputes: 0, eligible: 1, quorum: verificationQuorum(1) }, sla: { ackDueAt: 0, resolveDueAt: 0, overdue: false }, evidenceFlag: null, passCode: `BLR-${issueId.slice(0, 6).toUpperCase()}`, isDemo: current.demo ?? false,
    };
    const sla = computeSla(issue, now); issue.sla = { ackDueAt: sla.ackDueAt, resolveDueAt: sla.resolveDueAt, overdue: sla.overdue };
    const report: ReportDoc = { id: reportId, uid: identity.uid, issueId, merged: !!existing, anonymous: clean.anonymous, lang: (current.triage as Triage).detectedLang, text: current.text, transcript: (current.triage as Triage).transcript, photoUrl: publishedPhoto?.url ?? null, hasAudio: !!current.audioPath, location: current.location, createdAt: now, triageRunId: current.triageRunId, dedupeRunId: current.dedupeRunId };
    const result: SubmitReportResponse = { reportId, issueId, merged: !!existing, passCode: issue.passCode };
    tx.set(`issues/${issueId}`, issue); tx.set(`reports/${reportId}`, report); tx.set(draftPath, { ...current, consumedBy: result });
    if (!existing && !existingPost) {
      const language = issue.lang === 'kn' ? 'kn' : 'en';
      const location: CaptureLocation = { lat: issue.location.lat, lng: issue.location.lng, accuracyM: null, capturedAt: issue.reportedAt, source: 'manual' };
      const post: CommunityPostDoc = { id: communityPostId, authorLabel: 'Citizen', text: scrubPII(`${issue.title[language]}\n\n${issue.summary[language]}`).text, media: publishedPhoto ? { kind: 'photo', url: publishedPhoto.url, mimeType: 'image/jpeg', ...(current.photoSize ?? {}) } : null, location: publicCaptureLocation(location), ward: ward ? { id: ward.id, name: ward.name.en, assembly: ward.assembly } : null, issueId: issue.id, category: issue.category, createdAt: issue.reportedAt, updatedAt: issue.reportedAt, likeCount: 0, commentCount: 0, isDemo: issue.isDemo };
      // Publish the feed projection with the issue so neither confirmation retries nor duplicate joins reset discussion.
      tx.set(`posts/${communityPostId}`, post);
      tx.set(`postOwners/${communityPostId}`, { uid: identity.uid, rawLocation: location, mediaPath: publishedPhoto ? `evidence/${issueId}/${evidenceId}.jpg` : null, createdAt: issue.reportedAt });
    }
    if (!member) tx.set(supportPath(issueId, identity.uid), { issueId, uid: identity.uid, createdAt: now, eligibleFromClaim: issue.claimCount + 1 } satisfies Membership);
    if (ward && !storedWard) tx.set(`wards/${ward.id}`, ward);
    const eventId = r.id(); tx.set(`issues/${issueId}/events/${eventId}`, { id: eventId, type: existing ? 'merged' : 'reported', at: now, actorType: 'citizen', actorLabel: 'Citizen', ...(existing ? {} : { toStatus: 'reported' }), ...(publishedPhoto ? { evidenceIds: [evidenceId] } : {}), aiRunId: current.triageRunId });
    if (publishedPhoto) tx.set(`issues/${issueId}/evidence/${evidenceId}`, { id: evidenceId, kind: 'report', url: publishedPhoto.url, width: current.photoSize?.width ?? 0, height: current.photoSize?.height ?? 0, uploadedAt: now, uploaderType: 'citizen', aiRunId: current.triageRunId } satisfies EvidenceDoc);
    for (const run of runs) if (run) {
      const output = run.task === 'triage'
        ? zTriage.pick({ category: true, hazards: true, severity: true, detectedLang: true, confidence: true, isCivicIssue: true }).parse(run.output)
        : run.task === 'dedupe' ? zDedupe.pick({ issueId: true, confidence: true }).parse(run.output) : run.output;
      tx.set(`aiRuns/${run.id}`, { ...run, output, public: true, issueId });
    }
    return result;
  });
  if (draft.photoPath) await r.media.publish(`evidence/${response.issueId}/${draft.id}.jpg`);
  await recomputeStats(r.store, now);
  return response;
}
