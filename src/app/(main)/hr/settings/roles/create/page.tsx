'use client';

import { useRouter } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { RoleForm } from '@/modules/hr/settings/components/role-form';

export default function CreateRolePage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  if (!hasPerm(PERM.ROLE_CREATE)) {
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

  return (
    <RoleForm
      mode="create"
      onSuccess={() => {
        router.push('/hr/settings/roles');
      }}
    />
  );
}