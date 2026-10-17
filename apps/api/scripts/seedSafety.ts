export interface SeedResetRecord {
  path: string;
  data: Record<string, unknown>;
}

export interface SeedResetInventory {
  candidates: readonly SeedResetRecord[];
  linkedRecords: readonly SeedResetRecord[];
  events: readonly SeedResetRecord[];
}

export function assertDemoPrefixes(records: readonly SeedResetRecord[]): void {
  for (const record of records) {
    if (!record.path.split('/').at(-1)?.startsWith('demo-')) {
      throw new Error(`Refusing to delete non-demo-prefixed document ${record.path}`);
    }
  }
}

export function assertSeedResetSafe(inventory: SeedResetInventory): void {
  assertDemoPrefixes(inventory.candidates);
  for (const record of inventory.linkedRecords) {
    if (record.data.isDemo !== true) {
      throw new Error(`Refusing to reset demo issues with real activity at ${record.path}. Preserve this interaction and use a fresh demo dataset.`);
    }
  }
  for (const event of inventory.events) {
    const meta = event.data.meta;
    if (!meta || typeof meta !== 'object' || !('isDemo' in meta) || meta.isDemo !== true || ('source' in meta && meta.source !== 'scripted_seed')) {
      throw new Error(`Refusing to reset demo issues with real activity at ${event.path}. Preserve this interaction and use a fresh demo dataset.`);
    }
  }
}
