import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { selectDemoRecords, type DemoCity } from '../src/lib/demoRecords.ts';

const city = JSON.parse(readFileSync(new URL('../public/data/demo-city.json', import.meta.url), 'utf8')) as DemoCity;
describe('explicit read-only demonstration', () => {
  it('returns the same published ledger and complete ward geography', () => {
    expect(selectDemoRecords(city, 'ledger/city')).toEqual(city.ledger);
    expect(selectDemoRecords(city, 'wards')).toHaveLength(369);
  });
  it('keeps ward filters and newest-first caps consistent with live issues', () => {
    const ward = city.issues[0]!.wardId!;
    const records = selectDemoRecords(city, 'issues', [ward, 3]) as DemoCity['issues'];
    expect(records).toHaveLength(3);
    expect(records.every((issue) => issue.wardId === ward && issue.isDemo)).toBe(true);
    expect(records.map((issue) => issue.lastEventAt)).toEqual(records.map((issue) => issue.lastEventAt).sort((a, b) => b - a));
  });
  it('shows seeded histories without inventing model runs', () => {
    const id = city.issues[0]!.id;
    expect(selectDemoRecords(city, `issues/${id}/events`)).toEqual(city.histories[id]!.events.slice().sort((a,b) => a.at - b.at));
    expect(selectDemoRecords(city, 'aiRuns')).toEqual([]);
  });
  it('does not expose private reports, memberships or votes', () => {
    for (const path of ['reports', 'users', 'supports', 'votes', 'drafts']) expect(() => selectDemoRecords(city, path)).toThrow();
  });
});
