import { currentSignedInUid, ensureSignedIn } from './auth.ts';
import { isOfflineDemo } from './demo.ts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { auth?: boolean; expectedUid?: string } = {}): Promise<T> {
  const { auth: requiresAuth, expectedUid, ...fetchInit } = init;
  const publicCommunityRead = init.method === 'GET' && ['/community/capabilities', '/community/representatives'].includes(path.split('?')[0]!);
  if (isOfflineDemo && !publicCommunityRead) throw new ApiError(503, 'read_only_demo', 'This preview is read-only. Open the connected version to publish reports, act as an officer, or verify a fix.');
  const headers = new Headers(init.headers);
  if (requiresAuth !== false) {
    const user = await ensureSignedIn();
    if (expectedUid !== undefined && user.uid !== expectedUid) throw new ApiError(409, 'identity_changed', 'Your signed-in account changed. Refresh before continuing.');
    const token = await user.getIdToken();
    if (currentSignedInUid() !== user.uid) throw new ApiError(409, 'identity_changed', 'Your signed-in account changed. Refresh before continuing.');
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`/api/v1${path}`, { ...fetchInit, headers });
  const body = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'http_error', body?.error?.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string, opts?: { auth?: boolean; expectedUid?: string }) => request<T>(path, { method: 'GET', auth: opts?.auth ?? false, expectedUid: opts?.expectedUid }),
  post: <T>(path: string, json?: unknown, opts?: { expectedUid?: string }) => request<T>(path, { method: 'POST', body: json === undefined ? undefined : JSON.stringify(json), expectedUid: opts?.expectedUid }),
  form: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};
