import type { Role, Status } from './enums.ts';

/**
 * The issue lifecycle is a deterministic state machine. Neither the UI nor
 * Gemini decides what may happen next — this table does. Every transition
 * the API applies is checked against it, and the methodology page renders it.
 */
export interface TransitionRule {
  to: Status;
  /** Roles allowed to request this transition. 'system' = server-side rule. */
  by: ReadonlyArray<Role | 'system'>;
  /** What must be attached for the transition to be accepted. */
  requires?: 'resolution_evidence' | 'verification_votes' | 'note';
}

export const TRANSITIONS: Record<Status, readonly TransitionRule[]> = {
  reported: [
    { to: 'acknowledged', by: ['officer', 'admin'] },
    { to: 'rejected', by: ['moderator', 'admin'], requires: 'note' },
    { to: 'duplicate', by: ['system', 'moderator', 'admin'] },
  ],
  acknowledged: [
    { to: 'in_progress', by: ['officer', 'admin'] },
    { to: 'resolved_pending_verification', by: ['officer', 'admin'], requires: 'resolution_evidence' },
  ],
  in_progress: [
    { to: 'resolved_pending_verification', by: ['officer', 'admin'], requires: 'resolution_evidence' },
  ],
  resolved_pending_verification: [
    { to: 'verified', by: ['system'], requires: 'verification_votes' },
    { to: 'reopened', by: ['system'], requires: 'verification_votes' },
  ],
  reopened: [
    { to: 'acknowledged', by: ['officer', 'admin'] },
    { to: 'in_progress', by: ['officer', 'admin'] },
    { to: 'resolved_pending_verification', by: ['officer', 'admin'], requires: 'resolution_evidence' },
  ],
  verified: [{ to: 'reopened', by: ['system'], requires: 'verification_votes' }],
  rejected: [],
  duplicate: [],
};

export function canTransition(from: Status, to: Status, by: Role | 'system'): TransitionRule | null {
  const rule = TRANSITIONS[from].find((r) => r.to === to);
  if (!rule) return null;
  return rule.by.includes(by) ? rule : null;
}

export function nextStatuses(from: Status, by: Role | 'system'): Status[] {
  return TRANSITIONS[from].filter((r) => r.by.includes(by)).map((r) => r.to);
}

export const STATUS_META: Record<Status, { en: string; kn: string; short: string }> = {
  reported: { en: 'Reported', kn: 'ವರದಿಯಾಗಿದೆ', short: 'Reported' },
  acknowledged: { en: 'Acknowledged', kn: 'ಸ್ವೀಕರಿಸಲಾಗಿದೆ', short: 'Acknowledged' },
  in_progress: { en: 'In progress', kn: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ', short: 'In progress' },
  resolved_pending_verification: { en: 'Fixed — awaiting citizen check', kn: 'ಸರಿಪಡಿಸಲಾಗಿದೆ — ಪರಿಶೀಲನೆ ಬಾಕಿ', short: 'Awaiting check' },
  verified: { en: 'Verified fixed', kn: 'ಪರಿಶೀಲಿಸಿ ದೃಢೀಕರಿಸಲಾಗಿದೆ', short: 'Verified' },
  reopened: { en: 'Reopened', kn: 'ಮರುತೆರೆಯಲಾಗಿದೆ', short: 'Reopened' },
  rejected: { en: 'Rejected', kn: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ', short: 'Rejected' },
  duplicate: { en: 'Merged duplicate', kn: 'ನಕಲು ವಿಲೀನ', short: 'Duplicate' },
};
