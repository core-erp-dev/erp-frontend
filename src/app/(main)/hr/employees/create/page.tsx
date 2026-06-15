'use client';

import { useRouter } from 'next/navigation';
import { toast } from '@heroui/react';
import { EmployeeForm } from '@/modules/hr/employees/components/employee-form';

export default function CreateEmployeePage() {
  const router = useRouter();

  return (
    <EmployeeForm
      mode="create"
      onSuccess={() => {
        toast.success('Karyawan berhasil ditambahkan');
        router.push('/hr/employees');
      }}
    />
  );
}
