import type { CommunityPostDoc } from '@leadnet/shared';

export function mergePostsById<T extends { id: string }>(...sources: readonly (readonly T[])[]): T[] {
  const posts = new Map<string, T>();
  for (const source of sources) for (const post of source) if (!posts.has(post.id)) posts.set(post.id, post);
  return [...posts.values()];
}

export function communityFeedPosts(device: readonly CommunityPostDoc[], published: readonly CommunityPostDoc[], publicPosts: readonly CommunityPostDoc[], selected: CommunityPostDoc | null = null, latestId: string | null = null): CommunityPostDoc[] {
  const isExample = (post: CommunityPostDoc) => post.isDemo && !post.id.startsWith('device-');
  return mergePostsById(device, publicPosts, published, selected ? [selected] : []).sort((a, b) => {
    // Fictional examples must not bury actual submissions when their snapshot is ahead of the device clock.
    return Number(b.id === latestId) - Number(a.id === latestId) || Number(isExample(a)) - Number(isExample(b)) || b.createdAt - a.createdAt;
  });
}

export function withoutCompose(location: { pathname: string; search: string; hash: string }): { pathname: string; search: string; hash: string } {
  const query = new URLSearchParams(location.search);
  query.delete('compose');
  const search = query.toString();
  return { pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash };
}
