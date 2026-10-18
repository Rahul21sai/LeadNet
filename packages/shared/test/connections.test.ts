import { describe, expect, it } from 'vitest';
import { applyConnectionAction, connectionActionAllowed, connectionSendDecision, CONNECTION_COOLDOWN_MS, zConnectionAction, zConnectionProfile, zSendConnection, type ConnectionRecord } from '../src/connections.ts';

const request = (overrides: Partial<ConnectionRecord> = {}): ConnectionRecord => ({ id: 'pair-a', senderId: 'citizen-a', recipientId: 'citizen-b', status: 'pending', createdAt: 100, updatedAt: 100, revision: 1, isDemo: false, ...overrides });

describe('connection consent transitions', () => {
  it('allows only recipient accept/decline, sender cancel and accepted-participant removal', () => {
    expect(connectionActionAllowed(request(), 'citizen-b', 'accept')).toBe(true);
    expect(connectionActionAllowed(request(), 'citizen-b', 'decline')).toBe(true);
    expect(connectionActionAllowed(request(), 'citizen-a', 'accept')).toBe(false);
    expect(connectionActionAllowed(request(), 'citizen-b', 'cancel')).toBe(false);
    expect(connectionActionAllowed(request(), 'citizen-a', 'cancel')).toBe(true);
    expect(connectionActionAllowed(request(), 'outsider', 'accept')).toBe(false);
    expect(connectionActionAllowed(request({ status: 'accepted' }), 'citizen-a', 'remove')).toBe(true);
    expect(connectionActionAllowed(request({ status: 'accepted' }), 'citizen-b', 'remove')).toBe(true);
    expect(connectionActionAllowed(request(), 'citizen-b', 'remove')).toBe(false);
  });

  it('keeps repeated sends idempotent and opposite requests pending for explicit recipient consent', () => {
    expect(connectionSendDecision(null, 'citizen-a', 'citizen-b', 200).kind).toBe('create');
    expect(connectionSendDecision(request(), 'citizen-a', 'citizen-b', 200).kind).toBe('existing');
    expect(connectionSendDecision(request(), 'citizen-b', 'citizen-a', 200).kind).toBe('conflict');
    expect(connectionSendDecision(request({ status: 'accepted' }), 'citizen-b', 'citizen-a', 200).kind).toBe('existing');
    expect(connectionSendDecision(request(), 'outsider', 'citizen-b', 200).kind).toBe('conflict');
  });

  it('enforces declined/removed cooldowns for both directions without reverse-request bypasses', () => {
    const declined = request({ status: 'declined', updatedAt: 200, revision: 2 });
    expect(connectionSendDecision(declined, 'citizen-a', 'citizen-b', 300)).toEqual({ kind: 'cooldown', retryAt: 200 + CONNECTION_COOLDOWN_MS });
    expect(connectionSendDecision(declined, 'citizen-b', 'citizen-a', 300).kind).toBe('cooldown');
    expect(connectionSendDecision(declined, 'citizen-a', 'citizen-b', 200 + CONNECTION_COOLDOWN_MS).kind).toBe('create');
    expect(connectionSendDecision(request({ status: 'removed' }), 'citizen-b', 'citizen-a', 200).kind).toBe('cooldown');
    expect(connectionSendDecision(request({ status: 'cancelled' }), 'citizen-a', 'citizen-b', 200).kind).toBe('create');
  });

  it('increments revisions and allows a same-action network retry without applying it again', () => {
    const before = request(); const accepted = applyConnectionAction(before, 'citizen-b', 'accept', 1, 200);
    expect(accepted).toEqual({ ok: true, record: { ...before, status: 'accepted', updatedAt: 200, revision: 2 } });
    expect(before.status).toBe('pending');
    if (!accepted.ok) throw new Error('Expected accepted');
    expect(applyConnectionAction(accepted.record, 'citizen-b', 'accept', 1, 300)).toEqual(accepted);
    expect(applyConnectionAction(accepted.record, 'citizen-a', 'accept', 1, 300)).toEqual({ ok: false, code: 'invalid_action' });
  });

  it('rejects outsiders and stale decisions, including replays from a previous request cycle', () => {
    expect(applyConnectionAction(request(), 'outsider', 'accept', 1, 200)).toEqual({ ok: false, code: 'not_participant' });
    expect(applyConnectionAction(request({ revision: 4 }), 'citizen-b', 'accept', 1, 200)).toEqual({ ok: false, code: 'stale_connection' });
    expect(applyConnectionAction(request({ status: 'accepted', revision: 5 }), 'citizen-b', 'accept', 1, 200)).toEqual({ ok: false, code: 'stale_connection' });
    expect(applyConnectionAction(request({ status: 'accepted', revision: 2 }), 'citizen-a', 'cancel', 2, 200)).toEqual({ ok: false, code: 'invalid_action' });
  });

  it('validates client contracts and rejects identity injection or malformed decisions', () => {
    expect(zConnectionProfile.safeParse({ wardId: 'ward-a', bio: 'Local roads', discoverable: true }).success).toBe(true);
    expect(zConnectionProfile.safeParse({ wardId: 'ward-a', discoverable: true, uid: 'someone-else' }).success).toBe(false);
    expect(zConnectionProfile.safeParse({ wardId: 'ward-a', bio: 'A'.repeat(161), discoverable: true }).success).toBe(false);
    expect(zSendConnection.safeParse({ peerId: '../private' }).success).toBe(false);
    expect(zConnectionAction.safeParse({ action: 'accept', revision: 0 }).success).toBe(false);
    expect(zConnectionAction.safeParse({ action: 'auto_accept', revision: 1 }).success).toBe(false);
  });
});
