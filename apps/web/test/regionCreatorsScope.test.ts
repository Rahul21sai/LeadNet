import { describe, expect, it } from 'vitest';
import { canDisplayRegionCreators, regionCreatorsScope } from '../src/lib/creatorScope.ts';

const officer = { ready: true, user: { uid: 'officer-one' }, role: 'officer' as const, wardIds: ['ward-b', 'ward-a'] };

describe('region creator read scope', () => {
  it('requires a ready signed-in officer with the selected ward or an admin', () => {
    expect(regionCreatorsScope(officer, 'ward-a').allowed).toBe(true);
    expect(regionCreatorsScope(officer, 'ward-c').allowed).toBe(false);
    expect(regionCreatorsScope({ ...officer, ready: false }, 'ward-a').allowed).toBe(false);
    expect(regionCreatorsScope({ ...officer, user: null }, 'ward-a').allowed).toBe(false);
    expect(regionCreatorsScope({ ...officer, role: 'citizen' }, 'ward-a').allowed).toBe(false);
    expect(regionCreatorsScope({ ...officer, role: 'moderator' }, 'ward-a').allowed).toBe(false);
    expect(regionCreatorsScope({ ...officer, demoOfficer: true }, 'ward-a').allowed).toBe(false);
    expect(regionCreatorsScope({ ...officer, role: 'admin', demoOfficer: true }, 'ward-a').allowed).toBe(false);
    expect(regionCreatorsScope({ ...officer, role: 'admin', wardIds: [] }, 'ward-c').allowed).toBe(true);
    expect(regionCreatorsScope({ ...officer, role: 'admin' }, '').allowed).toBe(false);
  });

  it('separates cached reads after user, role, claims or selected ward changes', () => {
    const original = regionCreatorsScope(officer, 'ward-a').queryKey;
    expect(regionCreatorsScope({ ...officer, user: { uid: 'officer-two' } }, 'ward-a').queryKey).not.toEqual(original);
    expect(regionCreatorsScope({ ...officer, role: 'admin' }, 'ward-a').queryKey).not.toEqual(original);
    expect(regionCreatorsScope({ ...officer, demoOfficer: true }, 'ward-a').queryKey).not.toEqual(original);
    expect(regionCreatorsScope({ ...officer, wardIds: ['ward-a'] }, 'ward-a').queryKey).not.toEqual(original);
    expect(regionCreatorsScope(officer, 'ward-b').queryKey).not.toEqual(original);
    expect(regionCreatorsScope({ ...officer, wardIds: ['ward-a', 'ward-b', 'ward-a'] }, 'ward-a').queryKey).toEqual(original);
  });

  it('hides cached data immediately when authorization or the region no longer matches', () => {
    expect(canDisplayRegionCreators(officer, 'ward-a', 'ward-a')).toBe(true);
    expect(canDisplayRegionCreators(officer, 'ward-b', 'ward-a')).toBe(false);
    expect(canDisplayRegionCreators({ ...officer, role: 'citizen' }, 'ward-a', 'ward-a')).toBe(false);
    expect(canDisplayRegionCreators({ ...officer, wardIds: [] }, 'ward-a', 'ward-a')).toBe(false);
    expect(canDisplayRegionCreators({ ...officer, demoOfficer: true }, 'ward-a', 'ward-a')).toBe(false);
    expect(canDisplayRegionCreators({ ...officer, user: null }, 'ward-a', 'ward-a')).toBe(false);
  });
});
