'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@heroui/react';
import { useAuthStore } from '@/store/auth-store';
import { registerAuthStorageSync } from '@/lib/auth-storage-sync';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { accessToken, isInitializing, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Cross-tab session sync (storage event): logout propagation and safe
  // bootstrap recovery when another tab rotates the refresh token.
  useEffect(() => registerAuthStorageSync(), []);

  useEffect(() => {
    if (!isInitializing && !accessToken) {
      router.push('/login');
    }
  }, [isInitializing, accessToken, router]);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (!accessToken) {
    return null;
  }

  return <>{children}</>;
}
