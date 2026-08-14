'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Spinner, Alert } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { useEmployeeDetail } from '@/modules/organization/employees/hooks/use-employee-detail';
import { EmployeeForm } from '@/modules/organization/employees/components/employee-form';
import { resolveEditReturn } from '@/modules/organization/employees/utils/employee-navigation-utils';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();

  const { employee, isLoading, error } = useEmployeeDetail(id);

  if (!hasPerm(PERM.USER_MANAGE)) {
    return <ForbiddenAccess />;
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
            <Alert.Title>{error || 'Pegawai tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const goBackToDetail = () => {
    // Deterministic: only back when the Detail page explicitly pushed this
    // Edit page (?from=detail). Deep links fall back to the Detail page via
    // replace — never to Create or an arbitrary history entry.
    const decision = resolveEditReturn(searchParams.get('from'), id);
    if (decision === 'back') {
      router.back();
    } else {
      router.replace(decision.replace);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <EmployeeForm
        mode="edit"
        initialData={employee}
        onSuccess={() => {
          // Detail remounts on back and refetches the fresh data — no push to
          // Detail (avoids Daftar→Detail→Edit→Detail stacks).
          goBackToDetail();
        }}
      />
    </div>
  );
}
