// Cross-tab refresh coordination.
//
// Primary: Web Locks API (navigator.locks) — serializes refresh execution
// across ALL tabs of the same origin, so two tabs can never consume the same
// refresh token concurrently. Inside the lock the token is always re-read
// from localStorage, so a waiting tab picks up the freshest token after the
// holder rotates it.
//
// Fallback (browsers without Web Locks): run directly. In-tab single-flight
// (token-service refreshPromise) still prevents concurrent use within one tab,
// and the 401-recovery path in token-service re-reads the freshest token and
// retries once, which covers the cross-tab race safely.

export async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request('erp-auth-refresh', { mode: 'exclusive' }, fn);
  }
  return fn();
}
