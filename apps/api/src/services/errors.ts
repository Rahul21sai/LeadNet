export class ApiFault extends Error {
  constructor(readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 503, readonly code: string, message: string) {
    super(message);
  }
}

export function requireValue<T>(value: T | null | undefined, code = 'not_found'): T {
  if (value === null || value === undefined) throw new ApiFault(404, code, 'Record not found');
  return value;
}

export function documentId(value: string): string {
  if (!value || value.length > 200 || value.includes('/') || value === '.' || value === '..') {
    throw new ApiFault(400, 'invalid_id', 'Invalid record identifier');
  }
  return value;
}
