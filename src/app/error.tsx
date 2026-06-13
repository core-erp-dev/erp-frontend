'use client';

import { useEffect } from 'react';
import { Button } from '@heroui/react';
import { WarningCircle } from '@phosphor-icons/react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error is available for debugging in development tools
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <WarningCircle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Terjadi Kesalahan</h2>
      <p className="text-gray-500">Terjadi kesalahan yang tidak terduga.</p>
      <Button onPress={reset} variant="secondary" className="mt-2">
        Coba Lagi
      </Button>
    </div>
  );
}
