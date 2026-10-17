import { computeLedger, type IssueDoc, type LedgerDoc, type WardDoc } from '@leadnet/shared';
import type { Store } from './store.ts';

export async function recomputeStats(store: Store, now: number): Promise<void> {
  await store.atomic(async (tx) => {
    const issues = await tx.list<IssueDoc>('issues');
    const wards = await tx.list<WardDoc>('wards');
    await tx.get<LedgerDoc>('ledger/city');
    const rows = wards.map((ward) => ({ wardId: ward.id, name: ward.name, metrics: computeLedger(issues.filter((issue) => issue.wardId === ward.id), now) }));
    for (const ward of wards) {
      const metrics = rows.find((row) => row.wardId === ward.id)!.metrics;
      tx.set(`wards/${ward.id}`, { ...ward, stats: metrics, statsUpdatedAt: now });
    }
    const snapshot: LedgerDoc = { city: computeLedger(issues, now), wards: rows.filter((row) => (row.metrics.reports.value ?? 0) > 0), updatedAt: now };
    tx.set('ledger/city', snapshot);
  });
}
