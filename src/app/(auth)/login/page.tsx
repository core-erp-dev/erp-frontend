'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { setToken } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { AuthResponse } from '@/types/auth';

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan password harus diisi');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Login] Sending request for user:', username);

      const response = await api.post<AuthResponse>('/api/v1/auth/login', {
        username,
        password,
      });

      console.log('[Login] Response received:', response.data);

      // Validate response shape
      if (!response.data?.data?.accessToken || !response.data?.data?.refreshToken) {
        console.error('[Login] Invalid response shape:', response.data);
        throw new Error('Invalid server response');
      }

      const { accessToken, refreshToken, username: userName, email, role } = response.data.data;

      console.log('[Login] === TOKEN DEBUG ===');
      console.log('[Login] Access token:', accessToken);
      console.log('[Login] Access token length:', accessToken?.length);
      console.log('[Login] Refresh token:', refreshToken);
      console.log('[Login] Refresh token length:', refreshToken?.length);
      console.log('[Login] =====================');

      console.log('[Login] Success, storing tokens');

      setToken(refreshToken);
      useAuthStore.getState().setAuth(accessToken, { username: userName, email, role });

      console.log('[Login] Redirecting to /');
      router.push('/');
    } catch (err: unknown) {
      console.error('[Login] Error:', err);

      const apiError = err as ApiError;
      const status = apiError.response?.status;
      const message = apiError.response?.data?.message;

      if (status === 401) {
        setError('Username atau password salah');
      } else if (status === 500) {
        setError('Server error, coba lagi nanti');
      } else if (status === 0 || !status) {
        setError('Koneksi gagal, periksa jaringan Anda');
      } else {
        setError(message || 'Login gagal, coba lagi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}