'use client';

import { useParams, useRouter } from 'next/navigation';
import { Spinner, Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useEmployeeDetail } from '@/modules/hr/organization/employees/hooks/use-employee-detail';
import { EmployeeForm } from '@/modules/hr/organization/employees/components/employee-form';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { employee, isLoading, error } = useEmployeeDetail(id);

  if (!hasPerm(PERM.USER_UPDATE)) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Access Denied</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Employee not found'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <EmployeeForm
      mode="edit"
      initialData={employee}
      onSuccess={() => {
        router.push(`/hr/organization/employees/${id}`);
      }}
    />
  );
}
