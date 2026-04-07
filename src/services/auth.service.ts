import { api } from '@/lib/api';
import type { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth';

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await api.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', data);
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    localStorage.setItem('user', JSON.stringify({
      username: res.data.username,
      email: res.data.email,
      role: res.data.role,
    }));
    return res.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await api.post<ApiResponse<AuthResponse>>('/api/v1/auth/register', data);
    return res.data;
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  },

  getUser(): { username: string; email: string; role: string } | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  hasRole(...roles: string[]): boolean {
    const user = this.getUser();
    if (!user) return false;
    return roles.some(r => user.role.toUpperCase().includes(r.toUpperCase()));
  },
};
