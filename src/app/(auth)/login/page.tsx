'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { setToken } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { Button, Card, Form, Input, Label, TextField, FieldError, Alert } from '@heroui/react';
import { Loader2 } from 'lucide-react';
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
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isUsernameEmpty = isSubmitted && !username.trim();
  const isPasswordEmpty = isSubmitted && !password.trim();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);
    setApiError('');

    if (!username.trim() || !password.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<AuthResponse>('/api/v1/auth/login', {
        username,
        password,
      });

      if (!response.data?.data?.accessToken || !response.data?.data?.refreshToken) {
        throw new Error('Invalid server response');
      }

      const { accessToken, refreshToken, username: userName, email, roles } = response.data.data;

      setToken(refreshToken);
      useAuthStore.getState().setAuth(accessToken, { username: userName, email, roles });

      router.push('/');
    } catch (err: unknown) {
      const error = err as ApiError;
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 401) {
        setApiError('Email/NIP atau kata sandi salah');
      } else if (status === 500) {
        setApiError('Server error, coba lagi nanti');
      } else if (status === 0 || !status) {
        setApiError('Koneksi gagal, periksa jaringan Anda');
      } else {
        setApiError(message || 'Login gagal, coba lagi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-transparent">
      <div className="w-full max-w-md flex flex-col gap-4">

        {/* Form-level Error di luar dan di atas Card */}
        {apiError && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{apiError}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}

        <Card className="w-full shadow-lg">
          <Card.Header>
            <Card.Title>Masuk</Card.Title>
            <Card.Description>Masukkan kredensial Anda untuk mengakses akun</Card.Description>
          </Card.Header>
          <Form onSubmit={handleSubmit}>
            <Card.Content>
              <div className="flex flex-col gap-4">
                <TextField
                  name="username"
                  isInvalid={isUsernameEmpty}
                >
                  <Label>Email atau NIP</Label>
                  <Input
                    type="text"
                    placeholder="Masukkan email atau NIP"
                    variant="secondary"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    autoComplete="username"
                  />
                  {isUsernameEmpty && (
                    <FieldError>Email/NIP tidak boleh kosong</FieldError>
                  )}
                </TextField>

                <TextField
                  name="password"
                  isInvalid={isPasswordEmpty}
                >
                  <Label>Kata Sandi</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    variant="secondary"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  {isPasswordEmpty && (
                    <FieldError>Kata sandi tidak boleh kosong</FieldError>
                  )}
                </TextField>
              </div>
            </Card.Content>
            <Card.Footer className="mt-4 flex flex-col gap-2">
              <Button className="w-full" type="submit" isDisabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memuat...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </Card.Footer>
          </Form>
        </Card>
      </div>
    </div>
  );
}
