import type { EvidenceDoc, IssueDoc, IssueEventDoc, LeaderDoc, LedgerDoc, ProjectDoc, WardDoc } from '@leadnet/shared';

export interface DemoCity {
  notice: string; generatedAt: number; issues: IssueDoc[]; wards: WardDoc[]; ledger: LedgerDoc; leaders: LeaderDoc[]; projects: ProjectDoc[];
  histories: Record<string, { events: IssueEventDoc[]; evidence: EvidenceDoc[] }>;
}

export function selectDemoRecords(city: DemoCity, path: string, deps: unknown[] = []): unknown {
  if (path === 'issues') return city.issues.filter((issue) => !deps[0] || issue.wardId === deps[0]).sort((a,b) => b.lastEventAt - a.lastEventAt).slice(0, typeof deps[1] === 'number' ? deps[1] : 500);
  if (path === 'wards') return city.wards;
  if (path === 'leaders') return city.leaders;
  if (path === 'projects') return city.projects.filter((project) => !deps[0] || project.wardId === deps[0]);
  if (path === 'ledger/city') return city.ledger;
  if (path === 'aiRuns') return [];
  const [collection, id, subcollection] = path.split('/');
  if (collection === 'issues' && id) {
    if (subcollection === 'events') return [...(city.histories[id]?.events ?? [])].sort((a,b) => a.at - b.at);
    if (subcollection === 'evidence') return [...(city.histories[id]?.evidence ?? [])].sort((a,b) => a.uploadedAt - b.uploadedAt);
    if (!subcollection) return city.issues.find((issue) => issue.id === id) ?? null;
  }
  if (id && !subcollection) {
    if (collection === 'wards') return city.wards.find((ward) => ward.id === id) ?? null;
    if (collection === 'leaders') return city.leaders.find((leader) => leader.id === id) ?? null;
    if (collection === 'projects') return city.projects.find((project) => project.id === id) ?? null;
  }
  throw new Error('This data is unavailable in the public demonstration.');
}
