import type { Category, IssueDoc } from '@leadnet/shared';

type PreviewRecord = Pick<IssueDoc, 'id' | 'category' | 'status'>;

export function selectPreviewRecords<T extends PreviewRecord>(records: readonly T[], category: Category | 'all', maximum = 4): T[] {
  if (maximum < 1) return [];
  const eligible = records.filter((record) => record.status !== 'duplicate' && record.status !== 'rejected' && (category === 'all' || record.category === category));
  if (category !== 'all') return eligible.slice(0, maximum);
  const selection: T[] = [];
  const categories = new Set<Category>();
  const ids = new Set<string>();
  for (const record of eligible) {
    if (categories.has(record.category) || ids.has(record.id)) continue;
    selection.push(record); categories.add(record.category); ids.add(record.id);
    if (selection.length === maximum) return selection;
  }
  for (const record of eligible) {
    if (ids.has(record.id)) continue;
    selection.push(record); ids.add(record.id);
    if (selection.length === maximum) break;
  }
  return selection;
}
