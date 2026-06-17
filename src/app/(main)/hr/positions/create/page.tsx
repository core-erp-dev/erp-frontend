'use client';

import { useRouter } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth-store';
import { PositionForm } from '@/modules/hr/positions/components/position-form';

export default function CreatePositionPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

  if (!hasPerm('position:create')) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Akses Ditolak</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.push('/hr/positions')}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <PositionForm
      mode="create"
      onSuccess={() => {
        router.push('/hr/positions');
      }}
    />
  );
}
