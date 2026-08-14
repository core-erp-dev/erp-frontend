'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/axios';
import { setToken } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import {
  Alert,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { CircleNotch, Eye, EyeSlash } from '@phosphor-icons/react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isUsernameEmpty = isSubmitted && !username.trim();
  const isPasswordEmpty = isSubmitted && !password.trim();

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setIsSubmitted(true);
    setApiError('');

    if (!username.trim() || !password.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<AuthResponse>('/api/v1/auth/login', {
        login: username,
        password,
      });

      if (
        !response.data?.data?.accessToken ||
        !response.data?.data?.refreshToken
      ) {
        throw new Error('Respons server tidak valid');
      }

      const {
        accessToken,
        refreshToken,
        username: userName,
        email,
        roles,
        permissions,
      } = response.data.data;

      setToken(refreshToken);

      useAuthStore.getState().setAuth(accessToken, {
        username: userName,
        email,
        roles,
        permissions: permissions ?? [],
      });

      router.push('/');
    } catch (error: unknown) {
      const apiRequestError = error as ApiError;
      const status = apiRequestError.response?.status;
      const message = apiRequestError.response?.data?.message;

      if (status === 401) {
        setApiError('Email/NIP atau password salah');
      } else if (status === 500) {
        setApiError('Terjadi kesalahan server, coba lagi nanti');
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
    <div className="flex min-h-screen bg-[#006FEE]">
      {/* Left column — desktop only */}
      <div className="relative hidden flex-col justify-center overflow-hidden px-12 md:flex md:w-1/2 xl:w-[55%] xl:px-20">
        <div
          className="pointer-events-none absolute -bottom-[750px] -left-[750px] h-[1500px] w-[1500px] rounded-full"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
        />

        <div className="relative z-10 flex max-w-lg flex-col gap-4">
          <Image
            src="/logo/text-logo-white.svg"
            alt="STI one"
            width={210}
            height={60}
            priority
          />

          <p className="text-base leading-relaxed text-white/80 xl:text-lg">
            Platform terpusat untuk mengelola KPI, aktivitas, laporan, dan
            kinerja organisasi.
          </p>
        </div>
      </div>

      {/* Right column — login card */}
      <div className="flex w-full items-center justify-center p-6 sm:p-8 md:w-1/2 xl:w-[45%]">
        <div className="flex w-full max-w-md flex-col gap-4">
          {apiError && (
            <Alert status="danger">
              <Alert.Indicator />

              <Alert.Content>
                <Alert.Title>{apiError}</Alert.Title>
              </Alert.Content>
            </Alert>
          )}

          <Card className="w-full shadow-xl">
            {/* Mobile-only logo */}
            <div className="flex flex-col items-center px-6 pt-2 pb-0 md:hidden">
              <Image
                src="/logo/text-logo.svg"
                alt="STI one"
                width={105}
                height={30}
                priority
              />
            </div>

            <Card.Header className="md:pt-6">
              <Card.Title>Masuk</Card.Title>

              <Card.Description>
                Masukkan kredensial Anda untuk mengakses akun
              </Card.Description>
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
                      onChange={(event) => setUsername(event.target.value)}
                      disabled={isLoading}
                      autoComplete="username"
                    />

                    {isUsernameEmpty && (
                      <FieldError>Email/NIP wajib diisi</FieldError>
                    )}
                  </TextField>

                  <TextField
                    name="password"
                    isInvalid={isPasswordEmpty}
                  >
                    <Label>Password</Label>

                    <div className="relative">
                      <Input
                        fullWidth
                        className="pe-11"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Masukkan password anda"
                        variant="secondary"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={isLoading}
                        autoComplete="current-password"
                      />

                      <Button
                        type="button"
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="absolute end-1 top-1/2 -translate-y-1/2"
                        aria-label={
                          showPassword
                            ? 'Sembunyikan password'
                            : 'Tampilkan password'
                        }
                        aria-pressed={showPassword}
                        isDisabled={isLoading}
                        onPress={() =>
                          setShowPassword((previous) => !previous)
                        }
                      >
                        {showPassword ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeSlash className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {isPasswordEmpty && (
                      <FieldError>Password wajib diisi</FieldError>
                    )}
                  </TextField>
                </div>
              </Card.Content>

              <Card.Footer className="mt-4 flex flex-col gap-2">
                <Button
                  className="w-full"
                  type="submit"
                  isDisabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
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
    </div>
  );
}
