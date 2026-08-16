import { useAuthStore } from '@/store/auth-store';

const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Registers cross-tab session sync via the browser `storage` event (fires in
 * OTHER tabs of the same origin whenever this tab writes/removes the refresh
 * token):
 *
 * - token REMOVED → another tab logged out explicitly → clear this tab's
 *   in-memory auth state (the guard then redirects to /login);
 * - token REPLACED → another tab rotated it → only act if THIS tab has no
 *   valid in-memory session (bootstrap limbo); tabs with a valid access token
 *   ignore the event, so rotations never cascade into refresh loops.
 *
 * Returns an unsubscribe function; call it on unmount.
 */
export function registerAuthStorageSync(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== REFRESH_TOKEN_KEY) return;

    if (event.newValue === null) {
      useAuthStore.getState().clearAuth();
      return;
    }

    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      void useAuthStore.getState().initAuth();
    }
  };

  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
