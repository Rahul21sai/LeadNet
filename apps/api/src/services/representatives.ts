import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import type { RepresentativeContact, RepresentativeLookup, WardDoc } from '@leadnet/shared';
import type { WardLookup } from '../geo/wards.ts';

const zContact = z.object({ id: z.string(), role: z.enum(['mla', 'mp']), name: z.string(), constituency: z.string(), email: z.string().email().nullable(), sourceUrl: z.string().url(), checkedAt: z.string() });
const zDirectory = z.object({ checkedAt: z.string(), contacts: z.array(zContact), assemblyToContacts: z.record(z.string(), z.array(z.string())), coverageNotice: z.string().optional() });
export type RepresentativeDirectory = z.infer<typeof zDirectory>;
let cached: RepresentativeDirectory | undefined;

export function officialDirectory(): RepresentativeDirectory {
  if (cached) return cached;
  const path = [new URL('../../data/representatives.json', import.meta.url), new URL('../data/representatives.json', import.meta.url)].find(existsSync);
  if (!path) return { checkedAt: '', contacts: [], assemblyToContacts: {}, coverageNotice: 'Official contact coverage is not available yet.' };
  const result = zDirectory.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!result.success) return { checkedAt: '', contacts: [], assemblyToContacts: {}, coverageNotice: 'Official contact data could not be verified.' };
  cached = result.data;
  return cached;
}

export function representativeLookup(wards: WardLookup, lat: number, lng: number, directory = officialDirectory()): RepresentativeLookup {
  return fromWard(wards.lookup(lat, lng), directory);
}

export function representativeWardLookup(wards: WardLookup, wardId: string, directory = officialDirectory()): RepresentativeLookup {
  return fromWard(wards.get(wardId), directory);
}

function fromWard(ward: WardDoc | null, directory: RepresentativeDirectory): RepresentativeLookup {
  if (!ward) return { ward: null, contacts: [], coverage: 'unavailable', notice: 'This location is outside the supported Bengaluru ward boundaries. No representative was inferred.' };
  const ids = ward.assembly ? directory.assemblyToContacts[ward.assembly] ?? [] : [];
  const contacts: RepresentativeContact[] = directory.contacts.filter((contact) => ids.includes(contact.id));
  return { ward: { id: ward.id, name: ward.name.en, assembly: ward.assembly }, contacts, coverage: contacts.length ? 'matched' : 'unavailable', notice: `${directory.coverageNotice ?? 'Matched using the official ward assembly attribute. Contacts are shown only where verified from official sources.'} ${contacts.some((contact) => !contact.email) ? 'An absent email means no current official address was verified; it is never guessed.' : ''}`.trim() };
}
