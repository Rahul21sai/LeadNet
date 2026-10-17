import { describe, expect, it } from 'vitest';
import type { EvidenceDoc } from '@leadnet/shared';
import { selectPreviewRecords } from '../src/routes/home/presentation.ts';
import { selectCurrentEvidence } from '../src/lib/evidence.ts';

describe('home preview selection', () => {
  const records = [
    { id: 'w1', category: 'garbage', status: 'reported' },
    { id: 'w2', category: 'garbage', status: 'reported' },
    { id: 'old-duplicate', category: 'pothole', status: 'duplicate' },
    { id: 'p1', category: 'pothole', status: 'verified' },
    { id: 's1', category: 'streetlight', status: 'in_progress' },
    { id: 'd1', category: 'drainage', status: 'acknowledged' },
  ] as const;
  it('shows available category variety rather than four copies of the newest category', () => {
    expect(selectPreviewRecords(records, 'all').map((record) => record.id)).toEqual(['w1', 'p1', 's1', 'd1']);
  });
  it('keeps supplied recent order in a category-specific view', () => {
    expect(selectPreviewRecords(records, 'garbage').map((record) => record.id)).toEqual(['w1', 'w2']);
  });
  it('fills small category pools without duplicates or mutation', () => {
    const source = [...records.slice(0, 2)];
    expect(selectPreviewRecords(source, 'all', 4).map((record) => record.id)).toEqual(['w1', 'w2']);
    expect(source).toEqual(records.slice(0, 2));
    expect(selectPreviewRecords(records, 'all', 0)).toEqual([]);
    expect(selectPreviewRecords(records, 'trees')).toEqual([]);
  });
});

describe('claim-scoped photo comparison', () => {
  const photo = (id: string, kind: EvidenceDoc['kind'], uploadedAt: number, claimNo?: number): EvidenceDoc => ({ id, kind, uploadedAt, claimNo, url: `/${id}.jpg`, width: 640, height: 480, uploaderType: kind === 'report' ? 'citizen' : 'officer' });
  it('never presents an earlier claim’s resolution as evidence for the current claim', () => {
    const before = photo('before', 'report', 1);
    expect(selectCurrentEvidence([before, photo('old-resolution', 'resolution', 2, 1)], 2)).toEqual({ before, after: undefined });
  });
  it('uses the earliest report and latest current-claim resolution without sorting the source', () => {
    const before = photo('before', 'report', 1);
    const after = photo('latest', 'resolution', 5, 2);
    const source = [after, photo('earlier', 'resolution', 4, 2), before, photo('old-claim', 'resolution', 3, 1)];
    expect(selectCurrentEvidence(source, 2)).toEqual({ before, after });
    expect(source[0]).toBe(after);
  });
  it('requires a positive matching claim number and a report predating the resolution', () => {
    expect(selectCurrentEvidence([photo('unscoped', 'resolution', 2)], 0).after).toBeUndefined();
    expect(selectCurrentEvidence([photo('late-report', 'report', 5), photo('resolution', 'resolution', 2, 1)], 1).before).toBeUndefined();
  });
});
