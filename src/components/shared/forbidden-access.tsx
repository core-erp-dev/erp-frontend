'use client';

import { useRouter } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';

/**
 * Shared Forbidden view used by every employee route guard. Identical design to
 * the guards that already existed on the create/edit pages (Alert danger
 * "Akses Ditolak" + a Kembali button).
 */
export function ForbiddenAccess() {
  const router = useRouter();
  return (
    <div className="flex w-full flex-col gap-6">
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Akses Ditolak</Alert.Title>
        </Alert.Content>
      </Alert>
      <Button variant="secondary" onPress={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Button>
    </div>
  );
}
