import { describe, expect, it } from 'vitest';
import type { IssueDoc } from '../src/types.ts';
import { demoRegionCreators, summarizeRegionCreators, type CreatorContribution } from '../src/creators.ts';

const entry = (creatorId: string, id: string, createdAt: number, wardId = 'ward-a', kind: 'issue' | 'post' = 'issue'): CreatorContribution => ({ creatorId, wardId, activity: { id, kind, title: `Issue ${id}`, createdAt, category: 'footpath', status: kind === 'issue' ? 'reported' : null, isDemo: false } });
const issue = (id: string, wardId = 'ward-a', isDemo = true): IssueDoc => ({ id, wardId, isDemo, title: { en: 'A damaged footpath', kn: 'ಹಾನಿಗೊಳಗಾದ ಪಾದಚಾರಿ ಮಾರ್ಗ' }, reportedAt: 20, category: 'footpath', status: 'reported' }) as IssueDoc;

describe('ward creator summaries', () => {
  it('groups authors, deduplicates an issue projection/repeated reports and preserves separate post-only work', () => {
    const response = summarizeRegionCreators('ward-a', [entry('opaque-a', 'one', 10), entry('opaque-a', 'one', 20), entry('opaque-a', 'two', 30, 'ward-a', 'post'), entry('opaque-b', 'one', 15)]);
    expect(response).toMatchObject({ wardId: 'ward-a', creatorCount: 2, activityCount: 3, isDemo: false });
    expect(response.creators[0]).toMatchObject({ id: 'opaque-a', authorLabel: 'Citizen', activityCount: 2, lastPostedAt: 30, isDemo: false });
    expect(response.creators[0]?.activities.map((item) => item.id)).toEqual(['two', 'one']);
    expect(response.creators[0]?.activities[1]?.createdAt).toBe(20);
  });

  it('excludes other wards and orders creators by recency without changing the sources', () => {
    const sources = [entry('opaque-b', 'second', 20), entry('opaque-a', 'first', 30), entry('opaque-c', 'outside', 99, 'ward-b')];
    const before = structuredClone(sources);
    expect(summarizeRegionCreators('ward-a', sources).creators.map((creator) => creator.id)).toEqual(['opaque-a', 'opaque-b']);
    expect(sources).toEqual(before);
    expect(summarizeRegionCreators('ward-empty', sources)).toMatchObject({ creators: [], creatorCount: 0, activityCount: 0 });
  });

  it('projects only approved fields and scrubs personal details from public activity wording', () => {
    const source = entry('opaque-a', 'one', 10);
    const unsafe = { ...source, uid: 'PRIVATE_UID', activity: { ...source.activity, title: 'Please inspect. Email private@example.com or call 9876543210.', transcript: 'PRIVATE_TRANSCRIPT', location: { lat: 12.123456, lng: 77.123456 } } };
    const output = JSON.stringify(summarizeRegionCreators('ward-a', [unsafe]));
    for (const secret of ['PRIVATE_UID', 'PRIVATE_TRANSCRIPT', 'private@example.com', '9876543210', '12.123456', '77.123456']) expect(output).not.toContain(secret);
  });

  it('rejects invalid record links/times and bounds activity titles', () => {
    const invalidLink = entry('opaque-a', '../private', 10);
    const invalidTime = entry('opaque-a', 'future-invalid', NaN);
    const long = entry('opaque-a', 'valid', 20); long.activity.title = 'A'.repeat(400);
    const response = summarizeRegionCreators('ward-a', [invalidLink, invalidTime, long]);
    expect(response.activityCount).toBe(1);
    expect(response.creators[0]?.activities[0]?.title.length).toBeLessThanOrEqual(180);
  });
});

describe('explicit fictional creator examples', () => {
  it('uses only fictional issues in the selected ward and labels the association as illustrative', () => {
    const response = demoRegionCreators('ward-a', [issue('example-a'), issue('example-b'), issue('real-record', 'ward-a', false), issue('other-region', 'ward-b')]);
    expect(response).toMatchObject({ wardId: 'ward-a', isDemo: true, activityCount: 2 });
    expect(response.notice).toMatch(/fictional|illustrative/i);
    expect(response.creators.every((creator) => creator.authorLabel === 'Citizen' && creator.isDemo)).toBe(true);
    expect(JSON.stringify(response)).not.toContain('real-record');
    expect(JSON.stringify(response)).not.toContain('other-region');
  });

  it('keeps fictional associations deterministic and does not fabricate activity for an empty ward', () => {
    const records = [issue('example-a'), issue('example-b')];
    expect(demoRegionCreators('ward-a', records)).toEqual(demoRegionCreators('ward-a', [...records].reverse()));
    expect(demoRegionCreators('ward-empty', records)).toMatchObject({ creatorCount: 0, activityCount: 0, creators: [], isDemo: true });
  });
});
