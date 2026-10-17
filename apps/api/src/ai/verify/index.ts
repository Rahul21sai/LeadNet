import { z } from 'zod';
import { isKannada, scrubPII, zTriage, type Triage, type VerifierCheck } from '@leadnet/shared';

export const zDedupe = z.object({ issueId: z.string().nullable(), confidence: z.number().min(0).max(1), reasons: z.array(z.string().max(240)).max(4) });
export const zEvidence = z.object({ sameLocation: z.boolean(), sameLocationConfidence: z.number().min(0).max(1), defectResolved: z.boolean(), defectResolvedConfidence: z.number().min(0).max(1), afterPhotoQuality: z.enum(['good', 'blurry', 'dark', 'unrelated']), notes: z.string().max(600) });
export const FACT_KEYS = ['reports', 'issues', 'duplicatesMerged', 'open', 'overdue', 'medianAckHours', 'claimed', 'verified', 'awaitingCheck', 'verifiedRate', 'unverifiedClaims', 'reopenRate', 'overrides', 'medianDaysToVerified'] as const;
export const zFactSelection = z.object({ factKeys: z.array(z.enum(FACT_KEYS)).min(1).max(6) }).strict();
export { zTriage };

export function sanitize<T>(value: T): T {
  if (typeof value === 'string') return scrubPII(value).text as T;
  if (Array.isArray(value)) return value.map((item) => sanitize(item)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)])) as T;
  return value;
}

export function triageChecks(value: Triage): VerifierCheck[] {
  return [
    { name: 'kannada_title', passed: isKannada(value.title.kn) },
    { name: 'kannada_summary', passed: isKannada(value.summary.kn) },
    { name: 'distinct_hazards', passed: new Set(value.hazards).size === value.hazards.length },
  ];
}

export function factSelectionChecks(value: z.infer<typeof zFactSelection>): VerifierCheck[] {
  return [{ name: 'distinct_fact_ids', passed: new Set(value.factKeys).size === value.factKeys.length }];
}
