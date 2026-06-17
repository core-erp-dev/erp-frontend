'use client';

import { useRouter } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth-store';
import { RolePermissionPanel } from '@/modules/hr/settings/components/role-permission-panel';

export default function RolesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

  if (!hasPerm('role:read')) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Akses Ditolak</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.push('/hr/settings')}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hak Akses & Role</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola role dan permission untuk mengatur akses pengguna ke sistem.
        </p>
      </div>
      <RolePermissionPanel />
    </div>
  );
}
