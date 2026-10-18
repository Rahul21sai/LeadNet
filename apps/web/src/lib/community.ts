import { publicCaptureLocation, scrubPII, type CaptureLocation, type Category, type CommunityCommentDoc, type CommunityPostDoc } from '@leadnet/shared';

export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 30;
export const DEVICE_ACTIVITY_KEY = 'leadnet-community-device-v1';
export type DevicePost = CommunityPostDoc & { localOnly: true };
export interface DeviceActivity { liked: string[]; saved: string[]; comments: CommunityCommentDoc[] }
export const emptyActivity = (): DeviceActivity => ({ liked: [], saved: [], comments: [] });

export function parseDeviceActivity(raw: string | null): DeviceActivity {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== 'object') return emptyActivity();
    const item = value as Record<string, unknown>;
    const ids = (input: unknown) => Array.isArray(input) ? [...new Set(input.filter((id): id is string => typeof id === 'string' && id.length <= 160))].slice(-400) : [];
    const comments = Array.isArray(item.comments) ? item.comments.filter((comment): comment is CommunityCommentDoc => Boolean(comment && typeof comment === 'object' && typeof comment.id === 'string' && typeof comment.postId === 'string' && typeof comment.body === 'string' && comment.body.length <= 800 && Number.isFinite(comment.createdAt))).slice(-200).map((comment) => ({ ...comment, authorLabel: 'Citizen' as const, body: scrubPII(comment.body).text, isDemo: true })) : [];
    return { liked: ids(item.liked), saved: ids(item.saved), comments };
  } catch { return emptyActivity(); }
}

export function readDeviceActivity(): DeviceActivity {
  try { return parseDeviceActivity(localStorage.getItem(DEVICE_ACTIVITY_KEY)); } catch { return emptyActivity(); }
}
export function saveDeviceActivity(activity: DeviceActivity): void {
  localStorage.setItem(DEVICE_ACTIVITY_KEY, JSON.stringify(activity));
}
export function toggleId(ids: string[], id: string): string[] { return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]; }
export function mediaValidation(file: Pick<File, 'type' | 'size'>, duration?: number): string | null {
  if (!Number.isFinite(file.size) || file.size <= 0) return 'Choose a non-empty photo or video.';
  if (file.type.startsWith('image/')) return file.size > MAX_PHOTO_BYTES ? 'Choose a photo smaller than 8 MB.' : null;
  if (!file.type.startsWith('video/')) return 'Choose a photo or video.';
  if (file.size > MAX_VIDEO_BYTES) return 'Choose a video smaller than 20 MB.';
  if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS)) return 'Choose a video up to 30 seconds long.';
  return null;
}
export function capturePosition(position: Pick<GeolocationPosition, 'timestamp' | 'coords'>, shutterAt: number, now = Date.now(), source: CaptureLocation['source'] = 'camera'): CaptureLocation {
  if (!Number.isFinite(position.timestamp) || Math.abs(now - position.timestamp) > 30_000 || now - shutterAt > 30_000) throw new Error('That location is too old. Try finding the location again.');
  const { latitude: lat, longitude: lng, accuracy: accuracyM } = position.coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(accuracyM) || accuracyM < 0 || accuracyM > 100_000) throw new Error('The device returned an invalid location. Add the location manually.');
  return { lat, lng, accuracyM, capturedAt: shutterAt, source };
}
export function getDevicePosition(source: CaptureLocation['source'] = 'device', capturedAt = Date.now()): Promise<CaptureLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Location is unavailable on this device. Add a location manually.')); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      try { resolve(capturePosition(position, capturedAt, Date.now(), source)); } catch (error) { reject(error); }
    }, (error) => reject(new Error(error.code === 1 ? 'Location permission was declined. You can add a location manually.' : 'The device could not find a fresh location. Try again or add it manually.')), { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 });
  });
}
export function locationText(location: CaptureLocation | null): string { return location ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : 'Location not added'; }
export function selectedPostId(hash: string, query: string | null = null): string | null {
  try { const id = hash.startsWith('#post-') ? decodeURIComponent(hash.slice(6)) : query; return id && /^[a-zA-Z0-9_-]{1,160}$/.test(id) ? id : null; } catch { return null; }
}
export function xIntent(text: string, publicUrl?: string): string {
  const url = new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text', scrubPII(text).text);
  if (publicUrl && /^https:\/\//.test(publicUrl)) url.searchParams.set('url', publicUrl);
  return url.toString();
}
export function safePublicUrl(post: CommunityPostDoc, origin: string): string | undefined {
  if (post.isDemo || post.id.startsWith('device-')) return undefined;
  try {
    const url = new URL(origin); const host = url.hostname;
    if (url.protocol !== 'https:' || !host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local') || host.includes(':') || /^\d+(?:\.\d+){3}$/.test(host)) return undefined;
    return `${url.origin}/community#post-${encodeURIComponent(post.id)}`;
  } catch { return undefined; }
}

interface StoredPost { post: DevicePost; blob: Blob | null }
async function privatePhoto(file: File): Promise<File> {
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    if (image.width * image.height > 40_000_000) throw new Error('Choose a photo smaller than 40 megapixels.');
    const ratio = Math.min(1, 1920 / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * ratio); canvas.height = Math.round(image.height * ratio);
    const context = canvas.getContext('2d'); if (!context) throw new Error('The photo could not be prepared for device storage. Choose a different photo.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('The photo could not be prepared for device storage. Choose a different photo.');
    return new File([blob], 'leadnet-device-photo.jpg', { type: 'image/jpeg' });
  } finally { image.close(); }
}
function deviceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('leadnet-private-community', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('posts', { keyPath: 'post.id' });
    request.onerror = () => reject(new Error('Device storage is unavailable. Allow site storage to keep this draft.'));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function loadDevicePosts(): Promise<DevicePost[]> {
  const database = await deviceDatabase();
  try {
    const rows = await new Promise<StoredPost[]>((resolve, reject) => {
      const transaction = database.transaction('posts', 'readonly'); const request = transaction.objectStore('posts').getAll();
      request.onsuccess = () => resolve(request.result as StoredPost[]); request.onerror = () => reject(request.error);
    });
    return rows.filter((row) => row?.post?.localOnly && typeof row.post.text === 'string').map(({ post, blob }) => ({ ...post, media: post.media && blob ? { ...post.media, url: URL.createObjectURL(blob) } : null })).sort((a, b) => b.createdAt - a.createdAt);
  } finally { database.close(); }
}
export async function saveDevicePost(text: string, location: CaptureLocation | null, file: File | null, duration?: number, category: Category | null = null): Promise<DevicePost> {
  if (file?.type.startsWith('image/')) file = await privatePhoto(file);
  const now = Date.now();
  const post: DevicePost = { id: `device-${crypto.randomUUID()}`, authorLabel: 'Citizen', text: scrubPII(text.trim()).text, location: location ? publicCaptureLocation(location) : null, ward: null, issueId: null, category, createdAt: now, updatedAt: now, likeCount: 0, commentCount: 0, isDemo: true, localOnly: true, media: file ? { kind: file.type.startsWith('video/') ? 'video' : 'photo', mimeType: file.type, url: '', ...(duration ? { durationSeconds: duration } : {}) } : null };
  const database = await deviceDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('posts', 'readwrite'); const objectStore = transaction.objectStore('posts');
      objectStore.put({ post, blob: file } satisfies StoredPost);
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(new Error('Device storage is full. Remove a device post and try again.'));
    });
  } finally { database.close(); }
  return { ...post, media: post.media && file ? { ...post.media, url: URL.createObjectURL(file) } : null };
}
export async function deleteDevicePost(id: string): Promise<void> {
  const database = await deviceDatabase();
  try { await new Promise<void>((resolve, reject) => { const transaction = database.transaction('posts', 'readwrite'); transaction.objectStore('posts').delete(id); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); }); } finally { database.close(); }
}
export function readableError(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
