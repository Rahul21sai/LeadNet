import type { EvidenceDoc } from '@leadnet/shared';

export function selectCurrentEvidence(evidence: readonly EvidenceDoc[], claimNo: number) {
  const chronological = [...evidence].sort((a, b) => a.uploadedAt - b.uploadedAt);
  const after = chronological.filter((item) => item.kind === 'resolution' && claimNo > 0 && item.claimNo === claimNo).at(-1);
  const before = chronological.find((item) => item.kind === 'report' && (!after || item.uploadedAt <= after.uploadedAt));
  return { before, after };
}
