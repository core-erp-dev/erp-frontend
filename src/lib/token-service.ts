import axios from 'axios';
import { env } from './env';
import { getToken, setToken, removeTokenIfMatch } from './auth';
import { useAuthStore } from '@/store/auth-store';
import { withRefreshLock } from './refresh-lock';

/**
 * Thrown when the refresh endpoint explicitly rejects the session (HTTP 401).
 * `failedToken` is the exact token value that was rejected, so callers can
 * compare-and-remove it without ever deleting a newer token written by
 * another tab. Network/5xx failures are NOT wrapped in this error — they do
 * not mean the session is invalid, so they must never clear stored tokens.
 */
export class RefreshFailedError extends Error {
  readonly failedToken: string | null;

  constructor(failedToken: string | null, message: string) {
    super(message);
    this.name = 'RefreshFailedError';
    this.failedToken = failedToken;
  }
}

let refreshPromise: Promise<string> | null = null;

/**
 * Single source of truth for restoring an authenticated session.
 *
 * - Single-flight within the tab: concurrent callers share one HTTP refresh.
 * - Cross-tab serialization: Web Locks (with safe fallback), and the token is
 *   always re-read from localStorage INSIDE the lock so a waiting tab never
 *   uses a snapshot that another tab already rotated.
 * - On 401: re-read the stored token; if another tab replaced it, retry at
 *   most once with the freshest token; otherwise compare-and-remove the
 *   rejected token and throw {@link RefreshFailedError}.
 *
 * @returns the new access token once the auth store is restored.
 */
export function refreshSession(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = withRefreshLock(executeRefreshWithRecovery).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function executeRefreshWithRecovery(): Promise<string> {
  const firstToken = getToken();

  if (!firstToken) {
    throw new RefreshFailedError(null, 'No refresh token available');
  }

  try {
    return await postRefresh(firstToken);
  } catch (error) {
    if (!isUnauthorized(error)) {
      // Network error / 5xx: the session may still be valid. Never wipe
      // stored tokens or force logout for a transient failure.
      throw error;
    }

    // The token we sent was rejected. Another tab may have already rotated
    // it (and written the successor to localStorage) — re-read and retry
    // exactly once with the freshest token.
    const currentToken = getToken();
    if (currentToken && currentToken !== firstToken) {
      try {
        return await postRefresh(currentToken);
      } catch (retryError) {
        if (isUnauthorized(retryError)) {
          removeTokenIfMatch(currentToken);
          throw new RefreshFailedError(currentToken, 'Refresh rejected after retry');
        }
        throw retryError;
      }
    }

    // Same token is still stored (or gone): this context's session is truly
    // invalid. Compare-and-remove so a newer token written by another tab is
    // never deleted.
    removeTokenIfMatch(firstToken);
    throw new RefreshFailedError(firstToken, 'Refresh token rejected');
  }
}

async function postRefresh(refreshToken: string): Promise<string> {
  const response = await axios.post(
    `${env.baseUrl}/api/v1/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (!response.data?.data?.accessToken) {
    throw new Error('Invalid refresh response: missing accessToken');
  }

  const {
    accessToken,
    refreshToken: newRefreshToken,
    username,
    email,
    roles,
    permissions,
  } = response.data.data;

  // Persist the rotated refresh token BEFORE releasing the cross-tab lock,
  // so a waiting tab always observes the successor token.
  if (newRefreshToken) {
    setToken(newRefreshToken);
  }

  useAuthStore.getState().setAuth(accessToken, {
    username,
    email,
    roles,
    permissions: permissions ?? [],
  });

  return accessToken;
}

function isUnauthorized(error: unknown): boolean {
  const e = error as { response?: { status?: number } };
  return e?.response?.status === 401;
}
