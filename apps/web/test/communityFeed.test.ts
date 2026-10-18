import { describe, expect, it } from 'vitest';
import type { CommunityPostDoc } from '@leadnet/shared';
import { communityFeedPosts, mergePostsById, withoutCompose } from '../src/routes/community/feed.ts';

const post = (id: string, createdAt: number, text = id): CommunityPostDoc => ({ id, authorLabel: 'Citizen', text, media: null, location: null, ward: null, category: null, issueId: null, createdAt, updatedAt: createdAt, likeCount: 0, commentCount: 0, isDemo: id.startsWith('demo-') || id.startsWith('device-') });

describe('new community issue visibility', () => {
  it('keeps a post created during device hydration and restores older saved posts once', () => {
    const justSaved = post('device-new', 20, 'The newly saved photo');
    const restored = post('device-old', 10);
    expect(mergePostsById([justSaved], [restored, { ...justSaved, text: 'Stale stored copy' }])).toEqual([justSaved, restored]);
  });

  it('keeps device posts visible before fictional examples dated ahead of the device clock', () => {
    const privatePost = post('device-new', 100);
    const futureExample = post('demo-example', 1_000);
    const result = communityFeedPosts([privatePost], [], [futureExample]);
    expect(result.map((value) => value.id)).toEqual(['device-new', 'demo-example']);
    expect(result[0]?.createdAt).toBe(100);
    expect(result[1]?.createdAt).toBe(1_000);
  });

  it('puts the post just saved first even if older device entries have clock-skewed timestamps', () => {
    expect(communityFeedPosts([post('device-old', 9_000), post('device-now', 100)], [], [], null, 'device-now').map((value) => value.id)).toEqual(['device-now', 'device-old']);
  });

  it('does not bury a fresh real report behind older private device posts', () => {
    expect(communityFeedPosts([post('device-old', 20)], [], [post('report-new', 40), post('demo-example', 1_000)]).map((value) => value.id)).toEqual(['report-new', 'device-old', 'demo-example']);
  });

  it('uses live data when a published post is acknowledged without showing a duplicate', () => {
    const response = post('public-new', 20, 'Publish response');
    const live = { ...response, text: 'Server-confirmed text', likeCount: 3 };
    expect(communityFeedPosts([], [response], [post('public-old', 10), live])).toEqual([live, post('public-old', 10)]);
  });

  it('adds a deep-linked post outside the feed without changing chronological order', () => {
    const existing = post('public-current', 30);
    const selected = post('public-older', 10);
    expect(communityFeedPosts([], [], [existing], selected)).toEqual([existing, selected]);
    expect(communityFeedPosts([], [], [existing], existing)).toEqual([existing]);
  });

  it('closes the composer without discarding post selection, unrelated filters or the hash', () => {
    expect(withoutCompose({ pathname: '/', search: '?compose=1&post=public-selected&filter=roads', hash: '#post-public-selected' })).toEqual({ pathname: '/', search: '?post=public-selected&filter=roads', hash: '#post-public-selected' });
    expect(withoutCompose({ pathname: '/community', search: '?compose=1', hash: '#post-public-selected' })).toEqual({ pathname: '/community', search: '', hash: '#post-public-selected' });
  });
});
