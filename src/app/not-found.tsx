'use client';

import { useRouter } from 'next/navigation';
import { FileX } from '@phosphor-icons/react';
import { Button } from '@heroui/react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <FileX className="h-8 w-8 text-gray-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Page Not Found</h2>
      <p className="text-gray-500">The page you are looking for is not available.</p>
      <Button variant="secondary" onPress={() => router.push('/')} className="mt-2">
        Back to Home
      </Button>
    </div>
  );
}
