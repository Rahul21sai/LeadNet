import { z } from 'zod';
import { CATEGORIES, HAZARDS, LANGS, SEVERITIES } from './enums.ts';
import type { Bilingual, IssueDoc, IssueEventDoc } from './types.ts';
import type { PriorityResult } from './priority.ts';

/**
 * HTTP contract between apps/web and apps/api. Every request body is a zod
 * schema validated on the server; responses are typed with the interfaces below.
 * Base path: /api/v1. Auth: `Authorization: Bearer <Firebase ID token>` on all
 * mutating routes. Errors: `{ error: { code, message } }` with an HTTP status.
 */

export const zLatLng = z.object({
  lat: z.number().min(12.6).max(13.4),
  lng: z.number().min(77.2).max(77.95),
});

export const zBilingual = z.object({ en: z.string().min(1).max(160), kn: z.string().min(1).max(200) });

/** Triage proposal — what Gemini returns for a report (after verification), and what the citizen edits. */
export const zTriage = z.object({
  category: z.enum(CATEGORIES),
  hazards: z.array(z.enum(HAZARDS)).max(4),
  severity: z.union(SEVERITIES.map((s) => z.literal(s)) as unknown as [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]),
  title: zBilingual,
  summary: z.object({ en: z.string().min(1).max(400), kn: z.string().min(1).max(500) }),
  detectedLang: z.enum(LANGS),
  transcript: z.string().max(2000).nullable(),
  confidence: z.number().min(0).max(1),
  isCivicIssue: z.boolean(),
});
export type Triage = z.infer<typeof zTriage>;

/**
 * POST /api/v1/reports/draft  (multipart/form-data)
 *   fields: lat, lng, text? ; files: photo? (image/*, ≤ 8 MB), audio? (audio/*, ≤ 2 MB, ≤ 30 s)
 * At least one of photo / audio / text is required.
 */
export interface DraftResponse {
  draftId: string;
  ward: { id: string; name: Bilingual; number: number | null } | null;
  triage: Triage;
  triageRunId: string;
  /** Deterministic, computed from the triage proposal. */
  priority: PriorityResult;
  /** Present when nearby open issues exist. */
  duplicate: {
    runId: string;
    match: null | {
      issueId: string;
      confidence: number;
      reasons: string[];
      issue: Pick<IssueDoc, 'id' | 'title' | 'status' | 'coverPhotoUrl' | 'reportCount' | 'supporterCount' | 'reportedAt' | 'category'>;
      distanceM: number;
    };
    candidatesConsidered: number;
  } | null;
  /** AI checks that ran, for the "How LeadNet decided" panel. */
  checks: Array<{ name: string; passed: boolean }>;
  fallbackUsed: boolean;
}

/** POST /api/v1/reports — confirm the draft (citizen-edited fields win). */
export const zSubmitReport = z.object({
  draftId: z.string().min(4),
  category: z.enum(CATEGORIES),
  hazards: z.array(z.enum(HAZARDS)).max(4),
  severity: z.number().int().min(1).max(5),
  title: zBilingual,
  summary: z.object({ en: z.string().min(1).max(400), kn: z.string().min(1).max(500) }),
  /** When set, this report joins an existing issue instead of creating one. */
  joinIssueId: z.string().nullable(),
  anonymous: z.boolean(),
});
export type SubmitReport = z.infer<typeof zSubmitReport>;

export interface SubmitReportResponse {
  reportId: string;
  issueId: string;
  merged: boolean;
  passCode: string;
}

/** POST /api/v1/issues/:id/support — one per uid (idempotent). Body: none. */
export interface SupportResponse {
  supporterCount: number;
  alreadySupported: boolean;
}

/** POST /api/v1/issues/:id/transition — officer/admin. JSON body. */
export const zTransition = z.object({
  to: z.enum(['acknowledged', 'in_progress', 'rejected']),
  note: z.string().max(500).optional(),
});

/**
 * POST /api/v1/issues/:id/resolution — officer/admin, multipart/form-data.
 *   files: photo (required) ; fields: note?, override? ("true" to submit despite an evidence flag), overrideReason?
 */
export interface ResolutionResponse {
  evidenceId: string;
  gate: { decision: 'pass' | 'hold'; reasons: string[] };
  observation: { sameLocation: boolean; defectResolved: boolean; notes: string; afterPhotoQuality: string };
  /** True when the issue moved to resolved_pending_verification. */
  advanced: boolean;
  aiRunId: string;
}

/** POST /api/v1/issues/:id/verify — reporters/supporters only. multipart: vote ('confirm'|'dispute'), note?, photo? */
export interface VerifyResponse {
  outcome: 'verified' | 'reopened' | 'pending';
  confirms: number;
  disputes: number;
  quorum: number;
}

/** POST /api/v1/demo/role — switch the signed-in user into a demo role. Body: { role: 'citizen' | 'officer', wardId? } */
export const zDemoRole = z.object({ role: z.enum(['citizen', 'officer']), wardId: z.string().optional() });

/** GET /api/v1/officer/queue?wardId= — open issues for the officer's ward(s), sorted by priority desc. */
export interface QueueItem {
  issue: IssueDoc;
  hoursToNextDeadline: number | null;
}

/** POST /api/v1/ask — grounded Q&A over computed ledger facts. Body: { question, wardId? } */
export const zAsk = z.object({ question: z.string().min(3).max(300), wardId: z.string().optional() });
export interface AskResponse {
  answer: Bilingual;
  /** Facts the answer was allowed to cite; every number in `answer` appears here. */
  facts: Record<string, number | string | null>;
  checks: Array<{ name: string; passed: boolean }>;
  fallbackUsed: boolean;
}

/** GET /api/v1/health */
export interface HealthResponse {
  ok: true;
  version: string;
  region: string;
  model: string;
  time: number;
}

export type TimelineEvent = IssueEventDoc;
