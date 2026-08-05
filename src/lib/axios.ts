import axios from 'axios';
import { env } from './env';
import { logout } from './auth';
import { useAuthStore } from '@/store/auth-store';
import { refreshAccessToken } from '@/lib/token-service';

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
        await refreshAccessToken();
        return api(originalRequest);
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
