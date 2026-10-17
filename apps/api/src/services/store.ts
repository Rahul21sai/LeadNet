export interface Filter {
  field: string;
  op: '==' | '>=' | '<=';
  value: string | number;
}

export interface Reader {
  get<T>(path: string): Promise<T | null>;
  list<T>(collection: string, filters?: Filter[]): Promise<T[]>;
}

export interface Transaction extends Reader {
  set(path: string, value: unknown): void;
}

export interface Store extends Reader {
  set(path: string, value: unknown): Promise<void>;
  atomic<T>(action: (tx: Transaction) => Promise<T>): Promise<T>;
}
