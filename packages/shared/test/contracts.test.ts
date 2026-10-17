import { describe, expect, it } from 'vitest';
import {
  canTransition,
  computeLedger,
  computePriority,
  computeSla,
  evidenceGate,
  extractNumbers,
  isKannada,
  scrubPII,
  verificationOutcome,
  verificationQuorum,
  type IssueFacts,
} from '../src/index.ts';

const HOUR = 3_600_000;

describe('state machine', () => {
  it('lets officers acknowledge a fresh report', () => {
    expect(canTransition('reported', 'acknowledged', 'officer')).not.toBeNull();
  });
  it('never lets anyone but the system mark an issue verified', () => {
    expect(canTransition('resolved_pending_verification', 'verified', 'officer')).toBeNull();
    expect(canTransition('resolved_pending_verification', 'verified', 'admin')).toBeNull();
    expect(canTransition('resolved_pending_verification', 'verified', 'system')).not.toBeNull();
  });
  it('requires resolution evidence to claim a fix', () => {
    expect(canTransition('in_progress', 'resolved_pending_verification', 'officer')?.requires).toBe('resolution_evidence');
  });
  it('treats rejected and duplicate as terminal', () => {
    expect(canTransition('rejected', 'acknowledged', 'admin')).toBeNull();
    expect(canTransition('duplicate', 'reported', 'system')).toBeNull();
  });
});

describe('priority', () => {
  it('is deterministic and bounded', () => {
    const p = computePriority({ category: 'pothole', severity: 5, hazards: ['traffic_risk', 'flooding', 'electrical'], supporters: 500, ageHours: 1000 });
    expect(p.score).toBeLessThanOrEqual(100);
    expect(p.band).toBe('critical');
    expect(computePriority({ category: 'pothole', severity: 5, hazards: ['traffic_risk', 'flooding', 'electrical'], supporters: 500, ageHours: 1000 })).toEqual(p);
  });
  it('ranks a severe hazard above a popular nuisance', () => {
    const severe = computePriority({ category: 'streetlight', severity: 5, hazards: ['electrical', 'night_visibility'], supporters: 1, ageHours: 2 });
    const popular = computePriority({ category: 'other', severity: 1, hazards: [], supporters: 40, ageHours: 2 });
    expect(severe.score).toBeGreaterThan(popular.score);
  });
  it('components sum to the score', () => {
    const p = computePriority({ category: 'garbage', severity: 3, hazards: ['health'], supporters: 4, ageHours: 12 });
    const sum = p.components.reduce((s, c) => s + c.points, 0);
    expect(Math.abs(sum - p.score)).toBeLessThan(0.11);
  });
});

describe('sla', () => {
  it('flags an unacknowledged report after 24h', () => {
    const s = computeSla({ category: 'garbage', status: 'reported', reportedAt: 0 }, 25 * HOUR);
    expect(s.ackBreached).toBe(true);
    expect(s.overdue).toBe(true);
  });
  it('never marks a verified issue overdue', () => {
    expect(computeSla({ category: 'pothole', status: 'verified', reportedAt: 0, acknowledgedAt: HOUR, verifiedAt: 10 * HOUR }, 999 * HOUR).overdue).toBe(false);
  });
});

describe('verification gates', () => {
  it('holds a confidently different-location fix photo', () => {
    const g = evidenceGate({ sameLocation: false, sameLocationConfidence: 0.9, defectResolved: true, defectResolvedConfidence: 0.9, afterPhotoQuality: 'good' });
    expect(g.decision).toBe('hold');
    expect(g.reasons).toContain('different_location');
  });
  it('passes a clean fix photo', () => {
    expect(evidenceGate({ sameLocation: true, sameLocationConfidence: 0.9, defectResolved: true, defectResolvedConfidence: 0.8, afterPhotoQuality: 'good' }).decision).toBe('pass');
  });
  it('does not hold on a low-confidence negative', () => {
    expect(evidenceGate({ sameLocation: false, sameLocationConfidence: 0.3, defectResolved: true, defectResolvedConfidence: 0.8, afterPhotoQuality: 'good' }).decision).toBe('pass');
  });
  it('needs a quorum and never verifies on silence', () => {
    expect(verificationQuorum(1)).toBe(1);
    expect(verificationQuorum(9)).toBe(2);
    expect(verificationOutcome({ confirms: 0, disputes: 0, eligible: 5 })).toBe('pending');
    expect(verificationOutcome({ confirms: 1, disputes: 0, eligible: 5 })).toBe('pending');
    expect(verificationOutcome({ confirms: 2, disputes: 0, eligible: 5 })).toBe('verified');
    expect(verificationOutcome({ confirms: 2, disputes: 2, eligible: 5 })).toBe('reopened');
  });
});

describe('ledger', () => {
  const base: IssueFacts = { category: 'pothole', status: 'reported', reportedAt: 0, acknowledgedAt: null, firstClaimedAt: null, verifiedAt: null, claimCount: 0, reopenCount: 0, overrideCount: 0, reportCount: 1 };
  it('computes the claimed-vs-verified gap from records', () => {
    const facts: IssueFacts[] = [
      { ...base, status: 'verified', acknowledgedAt: 2 * HOUR, firstClaimedAt: 30 * HOUR, verifiedAt: 48 * HOUR, claimCount: 1, reportCount: 3 },
      { ...base, status: 'resolved_pending_verification', acknowledgedAt: 4 * HOUR, firstClaimedAt: 20 * HOUR, claimCount: 1 },
      { ...base, status: 'reopened', acknowledgedAt: 6 * HOUR, firstClaimedAt: 20 * HOUR, claimCount: 1, reopenCount: 1 },
      { ...base, status: 'reported' },
      { ...base, status: 'duplicate' },
    ];
    const m = computeLedger(facts, 100 * HOUR);
    expect(m.issues.value).toBe(4);
    expect(m.reports.value).toBe(7);
    expect(m.claimed.value).toBe(3);
    expect(m.verified.value).toBe(1);
    expect(m.verifiedRate.value).toBe(33.3);
    expect(m.reopenRate.value).toBe(33.3);
    expect(m.medianAckHours.value).toBe(4);
  });
  it('returns null rates (not 0) when there is no data', () => {
    expect(computeLedger([], 0).verifiedRate.value).toBeNull();
  });
});

describe('text guards', () => {
  it('scrubs Indian phone numbers and emails', () => {
    const r = scrubPII('Call me on 98450 12345 or +91 9845012345, mail a@b.co');
    expect(r.text).not.toMatch(/98450/);
    expect(r.text).not.toMatch(/a@b\.co/);
    expect(r.removed).toEqual(expect.arrayContaining(['phone', 'email']));
  });
  it('detects Kannada script', () => {
    expect(isKannada('ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ')).toBe(true);
    expect(isKannada('Big pothole on the road')).toBe(false);
  });
  it('extracts numbers for narrative grounding', () => {
    expect(extractNumbers('62.5% of 40 claims, median 3 days')).toEqual([62.5, 40, 3]);
  });
});
