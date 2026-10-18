import { describe, expect, it } from 'vitest';
import { distanceMeters, publicCaptureLocation, zCaptureLocation, zCommunityEmail, zCommunityPost } from '../src/community.ts';
import { extractNumbers, scrubPII } from '../src/pii.ts';

describe('community capture and distance contracts', () => {
  const location = { lat: 12.9757123, lng: 77.6067987, accuracyM: 14, capturedAt: 1_792_000_000_000, source: 'camera' as const };
  it('publicly rounds capture coordinates without mutating the private original or losing its provenance', () => {
    expect(publicCaptureLocation(location)).toEqual({ ...location, lat: 12.976, lng: 77.607 });
    expect(location.lat).toBe(12.9757123);
  });
  it('rejects invalid/stale-schema coordinate metadata instead of assuming a photo location', () => {
    expect(zCaptureLocation.safeParse({ ...location, lat: NaN }).success).toBe(false);
    expect(zCaptureLocation.safeParse({ ...location, accuracyM: -1 }).success).toBe(false);
    expect(zCaptureLocation.safeParse({ ...location, source: 'exif-guessed' }).success).toBe(false);
    expect(zCaptureLocation.safeParse({ ...location, lat: 91 }).success).toBe(false);
  });
  it('computes finite distances in metres, including coincident and antipodal points', () => {
    expect(distanceMeters(location, location)).toBe(0);
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111_194.93, 1);
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(20_015_086.8, 0);
  });
  it('requires an explicit review confirmation and a bounded idempotency key for sending', () => {
    const message = { postId: 'post_1', representativeId: 'verified_mp', subject: 'Road repair request', body: 'Please inspect the recorded civic issue.', requestId: 'request_123456789', confirmed: true };
    expect(zCommunityEmail.safeParse(message).success).toBe(true);
    expect(zCommunityEmail.safeParse({ ...message, confirmed: false }).success).toBe(false);
    expect(zCommunityEmail.safeParse({ ...message, requestId: '../bad-path' }).success).toBe(false);
    expect(zCommunityPost.safeParse({ text: 'Please inspect this issue.', location: null, requestId: 'request_123456789' }).success).toBe(true);
  });
  it('checks Hindi and Kannada numeric detail using the same numeric values', () => {
    expect(extractNumbers('यहाँ २ गड्ढे और ೧ streetlight हैं')).toEqual([2, 1]);
    expect(extractNumbers('यहाँ ९ गड्ढे हैं')).not.toEqual(extractNumbers('यहाँ २ गड्ढे हैं'));
  });
  it('redacts Indic-script phone numbers while preserving ordinary source digits', () => {
    expect(scrubPII('२ potholes. Call ९८७६५४३२१०.').text).toBe('२ potholes. Call [phone removed].');
    expect(scrubPII('೨ ಸಮಸ್ಯೆಗಳು. ೯೮೭೬೫೪೩೨೧೦').text).toBe('೨ ಸಮಸ್ಯೆಗಳು. [phone removed]');
  });
});
