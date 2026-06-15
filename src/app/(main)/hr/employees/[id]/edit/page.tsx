'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from '@heroui/react';
import { Spinner } from '@heroui/react';
import { EmployeeForm } from '@/modules/hr/employees/components/employee-form';
import { employeeApi } from '@/modules/hr/employees/services/employee-api';
import type { CoreUser } from '@/modules/hr/employees/types';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [user, setUser] = useState<CoreUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await employeeApi.getUserById(id);
        setUser(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat data karyawan';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
        <span className="ml-3 text-sm text-gray-500">Memuat data karyawan...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error || 'Karyawan tidak ditemukan'}
        </div>
      </div>
    );
  }

  return (
    <EmployeeForm
      mode="edit"
      initialData={user}
      onSuccess={() => {
        toast.success('Data karyawan berhasil diperbarui');
        router.push('/hr/employees');
      }}
    />
  );
}
