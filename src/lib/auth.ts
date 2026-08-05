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

export function logout(): void {
  useAuthStore.getState().clearAuth();
  removeToken();
}
