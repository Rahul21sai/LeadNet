import { describe, expect, it } from 'vitest';
import { assertDemoPrefixes, assertSeedResetSafe, type SeedResetInventory } from '../scripts/seedSafety.ts';

function scripted(): SeedResetInventory {
  return {
    candidates: [
      { path: 'issues/demo-issue-001', data: { isDemo: true } },
      { path: 'reports/demo-report-001', data: { isDemo: true, issueId: 'demo-issue-001' } },
    ],
    linkedRecords: [
      { path: 'reports/demo-report-001', data: { isDemo: true, issueId: 'demo-issue-001' } },
      { path: 'supports/demo-issue-001_demo-citizen-001', data: { isDemo: true, issueId: 'demo-issue-001' } },
      { path: 'votes/demo-issue-001_1_demo-citizen-001', data: { isDemo: true, issueId: 'demo-issue-001' } },
    ],
    events: [
      { path: 'issues/demo-issue-001/events/event-001', data: { meta: { isDemo: true, source: 'scripted_seed' } } },
      { path: 'issues/demo-issue-001/events/event-002', data: { meta: { isDemo: true, role: 'officer' } } },
    ],
  };
}

describe('demo seed reset safety', () => {
  it('allows records and histories containing only scripted demo activity', () => {
    expect(() => assertSeedResetSafe(scripted())).not.toThrow();
  });

  it.each(['reports', 'supports', 'votes'])('refuses runtime %s without an isDemo field', (collection) => {
    const inventory = scripted();
    inventory.linkedRecords = [...inventory.linkedRecords, { path: `${collection}/demo-issue-001_real-citizen`, data: { issueId: 'demo-issue-001', uid: 'real-citizen' } }];
    expect(() => assertSeedResetSafe(inventory)).toThrow(/real activity/);
  });

  it('refuses an officer action on a demo issue when its timeline event is not scripted', () => {
    const inventory = scripted();
    inventory.events = [...inventory.events, { path: 'issues/demo-issue-001/events/live-acknowledgement', data: { actorType: 'officer', type: 'acknowledged' } }];
    expect(() => assertSeedResetSafe(inventory)).toThrow(/real activity/);
  });

  it('refuses timeline events explicitly marked as another source', () => {
    const inventory = scripted();
    inventory.events = [{ path: 'issues/demo-issue-001/events/live-action', data: { meta: { isDemo: true, source: 'runtime' } } }];
    expect(() => assertSeedResetSafe(inventory)).toThrow(/real activity/);
  });

  it('rejects any non-demo-prefixed deletion candidate before examining activity', () => {
    const inventory = scripted();
    inventory.candidates = [...inventory.candidates, { path: 'issues/real-issue', data: { isDemo: true } }];
    inventory.events = [{ path: 'issues/demo-issue-001/events/live-action', data: {} }];
    expect(() => assertDemoPrefixes(inventory.candidates)).toThrow(/non-demo-prefixed/);
    expect(() => assertSeedResetSafe(inventory)).toThrow(/non-demo-prefixed/);
  });
});
