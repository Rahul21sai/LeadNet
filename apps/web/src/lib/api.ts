import { ensureSignedIn } from './auth.ts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.auth !== false) {
    const user = await ensureSignedIn();
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`/api/v1${path}`, { ...init, headers });
  const body = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'http_error', body?.error?.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string, opts?: { auth?: boolean }) => request<T>(path, { method: 'GET', auth: opts?.auth ?? false }),
  post: <T>(path: string, json?: unknown) => request<T>(path, { method: 'POST', body: json === undefined ? undefined : JSON.stringify(json) }),
  form: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};
