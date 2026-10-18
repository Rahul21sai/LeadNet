import { z } from 'zod';
import { CATEGORIES, type Category, type Lang } from './enums.ts';
import type { VerifierCheck } from './types.ts';

export const zCaptureLocation = z.object({
  lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180),
  accuracyM: z.number().finite().min(0).max(100_000).nullable(),
  capturedAt: z.number().int().nonnegative(), source: z.enum(['camera', 'device', 'manual']),
});
export type CaptureLocation = z.infer<typeof zCaptureLocation>;
export interface CommunityMedia { kind: 'photo' | 'video'; url: string; mimeType: string; width?: number; height?: number; durationSeconds?: number }
export interface CommunityPostDoc {
  id: string; authorLabel: 'Citizen'; text: string; media: CommunityMedia | null;
  location: CaptureLocation | null; ward: { id: string; name: string; assembly: string | null } | null;
  issueId: string | null; category: Category | null; createdAt: number; updatedAt: number;
  likeCount: number; commentCount: number; isDemo: boolean;
}
export interface CommunityCommentDoc { id: string; postId: string; authorLabel: 'Citizen'; body: string; createdAt: number; isDemo: boolean }
export interface RepresentativeContact {
  id: string; role: 'mla' | 'mp'; name: string; constituency: string; email: string | null;
  sourceUrl: string; checkedAt: string;
}
export interface RepresentativeLookup {
  ward: { id: string; name: string; assembly: string | null } | null;
  contacts: RepresentativeContact[]; coverage: 'matched' | 'unavailable'; notice: string;
}
export interface ComposeResponse {
  transcript: string | null; post: string; emailSubject: string; emailBody: string; xText: string;
  fallbackUsed: boolean; needsTranscript: boolean; aiRunId: string | null; checks: VerifierCheck[];
}
export interface CommunityCapabilities { email: boolean; video: boolean; maxVideoSeconds: number; maxVideoBytes: number }
export const zCommunityPost = z.object({
  requestId: z.string().min(16).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  text: z.string().trim().min(1).max(1600), location: zCaptureLocation.nullable(),
  issueId: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/).nullable().default(null),
  category: z.enum(CATEGORIES).nullable().default(null),
});
export const zCommunityComment = z.object({ body: z.string().trim().min(1).max(800), requestId: z.string().min(16).max(100).regex(/^[a-zA-Z0-9_-]+$/) });
export const zCommunityReaction = z.object({ liked: z.boolean() });
export const zCommunityEmail = z.object({
  postId: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/),
  representativeId: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/),
  subject: z.string().trim().min(3).max(160), body: z.string().trim().min(10).max(4000),
  confirmed: z.literal(true), requestId: z.string().min(16).max(100).regex(/^[a-zA-Z0-9_-]+$/),
});
export type CommunityPostInput = z.infer<typeof zCommunityPost>;
export type CommunityCommentInput = z.infer<typeof zCommunityComment>;
export type CommunityEmailInput = z.infer<typeof zCommunityEmail>;
export interface CommunityEmailResponse { status: 'sent' | 'already_sent'; receiptId: string }
export interface CommunityComposeInput { text: string; audio?: File; photo?: File; location?: CaptureLocation | null; lang: Lang; target: 'post' | 'comment' }

export function distanceMeters(a: Pick<CaptureLocation, 'lat' | 'lng'>, b: Pick<CaptureLocation, 'lat' | 'lng'>): number {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians; const dLng = (b.lng - a.lng) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}

export function publicCaptureLocation(location: CaptureLocation): CaptureLocation {
  return { ...location, lat: Math.round(location.lat * 1000) / 1000, lng: Math.round(location.lng * 1000) / 1000 };
}
