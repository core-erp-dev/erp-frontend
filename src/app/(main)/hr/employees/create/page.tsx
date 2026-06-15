'use client';

import { useRouter } from 'next/navigation';
import { EmployeeForm } from '@/modules/hr/employees/components/employee-form';

export default function CreateEmployeePage() {
  const router = useRouter();

  return (
    <EmployeeForm
      mode="create"
      onSuccess={() => {
        router.push('/hr/employees');
      }}
    />
  );
}
