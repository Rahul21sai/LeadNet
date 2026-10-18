import { CATEGORIES, STATUSES, type Category, type Status } from './enums.ts';
import { scrubPII } from './pii.ts';
import type { IssueDoc } from './types.ts';

export interface CreatorActivity {
  id: string;
  kind: 'issue' | 'post';
  title: string;
  createdAt: number;
  category: Category | null;
  status: Status | null;
  isDemo: boolean;
}

export interface CreatorContribution {
  creatorId: string;
  wardId: string;
  activity: CreatorActivity;
}

export interface RegionCreator {
  id: string;
  connectionProfileId?: string;
  authorLabel: 'Citizen';
  activityCount: number;
  lastPostedAt: number;
  activities: CreatorActivity[];
  isDemo: boolean;
}

export interface RegionCreatorsResponse {
  wardId: string;
  creators: RegionCreator[];
  creatorCount: number;
  activityCount: number;
  isDemo: boolean;
  notice: string;
}

const recordId = /^[a-zA-Z0-9_-]{1,160}$/;

export function summarizeRegionCreators(wardId: string, contributions: readonly CreatorContribution[], options: { isDemo?: boolean; notice?: string } = {}): RegionCreatorsResponse {
  const grouped = new Map<string, Map<string, CreatorActivity>>();
  for (const source of contributions) {
    const activity = source.activity;
    if (source.wardId !== wardId || !recordId.test(source.creatorId) || !recordId.test(activity.id) || !['issue', 'post'].includes(activity.kind) || !Number.isFinite(activity.createdAt) || activity.createdAt < 0) continue;
    const activities = grouped.get(source.creatorId) ?? new Map<string, CreatorActivity>();
    const key = `${activity.kind}:${activity.id}`;
    const previous = activities.get(key);
    // Project fields explicitly: ownership and private source data must never enter the response.
    if (!previous || previous.createdAt < activity.createdAt) activities.set(key, {
      id: activity.id, kind: activity.kind, title: scrubPII(activity.title).text.trim().slice(0, 180) || 'Local issue', createdAt: activity.createdAt,
      category: activity.category && CATEGORIES.includes(activity.category) ? activity.category : null,
      status: activity.kind === 'issue' && activity.status && STATUSES.includes(activity.status) ? activity.status : null, isDemo: activity.isDemo === true,
    });
    grouped.set(source.creatorId, activities);
  }
  const creators: RegionCreator[] = [...grouped].map(([id, records]): RegionCreator => {
    const activities = [...records.values()].sort((a, b) => b.createdAt - a.createdAt || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
    return { id, authorLabel: 'Citizen', activityCount: activities.length, lastPostedAt: activities[0]!.createdAt, activities, isDemo: activities.every((activity) => activity.isDemo) };
  }).sort((a, b) => b.lastPostedAt - a.lastPostedAt || a.id.localeCompare(b.id));
  return { wardId, creators, creatorCount: creators.length, activityCount: creators.reduce((total, creator) => total + creator.activityCount, 0), isDemo: options.isDemo === true, notice: options.notice ?? 'Citizen identities stay private. Each issue/post is counted once per citizen; the same issue may appear under several citizens. These counts exclude support, comments and verified outcomes.' };
}

export function demoRegionCreators(wardId: string, issues: readonly IssueDoc[]): RegionCreatorsResponse {
  const contributions = issues.filter((issue) => issue.isDemo && issue.wardId === wardId).map((issue): CreatorContribution => {
    // These associations illustrate the directory; public issue records cannot reveal actual authors.
    const example = [...issue.id].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 0) % 4 + 1;
    return { creatorId: `demo-${wardId}-citizen-${example}`, wardId, activity: { id: issue.id, kind: 'issue', title: issue.title.en, createdAt: issue.reportedAt, category: issue.category, status: issue.status, isDemo: true } };
  });
  const response = summarizeRegionCreators(wardId, contributions, { isDemo: true, notice: 'Fictional creator examples. These illustrative author associations do not identify actual citizens. Device posts are separate; the connected service uses authenticated submission ownership.' });
  return { ...response, creators: response.creators.map((creator) => ({ ...creator, connectionProfileId: creator.id })) };
}
