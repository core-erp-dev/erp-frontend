'use client';

import { useRouter } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth-store';
import { EmployeeForm } from '@/modules/hr/employees/components/employee-form';

export default function CreateEmployeePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

  if (!hasPerm('employee:create')) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Akses Ditolak</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.push('/hr/employees')}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <EmployeeForm
      mode="create"
      onSuccess={() => {
        router.push('/hr/employees');
      }}
    />
  );
}
