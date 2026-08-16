import { create } from 'zustand';
import { User } from '@/types/auth';
import { getToken, handleSessionFailure } from '@/lib/auth';
import { refreshSession, RefreshFailedError } from '@/lib/token-service';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isInitializing: boolean;
  setAuth: (accessToken: string, user: User) => void;
  clearAuth: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitializing: true,

  setAuth: (accessToken, user) => {
    set({ accessToken, user });
  },

  clearAuth: () => {
    set({ accessToken: null, user: null, isInitializing: false });
  },

  initAuth: async () => {
    // Already authenticated in this tab (e.g. the login page just stored the
    // login response): bootstrap is complete, no refresh round-trip needed.
    if (useAuthStore.getState().accessToken) {
      set({ isInitializing: false });
      return;
    }

    const refreshToken = getToken();

    if (!refreshToken) {
      set({ isInitializing: false });
      return;
    }

    try {
      await refreshSession();
      set({ isInitializing: false });
    } catch (error) {
      if (error instanceof RefreshFailedError) {
        // 401: session invalid for this context — clear memory + compare-and-remove.
        handleSessionFailure(error.failedToken);
      }
      // Transient failure (network/5xx): keep the stored token so the next
      // load can recover; just finish bootstrap (AuthGuard redirects to login).
      set({ isInitializing: false });
    }
  },
}));
