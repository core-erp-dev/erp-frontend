'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/axios';
import { setToken } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import {
  Button,
  Card,
  Form,
  Input,
  Label,
  TextField,
  FieldError,
  Alert,
} from '@heroui/react';
import { CircleNotch } from '@phosphor-icons/react';
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
        login: username,
        password,
      });

      if (!response.data?.data?.accessToken || !response.data?.data?.refreshToken) {
        throw new Error('Invalid server response');
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
      useAuthStore.getState().setAuth(accessToken, { username: userName, email, roles, permissions: permissions ?? [] });

      router.push('/');
    } catch (err: unknown) {
      const error = err as ApiError;
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 401) {
        setApiError('Invalid email/NIP or password');
      } else if (status === 500) {
        setApiError('Server error, please try again later');
      } else if (status === 0 || !status) {
        setApiError('Connection failed, check your network');
      } else {
        setApiError(message || 'Login failed, please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#006FEE]">
      {/* ==================== LEFT COLUMN (Desktop Only) ==================== */}
      <div className="hidden md:flex md:w-1/2 xl:w-[55%] flex-col justify-center px-12 xl:px-20 relative overflow-hidden">
        {/* Geometric accent circle */}
        <div
          className="absolute -bottom-[750px] -left-[750px] w-[1500px] h-[1500px] rounded-full pointer-events-none"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
        />

        <div className="relative z-10 flex flex-col gap-4 max-w-lg">
          <Image
            src="/logo/text-logo-white.svg"
            alt="STI one"
            width={210}
            height={60}
            priority
          />

          {/* Tagline */}
          <p className="text-base xl:text-lg text-white/80 leading-relaxed">
            Integrated ERP platform to manage operations, HR, and business performance.
          </p>
        </div>
      </div>

      {/* ==================== RIGHT COLUMN (Login Card) ==================== */}
      <div className="flex w-full md:w-1/2 xl:w-[45%] items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md flex flex-col gap-4">
          {/* API Error Alert */}
          {apiError && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{apiError}</Alert.Title>
              </Alert.Content>
            </Alert>
          )}

          <Card className="w-full shadow-xl">
            {/* Mobile-only header with logo + brand */}
            <div className="flex flex-col items-center pt-2 pb-0 px-6 md:hidden">
              <Image
                src="/logo/text-logo.svg"
                alt="STI one"
                width={105}
                height={30}
                priority
              />
            </div>

            <Card.Header className="md:pt-6">
              <Card.Title>Sign In</Card.Title>
              <Card.Description>
                Enter your credentials to access your account
              </Card.Description>
            </Card.Header>

            <Form onSubmit={handleSubmit}>
              <Card.Content>
                <div className="flex flex-col gap-4">
                  <TextField name="username" isInvalid={isUsernameEmpty}>
                    <Label>Email or NIP</Label>
                    <Input
                      type="text"
                      placeholder="Enter email or NIP"
                      variant="secondary"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                      autoComplete="username"
                    />
                    {isUsernameEmpty && (
                      <FieldError>Email/NIP is required</FieldError>
                    )}
                  </TextField>

                  <TextField name="password" isInvalid={isPasswordEmpty}>
                    <Label>Password</Label>
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
                      <FieldError>Password is required</FieldError>
                    )}
                  </TextField>
                </div>
              </Card.Content>

              <Card.Footer className="mt-4 flex flex-col gap-2">
                <Button className="w-full" type="submit" isDisabled={isLoading}>
                  {isLoading ? (
                    <>
                      <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Sign In'
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
