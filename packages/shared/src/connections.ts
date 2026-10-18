import { z } from 'zod';

export const CONNECTION_STATUSES = ['pending', 'accepted', 'declined', 'cancelled', 'removed'] as const;
export const CONNECTION_ACTIONS = ['accept', 'decline', 'cancel', 'remove'] as const;
export const CONNECTION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];
export type ConnectionAction = (typeof CONNECTION_ACTIONS)[number];

const profileId = z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/);
export const zConnectionProfile = z.object({ wardId: profileId, bio: z.string().trim().max(160).default(''), discoverable: z.boolean() }).strict();
export const zSendConnection = z.object({ peerId: profileId }).strict();
export const zConnectionAction = z.object({ action: z.enum(CONNECTION_ACTIONS), revision: z.number().int().min(1) }).strict();
export type ConnectionProfileInput = z.infer<typeof zConnectionProfile>;

export interface ConnectionPerson {
  id: string;
  authorLabel: 'Citizen';
  ward: { id: string; name: string };
  bio: string;
  isDemo: boolean;
}
export interface ConnectionProfile extends ConnectionPerson { discoverable: boolean }
export interface ConnectionRecord {
  id: string;
  senderId: string;
  recipientId: string;
  status: ConnectionStatus;
  createdAt: number;
  updatedAt: number;
  revision: number;
  isDemo: boolean;
}
export interface ConnectionView {
  id: string;
  peer: ConnectionPerson;
  direction: 'incoming' | 'outgoing';
  status: ConnectionStatus;
  createdAt: number;
  updatedAt: number;
  revision: number;
  isDemo: boolean;
}
export interface PeopleResponse { wardId: string; people: ConnectionPerson[]; isDemo: boolean; notice: string }
export interface ConnectionsResponse { profile: ConnectionProfile | null; requests: ConnectionView[]; isDemo: boolean; notice: string }
export type ConnectionSendDecision = { kind: 'create' | 'existing' | 'conflict' | 'cooldown'; retryAt?: number };
export type ConnectionActionResult = { ok: true; record: ConnectionRecord } | { ok: false; code: 'not_participant' | 'invalid_action' | 'stale_connection' };

function actorCanChoose(record: ConnectionRecord, actorId: string, action: ConnectionAction): boolean {
  if (action === 'accept' || action === 'decline') return actorId === record.recipientId;
  if (action === 'cancel') return actorId === record.senderId;
  return actorId === record.senderId || actorId === record.recipientId;
}

export function connectionActionAllowed(record: ConnectionRecord, actorId: string, action: ConnectionAction): boolean {
  return actorCanChoose(record, actorId, action) && (action === 'remove' ? record.status === 'accepted' : record.status === 'pending');
}

export function connectionSendDecision(record: ConnectionRecord | null, senderId: string, recipientId: string, now: number): ConnectionSendDecision {
  if (senderId === recipientId) return { kind: 'conflict' };
  if (!record) return { kind: 'create' };
  if (![record.senderId, record.recipientId].includes(senderId) || ![record.senderId, record.recipientId].includes(recipientId)) return { kind: 'conflict' };
  if (record.status === 'accepted') return { kind: 'existing' };
  if (record.status === 'pending') return { kind: record.senderId === senderId ? 'existing' : 'conflict' };
  const retryAt = record.updatedAt + CONNECTION_COOLDOWN_MS;
  if ((record.status === 'removed' || record.status === 'declined') && now < retryAt) return { kind: 'cooldown', retryAt };
  return { kind: 'create' };
}

export function applyConnectionAction(record: ConnectionRecord, actorId: string, action: ConnectionAction, expectedRevision: number, now: number): ConnectionActionResult {
  if (actorId !== record.senderId && actorId !== record.recipientId) return { ok: false, code: 'not_participant' };
  if (!actorCanChoose(record, actorId, action)) return { ok: false, code: 'invalid_action' };
  const target: Record<ConnectionAction, ConnectionStatus> = { accept: 'accepted', decline: 'declined', cancel: 'cancelled', remove: 'removed' };
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return { ok: false, code: 'stale_connection' };
  if (record.status === target[action] && (expectedRevision === record.revision || expectedRevision === record.revision - 1)) return { ok: true, record };
  if (expectedRevision !== record.revision) return { ok: false, code: 'stale_connection' };
  if (!connectionActionAllowed(record, actorId, action)) return { ok: false, code: 'invalid_action' };
  return { ok: true, record: { id: record.id, senderId: record.senderId, recipientId: record.recipientId, status: target[action], createdAt: record.createdAt, updatedAt: Math.max(record.updatedAt, now), revision: record.revision + 1, isDemo: record.isDemo } };
}

export function connectionRecordFromView(view: ConnectionView, ownProfileId: string): ConnectionRecord {
  return { id: view.id, senderId: view.direction === 'outgoing' ? ownProfileId : view.peer.id, recipientId: view.direction === 'incoming' ? ownProfileId : view.peer.id, status: view.status, createdAt: view.createdAt, updatedAt: view.updatedAt, revision: view.revision, isDemo: view.isDemo };
}
