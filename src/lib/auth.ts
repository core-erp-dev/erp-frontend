// Abstraction layer for future HttpOnly cookie migration
// Currently uses localStorage, can be swapped to HttpOnly cookies later

const REFRESH_TOKEN_KEY = 'refreshToken';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  console.log('[Auth] getToken called, returning:', token ? `${token.substring(0, 20)}... (length: ${token.length})` : 'null');
  return token;
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  console.log('[Auth] setToken called with:', token ? `${token.substring(0, 20)}... (length: ${token.length})` : 'empty/null');
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  console.log('[Auth] removeToken called');
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export function logout(): void {
  const { useAuthStore } = require('@/store/auth-store');
  useAuthStore.getState().clearAuth();
  removeToken();
  window.location.href = '/login';
}