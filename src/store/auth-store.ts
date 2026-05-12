import { create } from 'zustand';
import { User } from '@/types/auth';
import { logout, getToken } from '@/lib/auth';
import { refreshAccessToken } from '@/lib/token-service';

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

    if (!refreshToken) {
      set({ isInitializing: false });
      return;
    }

    try {
      await refreshAccessToken();
      set({ isInitializing: false });
    } catch {
      logout();
    }
  },
}));
