import { describe, expect, it } from 'vitest';
import { computeLedger, computePriority, extractNumbers, type IssueFacts } from '../src/index.ts';

describe('public record regressions', () => {
  it('does not reward repeated copies of the same hazard', () => {
    const input = { category: 'garbage', severity: 3, supporters: 4, ageHours: 12 } as const;
    expect(computePriority({ ...input, hazards: ['health', 'health', 'health', 'health'] }))
      .toEqual(computePriority({ ...input, hazards: ['health'] }));
  });

  it('does not count rejection as duplicate merging', () => {
    const rejected: IssueFacts = { category: 'other', status: 'rejected', reportedAt: 0, acknowledgedAt: null,
      firstClaimedAt: null, verifiedAt: null, claimCount: 0, reopenCount: 0, overrideCount: 0, reportCount: 1 };
    const metrics = computeLedger([rejected], 0);
    expect(metrics.reports.value).toBe(1);
    expect(metrics.issues.value).toBe(0);
    expect(metrics.duplicatesMerged.value).toBe(0);
  });

  it('grounds grouped Indian and international numbers without changing their value', () => {
    expect(extractNumbers('1,000 reports; 1,27,807 issues; 62.5%; -3.2 days; ೧೨ fixes'))
      .toEqual([1000, 127807, 62.5, -3.2, 12]);
  });
});
