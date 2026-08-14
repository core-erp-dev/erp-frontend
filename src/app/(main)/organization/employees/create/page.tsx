'use client';

import { useRouter } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { EmployeeForm } from '@/modules/organization/employees/components/employee-form';

export default function CreateEmployeePage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  if (!hasPerm(PERM.USER_MANAGE)) {
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
    <div className="mx-auto w-full max-w-4xl">
      <EmployeeForm
        mode="create"
        onSuccess={(createdId) => {
          // Create has no prior Detail page in history: replace the form with
          // the new employee's Detail page (never push → no Daftar→Detail→Edit
          // style stacks, and Back from Detail goes back to the list).
          if (createdId) {
            router.replace(`/organization/employees/${createdId}`);
          } else {
            router.replace('/organization/employees');
          }
        }}
      />
    </div>
  );
}
