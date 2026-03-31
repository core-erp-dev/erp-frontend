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

  console.log('[TokenService] Refresh token being sent:', refreshToken);
  console.log('[TokenService] Refresh token length:', refreshToken.length);
  console.log('[TokenService] Refresh token prefix:', refreshToken.substring(0, 20));

  const response = await axios.post(
    `${env.baseUrl}/api/v1/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );

  console.log('[TokenService] Refresh response status:', response.status);
  console.log('[TokenService] Refresh response data:', JSON.stringify(response.data));

  if (!response.data?.data?.accessToken) {
    throw new Error('Invalid refresh response: missing accessToken');
  }

  const { accessToken, refreshToken: newRefreshToken, username, email, role } = response.data.data;

  // Save new refresh token to localStorage
  if (newRefreshToken) {
    console.log('[TokenService] Saving new refresh token to localStorage');
    setToken(newRefreshToken);
  }

  useAuthStore.getState().setAuth(accessToken, { username, email, role });

  return accessToken;
};
