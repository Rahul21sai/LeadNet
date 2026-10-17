import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { wardLookup } from '../src/geo/wards.ts';

describe('real ward assignment', () => {
  it('returns a finite validated representative point and official bilingual ward name', () => {
    const labels = JSON.parse(readFileSync(new URL('../data/ward-labels.json', import.meta.url), 'utf8')) as Record<string, { lat: number; lng: number }>;
    const [id, point] = Object.entries(labels)[0]!;
    const result = wardLookup.lookup(point.lat, point.lng);
    expect(result?.id).toBe(id);
    expect(result?.centroid).toEqual(point);
    expect(result?.name.kn).toMatch(/[ಀ-೿]/);
  });
  it('returns no ward outside the real city boundary', () => {
    expect(wardLookup.lookup(0, 0)).toBeNull();
  });
});
