import { canTransition, computeLedger, computePriority, computeSla, evidenceGate, METRIC_DEFINITIONS, OPEN_STATUSES, scrubPII, verificationOutcome, verificationQuorum, type EvidenceDoc, type IssueDoc, type QueueItem, type ResolutionResponse, type Role, type SupportResponse, type UserDoc, type VerifyResponse } from '@leadnet/shared';
import type { Identity } from './firebase.ts';
import type { Runtime } from './context.ts';
import { ApiFault, documentId, requireValue } from './errors.ts';
import { preparePhoto, type Upload } from './media.ts';
import { runAi } from '../ai/runner.ts';
import { FACT_KEYS, factSelectionChecks, zFactSelection, zEvidence } from '../ai/verify/index.ts';
import { recomputeStats } from './ledger.ts';
import { supportPath, type Membership } from './reports.ts';
import { env } from '../env.ts';
import { z } from 'zod';
import { createHash } from 'node:crypto';

type ResolutionEvidence = EvidenceDoc & { requestHash?: string };

function staff(identity: Identity, issue: Pick<IssueDoc, 'wardId'>) {
  if (!(['officer', 'moderator', 'admin'] as Role[]).includes(identity.role)) throw new ApiFault(403, 'officer_required', 'Only a ward officer can perform this action.');
  if (identity.role !== 'admin' && (!issue.wardId || !identity.wardIds.includes(issue.wardId))) throw new ApiFault(403, 'ward_scope', 'This issue is outside your assigned ward.');
}

function update(issue: IssueDoc, now: number): IssueDoc {
  const sla = computeSla(issue, now);
  return { ...issue, updatedAt: now, lastEventAt: now, sla: { ackDueAt: sla.ackDueAt, resolveDueAt: sla.resolveDueAt, overdue: sla.overdue }, priority: computePriority({ ...issue, supporters: issue.supporterCount, ageHours: (now - issue.reportedAt) / 3_600_000 }) };
}

export async function supportIssue(r: Runtime, identity: Identity, id: string): Promise<SupportResponse> {
  const issueId = documentId(id); const now = r.now();
  const result = await r.store.atomic(async (tx) => {
    const issue = requireValue(await tx.get<IssueDoc>(`issues/${issueId}`));
    const membership = await tx.get<Membership>(supportPath(issueId, identity.uid));
    if (membership) return { supporterCount: issue.supporterCount, alreadySupported: true };
    if (!OPEN_STATUSES.includes(issue.status)) throw new ApiFault(409, 'issue_closed', 'This issue is no longer open for support.');
    const next = update({ ...issue, supporterCount: issue.supporterCount + 1 }, now);
    tx.set(supportPath(issueId, identity.uid), { issueId, uid: identity.uid, createdAt: now, eligibleFromClaim: issue.claimCount + 1 } satisfies Membership);
    tx.set(`issues/${issueId}`, next);
    const eventId = r.id(); tx.set(`issues/${issueId}/events/${eventId}`, { id: eventId, type: 'supported', at: now, actorType: 'citizen', actorLabel: 'Citizen' });
    return { supporterCount: next.supporterCount, alreadySupported: false };
  });
  await recomputeStats(r.store, now); return result;
}

export async function transitionIssue(r: Runtime, identity: Identity, id: string, to: 'acknowledged' | 'in_progress' | 'rejected', note?: string) {
  const issueId = documentId(id); const now = r.now();
  const issue = await r.store.atomic(async (tx) => {
    const current = requireValue(await tx.get<IssueDoc>(`issues/${issueId}`)); staff(identity, current);
    const rule = canTransition(current.status, to, identity.role);
    if (!rule) throw new ApiFault(409, 'invalid_transition', 'This status change is not allowed.');
    if (rule.requires === 'note' && !note?.trim()) throw new ApiFault(400, 'note_required', 'A reason is required for this action.');
    const next = update({ ...current, status: to, acknowledgedAt: to === 'acknowledged' ? current.acknowledgedAt ?? now : current.acknowledgedAt }, now);
    const eventId = r.id(); tx.set(`issues/${issueId}/events/${eventId}`, { id: eventId, type: to === 'acknowledged' ? 'acknowledged' : to === 'in_progress' ? 'started' : 'rejected', at: now, actorType: 'officer', actorLabel: `Ward officer, ${current.wardName ?? 'assigned ward'}`, fromStatus: current.status, toStatus: to, ...(note?.trim() ? { note: scrubPII(note.trim()).text } : {}) });
    tx.set(`issues/${issueId}`, next);
    return next;
  });
  await recomputeStats(r.store, now); return { issue };
}

export async function officerQueue(r: Runtime, identity: Identity, wardId?: string): Promise<QueueItem[]> {
  if (!['officer', 'admin'].includes(identity.role)) throw new ApiFault(403, 'officer_required', 'Switch to a demo officer to view this queue.');
  if (wardId && identity.role !== 'admin' && !identity.wardIds.includes(wardId)) throw new ApiFault(403, 'ward_scope', 'This ward is outside your assignment.');
  const issues = await r.store.list<IssueDoc>('issues'); const now = r.now();
  return issues.filter((issue) => OPEN_STATUSES.includes(issue.status) && (!wardId || issue.wardId === wardId) && (identity.role === 'admin' || (!!issue.wardId && identity.wardIds.includes(issue.wardId))))
    .map((issue) => ({ issue: { ...update(issue, now), updatedAt: issue.updatedAt, lastEventAt: issue.lastEventAt }, hoursToNextDeadline: computeSla(issue, now).hoursToNextDeadline }))
    .sort((a, b) => b.issue.priority.score - a.issue.priority.score || a.issue.reportedAt - b.issue.reportedAt);
}

export async function resolveIssue(r: Runtime, identity: Identity, id: string, input: { photo: File; note?: string; override?: boolean; overrideReason?: string }): Promise<ResolutionResponse> {
  const issueId = documentId(id); const issue = requireValue(await r.store.get<IssueDoc>(`issues/${issueId}`)); staff(identity, issue);
  if ((input.note?.length ?? 0) > 500 || (input.overrideReason?.length ?? 0) > 500) throw new ApiFault(400, 'note_too_long', 'Keep notes within 500 characters.');
  if (input.override && (input.overrideReason?.trim().length ?? 0) < 12) throw new ApiFault(400, 'override_reason_required', 'Explain the evidence override in at least 12 characters.');
  const photo = await preparePhoto(input.photo); const evidenceId = r.id(); const now = r.now();
  const evidenceDocs = await r.store.list<ResolutionEvidence>(`issues/${issueId}/evidence`);
  const hash = (fromStatus: IssueDoc['status'], claimNo: number) => createHash('sha256').update(photo.bytes).update(JSON.stringify({ fromStatus, claimNo, note: scrubPII(input.note?.trim() ?? '').text, override: !!input.override, overrideReason: scrubPII(input.overrideReason?.trim() ?? '').text })).digest('hex');
  const requestHash = hash(issue.status, issue.claimCount);
  const receipt = evidenceDocs.find((entry) => {
    if (entry.kind !== 'resolution' || !entry.requestHash || !entry.gate || !entry.observation || !entry.aiRunId) return false;
    if (entry.claimNo === undefined) return entry.requestHash === requestHash;
    return ['resolved_pending_verification', 'verified'].includes(issue.status) && entry.claimNo === issue.claimCount && (['acknowledged', 'in_progress', 'reopened'] as const).some((status) => entry.requestHash === hash(status, issue.claimCount - 1));
  });
  if (receipt?.observation && receipt.gate && receipt.aiRunId) {
    await r.media.publish(`evidence/${issueId}/${receipt.id}.jpg`);
    await recomputeStats(r.store, now);
    return { evidenceId: receipt.id, gate: receipt.gate, observation: { sameLocation: receipt.observation.sameLocation, defectResolved: receipt.observation.defectResolved, notes: receipt.observation.notes, afterPhotoQuality: receipt.observation.afterPhotoQuality }, advanced: receipt.claimNo !== undefined, aiRunId: receipt.aiRunId };
  }
  if (!canTransition(issue.status, 'resolved_pending_verification', identity.role)) throw new ApiFault(409, 'invalid_transition', 'Acknowledge or start work before submitting a fix.');
  const beforeDocs = evidenceDocs.filter((entry) => entry.kind === 'report').slice(0, 3);
  const before = (await Promise.all(beforeDocs.map(async (entry) => { try { return await r.media.read(`evidence/${issueId}/${entry.id}.jpg`); } catch { return null; } }))).filter((entry): entry is Upload => entry !== null);
  const fallback = { sameLocation: false, sameLocationConfidence: 0, defectResolved: false, defectResolvedConfidence: 0, afterPhotoQuality: 'unrelated' as const, notes: 'Comparison unavailable. Hold for human review.' };
  const observed = await runAi({ store: r.store, provider: r.ai, task: 'evidence', schema: zEvidence, prompt: `Compare report BEFORE photos (first ${before.length} images) with the AFTER photo (last image). Describe only visual observations. Is it the same location? Is the reported ${issue.category} defect resolved? Return calibrated confidences, photo quality, and short notes. Do not choose a status or gate decision.`, summary: `Before photos=${before.length}; after photo=1; category=${issue.category}.`, media: [...before, photo], checks: () => [{ name: 'before_evidence_available', passed: before.length > 0 }], fallback, fallbackChecks: (value) => [{ name: 'conservative_hold', passed: evidenceGate(value).decision === 'hold' }], now: r.now, mock: r.mockAi || before.length === 0, issueId });
  const gate = evidenceGate(observed.value); const advanced = gate.decision === 'pass' || !!input.override;
  const published = await r.media.save(`evidence/${issueId}/${evidenceId}.jpg`, photo);
  await r.store.atomic(async (tx) => {
    const current = requireValue(await tx.get<IssueDoc>(`issues/${issueId}`)); staff(identity, current);
    const members = await tx.list<Membership>('supports', [{ field: 'issueId', op: '==', value: issueId }]);
    if (current.claimCount !== issue.claimCount || !canTransition(current.status, 'resolved_pending_verification', identity.role)) throw new ApiFault(409, 'issue_changed', 'The issue changed while evidence was being checked. Reload and try again.');
    const claimNo = current.claimCount + (advanced ? 1 : 0);
    const eligible = members.filter((member) => (member.eligibleFromClaim ?? 1) <= claimNo).length;
    const next = update({ ...current, ...(advanced ? { status: 'resolved_pending_verification' as const, firstClaimedAt: current.firstClaimedAt ?? now, verifiedAt: null, claimCount: claimNo, verification: { claimNo, confirms: 0, disputes: 0, eligible, quorum: verificationQuorum(eligible) } } : {}), overrideCount: current.overrideCount + (gate.decision === 'hold' && input.override ? 1 : 0), evidenceFlag: gate.decision === 'hold' ? { ...gate, overridden: !!input.override, ...(input.overrideReason ? { note: scrubPII(input.overrideReason.trim()).text } : {}) } : null }, now);
    tx.set(`issues/${issueId}`, next);
    tx.set(`issues/${issueId}/evidence/${evidenceId}`, { id: evidenceId, kind: 'resolution', url: published.url, width: photo.width!, height: photo.height!, uploadedAt: now, uploaderType: 'officer', ...(advanced ? { claimNo } : {}), observation: observed.value, gate, aiRunId: observed.run.id, requestHash } satisfies ResolutionEvidence);
    tx.set(`aiRuns/${observed.run.id}`, { ...observed.run, public: true, issueId });
    const eventId = r.id(); tx.set(`issues/${issueId}/events/${eventId}`, { id: eventId, type: advanced ? 'resolution_submitted' : 'evidence_flagged', at: now, actorType: 'officer', actorLabel: `Ward officer, ${current.wardName ?? 'assigned ward'}`, fromStatus: current.status, toStatus: next.status, evidenceIds: [evidenceId], aiRunId: observed.run.id, ...(input.note ? { note: scrubPII(input.note.trim()).text } : {}), meta: { override: !!input.override, gate: gate.decision } });
  });
  await r.media.publish(`evidence/${issueId}/${evidenceId}.jpg`);
  await recomputeStats(r.store, now);
  return { evidenceId, gate, observation: { sameLocation: observed.value.sameLocation, defectResolved: observed.value.defectResolved, notes: observed.value.notes, afterPhotoQuality: observed.value.afterPhotoQuality }, advanced, aiRunId: observed.run.id };
}

export async function verifyIssue(r: Runtime, identity: Identity, id: string, input: { vote: 'confirm' | 'dispute'; note?: string; photo?: File }): Promise<VerifyResponse> {
  const issueId = documentId(id); const now = r.now();
  const current = requireValue(await r.store.get<IssueDoc>(`issues/${issueId}`));
  const member = await r.store.get<Membership>(supportPath(issueId, identity.uid));
  if (!member || (member.eligibleFromClaim ?? 1) > current.verification.claimNo) throw new ApiFault(403, 'not_eligible', 'Only citizens who reported or supported this issue before the fix claim can verify it.');
  if ((input.note?.length ?? 0) > 500) throw new ApiFault(400, 'note_too_long', 'Keep notes within 500 characters.');
  const photo = input.photo ? await preparePhoto(input.photo) : null; const evidenceId = r.id();
  const published = photo ? await r.media.save(`evidence/${issueId}/${evidenceId}.jpg`, photo) : null;
  const result = await r.store.atomic(async (tx) => {
    const issue = requireValue(await tx.get<IssueDoc>(`issues/${issueId}`));
    const membership = await tx.get<Membership>(supportPath(issueId, identity.uid));
    const votePath = `votes/${issueId}_${issue.verification.claimNo}_${encodeURIComponent(identity.uid)}`;
    const previous = await tx.get<{ vote: string }>(votePath);
    if (issue.verification.claimNo !== current.verification.claimNo) throw new ApiFault(409, 'claim_changed', 'A new fix claim was submitted. Reload before voting.');
    if (!membership || (membership.eligibleFromClaim ?? 1) > issue.verification.claimNo) throw new ApiFault(403, 'not_eligible', 'You are not eligible to verify this claim.');
    if (!['resolved_pending_verification', 'verified', 'reopened'].includes(issue.status) || !issue.verification.claimNo) throw new ApiFault(409, 'no_fix_claim', 'There is no fix claim awaiting verification.');
    const tally = { confirms: issue.verification.confirms, disputes: issue.verification.disputes, eligible: issue.verification.eligible };
    if (previous) return { outcome: verificationOutcome(tally), confirms: tally.confirms, disputes: tally.disputes, quorum: issue.verification.quorum };
    if (issue.status === 'reopened') throw new ApiFault(409, 'claim_reopened', 'This fix claim has already been disputed and reopened.');
    if (input.vote === 'confirm') tally.confirms++; else tally.disputes++;
    const outcome = verificationOutcome(tally);
    const transition = outcome !== 'pending' && outcome !== issue.status ? canTransition(issue.status, outcome, 'system') : null;
    if (outcome !== 'pending' && outcome !== issue.status && !transition) throw new ApiFault(409, 'invalid_verification', 'This verification cannot change the issue status.');
    const next = update({ ...issue, verification: { ...issue.verification, ...tally }, ...(transition ? { status: outcome as 'verified' | 'reopened', verifiedAt: outcome === 'verified' ? now : null, reopenCount: issue.reopenCount + (outcome === 'reopened' ? 1 : 0) } : {}) }, now);
    tx.set(votePath, { issueId, uid: identity.uid, claimNo: issue.verification.claimNo, vote: input.vote, createdAt: now, ...(published ? { evidenceId } : {}) });
    tx.set(`issues/${issueId}`, next);
    const eventId = r.id(); tx.set(`issues/${issueId}/events/${eventId}`, { id: eventId, type: input.vote === 'confirm' ? 'comment' : 'disputed', at: now, actorType: 'citizen', actorLabel: 'Citizen', note: scrubPII(input.note?.trim() || (input.vote === 'confirm' ? 'Confirmed the fix.' : 'Reported the problem is still present.')).text, ...(published ? { evidenceIds: [evidenceId] } : {}) });
    if (transition) { const systemId = r.id(); tx.set(`issues/${issueId}/events/${systemId}`, { id: systemId, type: outcome, at: now, actorType: 'system', actorLabel: 'Citizen verification quorum', fromStatus: issue.status, toStatus: next.status, meta: { confirms: tally.confirms, disputes: tally.disputes, quorum: issue.verification.quorum } }); }
    if (published && photo) tx.set(`issues/${issueId}/evidence/${evidenceId}`, { id: evidenceId, kind: 'verification', url: published.url, width: photo.width!, height: photo.height!, uploadedAt: now, uploaderType: 'citizen', claimNo: issue.verification.claimNo } satisfies EvidenceDoc);
    return { outcome, confirms: tally.confirms, disputes: tally.disputes, quorum: issue.verification.quorum };
  });
  const canonicalVote = await r.store.get<{ evidenceId?: string }>(`votes/${issueId}_${current.verification.claimNo}_${encodeURIComponent(identity.uid)}`);
  if (canonicalVote?.evidenceId && await r.store.get<EvidenceDoc>(`issues/${issueId}/evidence/${canonicalVote.evidenceId}`)) await r.media.publish(`evidence/${issueId}/${canonicalVote.evidenceId}.jpg`);
  await recomputeStats(r.store, now); return result;
}

export async function followIssue(r: Runtime, identity: Identity, id: string, following: boolean) {
  const issueId = documentId(id);
  await r.store.atomic(async (tx) => {
    requireValue(await tx.get<IssueDoc>(`issues/${issueId}`));
    const existing = await tx.get<UserDoc>(`users/${identity.uid}`);
    const followed = new Set(existing?.followedIssueIds ?? []);
    if (following && !followed.has(issueId) && followed.size >= 200) throw new ApiFault(400, 'follow_limit', 'You can follow up to 200 issues.');
    if (following) followed.add(issueId); else followed.delete(issueId);
    const profile: UserDoc = { ...(existing ?? { uid: identity.uid, role: identity.role, wardIds: identity.wardIds, createdAt: r.now() }), followedIssueIds: [...followed] };
    tx.set(`users/${identity.uid}`, profile);
  });
  return { following };
}

export async function demoRole(r: Runtime, identity: Identity, role: 'citizen' | 'officer', wardId?: string) {
  if (!env.demoMode) throw new ApiFault(403, 'demo_disabled', 'The demo role switch is disabled.');
  if (identity.role === 'admin' || identity.role === 'moderator') throw new ApiFault(403, 'protected_role', 'Administrative accounts cannot use the demo role switch.');
  if (role === 'officer' && (!wardId || !r.wards.get(wardId))) throw new ApiFault(400, 'ward_required', 'Choose a valid demo ward.');
  const wardIds = role === 'officer' ? [wardId!] : [];
  await r.auth.setRole(identity.uid, role, wardIds);
  await r.store.atomic(async (tx) => {
    const previous = await tx.get<UserDoc>(`users/${identity.uid}`);
    tx.set(`users/${identity.uid}`, { ...previous, uid: identity.uid, role, wardIds, createdAt: previous?.createdAt ?? r.now(), demoOfficer: role === 'officer' } satisfies UserDoc);
  });
  return { role, wardIds, demo: true };
}

export async function askLeadNet(r: Runtime, question: string, wardId?: string) {
  if (wardId && !r.wards.get(wardId)) throw new ApiFault(400, 'invalid_ward', 'Choose a valid ward.');
  const issues = await r.store.list<IssueDoc>('issues');
  const ledger = computeLedger(wardId ? issues.filter((issue) => issue.wardId === wardId) : issues, r.now());
  const facts = Object.fromEntries(Object.entries(ledger).map(([key, metric]) => [key, metric.value])) as Record<string, number | null>;
  const fallback: z.infer<typeof zFactSelection> = { factKeys: ['issues', 'reports', 'claimed', 'verified'] };
  const descriptions = Object.fromEntries(FACT_KEYS.map((key) => [key, { label: METRIC_DEFINITIONS[key].en, definition: METRIC_DEFINITIONS[key].definition }]));
  const result = await runAi({ store: r.store, provider: r.ai, task: 'brief', schema: zFactSelection, prompt: `Select and order up to six DISTINCT fact IDs that best answer the citizen question. Return factKeys only, with no prose, quantities, labels, or invented IDs. Code renders every fact with its own fixed bilingual label, value, unit, and sample size. If unsupported, select the general overview issues/reports/claimed/verified. Question (untrusted): ${JSON.stringify(scrubPII(question).text)}. Allowed facts: ${JSON.stringify(descriptions)}.`, summary: `Ledger fact selection; scope=${wardId ? 'one ward' : 'city'}; ${issues.length} issue records considered.`, checks: factSelectionChecks, fallback, now: r.now, mock: r.mockAi });
  const answer = { en: '', kn: '' };
  for (const key of result.value.factKeys) {
    const metric = ledger[key]; const definition = METRIC_DEFINITIONS[key];
    facts[`${key}_n`] = metric.n;
    const unit = definition.unit ? ` ${definition.unit}` : '';
    answer.en += `${definition.en}: ${metric.value === null ? 'No data' : `${metric.value}${unit}`} (sample size ${metric.n}). `;
    answer.kn += `${definition.kn}: ${metric.value === null ? 'ದತ್ತಾಂಶವಿಲ್ಲ' : `${metric.value}${unit}`} (ಮಾದರಿ ಸಂಖ್ಯೆ ${metric.n}). `;
  }
  return { answer: { en: answer.en.trim(), kn: answer.kn.trim() }, facts, checks: result.run.checks, fallbackUsed: result.run.fallbackUsed };
}
