import axios from 'axios';
import { env } from './env';
import { handleSessionFailure } from './auth';
import { useAuthStore } from '@/store/auth-store';
import { refreshSession, RefreshFailedError } from '@/lib/token-service';

export const api = axios.create({
  baseURL: env.baseUrl,
  // NO default Content-Type — axios auto-detects:
  // - JSON body → application/json
  // - FormData body → multipart/form-data with boundary
});

api.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // If sending FormData, remove any hardcoded Content-Type
    // so the browser can set the correct multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // refreshSession is the single source of truth: single-flight per
        // tab, cross-tab lock, and one-token recovery on 401. The retry below
        // re-reads the store, so it always uses the freshest access token.
        await refreshSession();
        return api(originalRequest);
      } catch (refreshError) {
        if (refreshError instanceof RefreshFailedError) {
          // Final refresh failure (401): clear this context's session with
          // compare-and-remove — never wipe a token another tab stored.
          handleSessionFailure(refreshError.failedToken);
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
