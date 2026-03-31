import { create } from 'zustand';
import { User } from '@/types/auth';
import { logout, getToken } from '@/lib/auth';
import { refreshAccessToken } from '@/lib/token-service';

const isDev = process.env.NODE_ENV === 'development';

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
    const refreshToken = getToken();

    console.log('[InitAuth] Checking token, exists:', !!refreshToken);
    if (refreshToken) {
      console.log('[InitAuth] Refresh token from localStorage:', refreshToken);
      console.log('[InitAuth] Refresh token length:', refreshToken.length);
    }

    if (!refreshToken) {
      console.log('[InitAuth] No token found, setting isInitializing=false');
      set({ isInitializing: false });
      return;
    }

    try {
      console.log('[InitAuth] Calling refresh API...');
      await refreshAccessToken();
      set({ isInitializing: false });
      console.log('[InitAuth] Refresh SUCCESS, user should stay logged in');
    } catch (err) {
      console.log('[InitAuth] Refresh FAILED:', err);
      logout();
    }
  },
}));