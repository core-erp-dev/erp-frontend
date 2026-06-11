import axios from 'axios';
import { env } from './env';
import { getToken, setToken } from './auth';
import { useAuthStore } from '@/store/auth-store';

let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = async (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = executeRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const executeRefresh = async (): Promise<string> => {
  const refreshToken = getToken();

  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await axios.post(
    `${env.baseUrl}/api/v1/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (!response.data?.data?.accessToken) {
    throw new Error('Invalid refresh response: missing accessToken');
  }

  const { accessToken, refreshToken: newRefreshToken, username, email, roles } = response.data.data;

  if (newRefreshToken) {
    setToken(newRefreshToken);
  }

  useAuthStore.getState().setAuth(accessToken, { username, email, roles });

  return accessToken;
};
