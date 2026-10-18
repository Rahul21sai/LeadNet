interface ConnectionSession { ready: boolean; user: { uid: string } | null; authEpoch?: number }

export function connectionInboxScope(session: ConnectionSession) {
  const queryKey = ['connections', session.user?.uid ?? null, session.authEpoch ?? 0] as const;
  return { queryKey, token: JSON.stringify(queryKey), enabled: session.ready && Boolean(session.user?.uid) };
}

export function canDisplayConnectionInbox(session: ConnectionSession, responseScope: string): boolean {
  const scope = connectionInboxScope(session);
  return scope.enabled && scope.token === responseScope;
}
