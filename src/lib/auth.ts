// Abstraction Layer for token storage.
// Currently uses localStorage; can be swapped to HttpOnly cookies later.

import { useAuthStore } from '@/store/auth-store';

const REFRESH_TOKEN_KEY = 'refreshToken';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Removes the refresh token ONLY if it still equals `expected`.
 *
 * Compare-and-remove: when a refresh fails with 401 because the token was
 * already rotated by another tab, the successor token written by that tab
 * must never be deleted. This is the only token-removal path used for
 * session failures.
 */
export const removeTokenIfMatch = (expected: string): void => {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(REFRESH_TOKEN_KEY) === expected) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

/**
 * Explicit logout (user action): clears the whole session in this browser.
 * Other tabs of the same origin observe the localStorage removal via the
 * `storage` event and clear their own auth state.
 */
export function logout(): void {
  useAuthStore.getState().clearAuth();
  removeToken();
}

/**
 * Terminal session failure (refresh rejected with 401): clears the in-memory
 * auth state and removes ONLY the token that actually failed — never a newer
 * token another tab may have stored in the meantime.
 */
export function handleSessionFailure(failedToken: string | null): void {
  useAuthStore.getState().clearAuth();
  if (failedToken) {
    removeTokenIfMatch(failedToken);
  }
}
