/**
 * Two deterministic gates sit between an official's claim and a "verified" fix.
 *
 * 1. Evidence gate — Gemini *observes* the before/after photos; this code decides
 *    whether the claim proceeds to citizen verification or is held for review.
 * 2. Citizen quorum — only people who reported or supported the issue can vote.
 *    Silence is never treated as confirmation; nothing auto-closes.
 */

export interface EvidenceObservation {
  sameLocation: boolean;
  sameLocationConfidence: number;
  defectResolved: boolean;
  defectResolvedConfidence: number;
  afterPhotoQuality: 'good' | 'blurry' | 'dark' | 'unrelated';
}

export const EVIDENCE_HOLD_CONFIDENCE = 0.6;

export type EvidenceGateReason = 'different_location' | 'defect_still_visible' | 'unusable_photo';

export interface EvidenceGateResult {
  decision: 'pass' | 'hold';
  reasons: EvidenceGateReason[];
}

export function evidenceGate(o: EvidenceObservation): EvidenceGateResult {
  const reasons: EvidenceGateReason[] = [];
  if (!o.sameLocation && o.sameLocationConfidence >= EVIDENCE_HOLD_CONFIDENCE) reasons.push('different_location');
  if (!o.defectResolved && o.defectResolvedConfidence >= EVIDENCE_HOLD_CONFIDENCE) reasons.push('defect_still_visible');
  if (o.afterPhotoQuality === 'unrelated' || o.afterPhotoQuality === 'dark') reasons.push('unusable_photo');
  return { decision: reasons.length ? 'hold' : 'pass', reasons };
}

export const EVIDENCE_REASON_TEXT: Record<EvidenceGateReason, { en: string; kn: string }> = {
  different_location: { en: 'Photo appears to be a different location', kn: 'ಫೋಟೋ ಬೇರೆ ಸ್ಥಳದಂತೆ ಕಾಣುತ್ತದೆ' },
  defect_still_visible: { en: 'Problem still visible in the photo', kn: 'ಸಮಸ್ಯೆ ಇನ್ನೂ ಫೋಟೋದಲ್ಲಿ ಕಾಣುತ್ತಿದೆ' },
  unusable_photo: { en: 'Photo is unusable as evidence', kn: 'ಫೋಟೋ ಸಾಕ್ಷ್ಯವಾಗಿ ಬಳಸಲು ಯೋಗ್ಯವಿಲ್ಲ' },
};

export interface VerificationTally {
  confirms: number;
  disputes: number;
  /** Distinct citizens who reported or supported the issue. */
  eligible: number;
}

/** Votes needed: 2, or fewer when fewer people are eligible (min 1). */
export function verificationQuorum(eligible: number): number {
  return Math.min(2, Math.max(1, eligible));
}

export type VerificationOutcome = 'verified' | 'reopened' | 'pending';

export function verificationOutcome(t: VerificationTally): VerificationOutcome {
  const q = verificationQuorum(t.eligible);
  if (t.confirms >= q && t.confirms > t.disputes) return 'verified';
  if (t.disputes >= q && t.disputes >= t.confirms) return 'reopened';
  return 'pending';
}
