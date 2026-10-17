import type { Store, Transaction, Filter } from '../src/services/store.ts';
import { ApiFault } from '../src/services/errors.ts';

export class MemoryStore implements Store {
  docs = new Map<string, unknown>();
  rejectNextCommit = false;
  private tail: Promise<unknown> = Promise.resolve();
  async get<T>(path: string): Promise<T | null> { return structuredClone(this.docs.get(path) ?? null) as T | null; }
  async list<T>(collection: string, filters: Filter[] = []): Promise<T[]> {
    return [...this.docs].filter(([path]) => path.startsWith(`${collection}/`) && path.split('/').length === collection.split('/').length + 1)
      .map(([, value]) => structuredClone(value) as Record<string, string | number>)
      .filter((value) => filters.every((f) => {
        const field = f.field.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, value) as string | number;
        return f.op === '==' ? field === f.value : f.op === '>=' ? field >= f.value : field <= f.value;
      })) as T[];
  }
  async set(path: string, value: unknown) { this.docs.set(path, structuredClone(value)); }
  async atomic<T>(action: (tx: Transaction) => Promise<T>): Promise<T> {
    const operation = this.tail.then(async () => {
      const changes = new Map<string, unknown>();
      const beforeWrite = () => { if (changes.size) throw new Error('Firestore transactions require every read before the first write'); };
      const result = await action({ get: (path) => { beforeWrite(); return this.get(path); }, list: (path, filters) => { beforeWrite(); return this.list(path, filters); }, set: (path, value) => changes.set(path, structuredClone(value)) });
      if (this.rejectNextCommit) { this.rejectNextCommit = false; throw new ApiFault(409, 'concurrent_update', 'The issue changed during this request.'); }
      for (const [path, value] of changes) this.docs.set(path, value);
      return result;
    });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
}
