import { createHash } from 'node:crypto';
import { summarizeRegionCreators, type CommunityPostDoc, type CreatorActivity, type CreatorContribution, type IssueDoc, type RegionCreatorsResponse, type ReportDoc } from '@leadnet/shared';
import type { Runtime } from './context.ts';
import { ApiFault, documentId } from './errors.ts';
import type { Identity } from './firebase.ts';

const READ_BATCH_SIZE = 8;
type ReportAuthor = Pick<ReportDoc, 'uid' | 'issueId' | 'createdAt'>;
type PostOwner = { uid: string };

function contribution(wardId: string, uid: string, activity: CreatorActivity): CreatorContribution {
  return { creatorId: createHash('sha256').update(JSON.stringify([wardId, uid])).digest('hex'), wardId, activity };
}

function issueActivity(issue: IssueDoc, createdAt: number): CreatorActivity {
  return { id: issue.id, kind: 'issue', title: issue.title.en || issue.title.kn, createdAt, category: issue.category, status: issue.status, isDemo: issue.isDemo };
}

export async function regionCreators(r: Runtime, identity: Identity, selectedWardId?: string): Promise<RegionCreatorsResponse> {
  if (!['officer', 'admin'].includes(identity.role)) throw new ApiFault(403, 'officer_required', 'Only an authorized ward officer can view issue creators.');
  if (identity.demoOfficer === true) throw new ApiFault(403, 'demo_officer_restricted', 'Demo role switching cannot access citizen authorship. Use the fictional preview or an authorized leader account.');
  const wardId = documentId(selectedWardId ?? '');
  const ward = r.wards.get(wardId);
  if (!ward || ward.id !== wardId) throw new ApiFault(404, 'ward_not_found', 'Select an existing ward.');
  if (identity.role !== 'admin' && !identity.wardIds.includes(wardId)) throw new ApiFault(403, 'ward_scope', 'This ward is outside your assignment.');

  const [wardIssues, wardPosts] = await Promise.all([
    r.store.list<IssueDoc>('issues', [{ field: 'wardId', op: '==', value: wardId }]),
    r.store.list<CommunityPostDoc>('posts', [{ field: 'ward.id', op: '==', value: wardId }]),
  ]);
  const issues = wardIssues.filter((issue) => issue.wardId === wardId);
  const issueById = new Map(issues.map((issue) => [issue.id, issue]));
  const contributions: CreatorContribution[] = [];

  // Bound ownership fan-out independently of the number of public records in a ward.
  for (let offset = 0; offset < issues.length; offset += READ_BATCH_SIZE) {
    const results = await Promise.all(issues.slice(offset, offset + READ_BATCH_SIZE).map(async (issue) => {
      const authors = await r.store.list<ReportAuthor>('reports', [{ field: 'issueId', op: '==', value: issue.id }]);
      return authors.filter((author) => author.issueId === issue.id && typeof author.uid === 'string' && author.uid.length > 0)
        .map((author) => contribution(wardId, author.uid, issueActivity(issue, author.createdAt)));
    }));
    contributions.push(...results.flat());
  }

  const posts = wardPosts.filter((post) => post.ward?.id === wardId && (!post.issueId || post.id !== `issue-${post.issueId}` || issueById.has(post.issueId)));
  for (let offset = 0; offset < posts.length; offset += READ_BATCH_SIZE) {
    const results = await Promise.all(posts.slice(offset, offset + READ_BATCH_SIZE).map(async (post) => {
      const owner = await r.store.get<PostOwner>(`postOwners/${documentId(post.id)}`);
      if (!owner || typeof owner.uid !== 'string' || !owner.uid) return null;
      const canonicalIssue = post.issueId && post.id === `issue-${post.issueId}` ? issueById.get(post.issueId) : undefined;
      const activity: CreatorActivity = canonicalIssue ? issueActivity(canonicalIssue, post.createdAt)
        : { id: post.id, kind: 'post', title: post.text, createdAt: post.createdAt, category: post.category, status: null, isDemo: post.isDemo };
      return contribution(wardId, owner.uid, activity);
    }));
    for (const result of results) if (result) contributions.push(result);
  }

  return summarizeRegionCreators(wardId, contributions);
}
