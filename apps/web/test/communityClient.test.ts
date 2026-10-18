import { describe, expect, it } from 'vitest';
import type { CommunityPostDoc } from '@leadnet/shared';
import { capturePosition, locationText, mediaValidation, parseDeviceActivity, safePublicUrl, selectedPostId, toggleId, xIntent } from '../src/lib/community.ts';

const post: CommunityPostDoc = { id: 'record-123', authorLabel: 'Citizen', text: 'A blocked footpath.', media: null, location: null, ward: null, category: null, issueId: null, createdAt: 1, updatedAt: 1, likeCount: 0, commentCount: 0, isDemo: false };
const position = (timestamp = 1_000_000) => ({ timestamp, coords: { latitude: 12.971612, longitude: 77.594613, accuracy: 18, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON() { return {}; } } });

describe('community capture trust boundaries', () => {
  it('records a fresh device position at the shutter without rounding the private capture', () => {
    expect(capturePosition(position(), 999_000, 1_001_000)).toEqual({ lat: 12.971612, lng: 77.594613, accuracyM: 18, capturedAt: 999_000, source: 'camera' });
  });
  it('refuses stale or future positions instead of silently assigning a photo location', () => {
    expect(() => capturePosition(position(950_000), 999_000, 1_001_000)).toThrow('too old');
    expect(() => capturePosition(position(1_090_000), 999_000, 1_001_000)).toThrow('too old');
    expect(() => capturePosition(position(), 950_000, 1_001_000)).toThrow('too old');
  });
  it('refuses invalid coordinates and accuracy from the device', () => {
    expect(() => capturePosition({ ...position(), coords: { ...position().coords, latitude: NaN } }, 999_000, 1_001_000)).toThrow('invalid');
    expect(() => capturePosition({ ...position(), coords: { ...position().coords, accuracy: -1 } }, 999_000, 1_001_000)).toThrow('invalid');
  });
  it('reports absent locations honestly and formats public positions to three decimals', () => {
    expect(locationText(null)).toBe('Location not added');
    expect(locationText(capturePosition(position(), 999_000, 1_001_000))).toBe('12.972, 77.595');
  });
  it('accepts short media and rejects oversized photos, long and invalid videos', () => {
    expect(mediaValidation({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(mediaValidation({ type: 'image/jpeg', size: 9 * 1024 * 1024 })).toContain('8 MB');
    expect(mediaValidation({ type: 'video/webm', size: 21 * 1024 * 1024 }, 10)).toContain('20 MB');
    expect(mediaValidation({ type: 'video/webm', size: 1024 }, 30)).toBeNull();
    expect(mediaValidation({ type: 'video/webm', size: 1024 }, 30.1)).toContain('30 seconds');
    expect(mediaValidation({ type: 'video/webm', size: 1024 }, Infinity)).toContain('30 seconds');
    expect(mediaValidation({ type: 'text/html', size: 1 })).toContain('photo or video');
  });
});

describe('private device interactions', () => {
  it('recovers from corrupted or unexpected storage without fabricating activity', () => {
    expect(parseDeviceActivity('{')).toEqual({ liked: [], saved: [], comments: [] });
    expect(parseDeviceActivity('[]')).toEqual({ liked: [], saved: [], comments: [] });
    expect(parseDeviceActivity(JSON.stringify({ liked: [1, null, 'one', 'one'], saved: 'invalid', comments: [null, { body: 'partial' }] }))).toEqual({ liked: ['one'], saved: [], comments: [] });
  });
  it('scrubs stored comment PII and fixes public identity and fictional-data labels', () => {
    const stored = parseDeviceActivity(JSON.stringify({ comments: [{ id: 'one', postId: 'post', authorLabel: 'Private name', body: 'Email private@example.com about this.', createdAt: 100, isDemo: false }] }));
    expect(stored.comments[0]).toMatchObject({ body: 'Email [email removed] about this.', authorLabel: 'Citizen', isDemo: true });
  });
  it('bounds device bookmarks and stored discussions', () => {
    const input = JSON.stringify({ saved: Array.from({ length: 450 }, (_, index) => `post-${index}`), comments: Array.from({ length: 240 }, (_, index) => ({ id: `${index}`, postId: 'post', body: 'Useful context', createdAt: 100 })) });
    expect(parseDeviceActivity(input).saved).toHaveLength(400);
    expect(parseDeviceActivity(input).comments).toHaveLength(200);
  });
  it('a second toggle removes a bookmark without creating duplicated activity', () => {
    expect(toggleId(toggleId(['existing'], 'new'), 'new')).toEqual(['existing']);
  });
});

describe('reviewed sharing links', () => {
  it('accepts canonical record IDs and ignores malformed or unsafe share fragments', () => {
    expect(selectedPostId('#post-record-123')).toBe('record-123');
    expect(selectedPostId('#post-%')).toBeNull();
    expect(selectedPostId('#post-../private')).toBeNull();
    expect(selectedPostId('', 'record-123')).toBe('record-123');
  });
  it('never presents device, fictional, localhost or private IP posts as publicly accessible', () => {
    expect(safePublicUrl({ ...post, isDemo: true }, 'https://leadnet.web.app')).toBeUndefined();
    expect(safePublicUrl({ ...post, id: 'device-private' }, 'https://leadnet.web.app')).toBeUndefined();
    for (const origin of ['http://127.0.0.1:5173', 'https://localhost:5173', 'https://192.168.1.2', 'https://local.test.local', 'https://[::1]', 'not a URL']) expect(safePublicUrl(post, origin)).toBeUndefined();
  });
  it('uses the canonical hash link only for a real post on a public HTTPS host', () => {
    expect(safePublicUrl(post, 'https://leadnet.web.app')).toBe('https://leadnet.web.app/community#post-record-123');
  });
  it('opens an X draft, scrubs public PII, and never adds a local or missing URL', () => {
    const draft = new URL(xIntent('A blocked footpath. Contact private@example.com', 'http://127.0.0.1:5173'));
    expect(draft.origin).toBe('https://twitter.com');
    expect(draft.pathname).toBe('/intent/tweet');
    expect(draft.searchParams.get('text')).toContain('[email removed]');
    expect(draft.searchParams.has('url')).toBe(false);
    expect(new URL(xIntent(post.text, 'https://leadnet.web.app/community#post-record-123')).searchParams.get('url')).toContain('#post-record-123');
  });
});
